import { randomUUID } from 'node:crypto';
import { store } from '../db/store.js';
import { fredConnector } from '../integrations/fredConnector.js';
import { alphaVantageConnector } from '../integrations/alphaVantageConnector.js';
import { fmpConnector } from '../integrations/fmpConnector.js';
import { auditService } from './auditService.js';
import { publishEvent } from '../shared/events.js';
import { sourceHealthService } from './sourceHealthService.js';
import { cacheService } from './cacheService.js';
import {
  EconomicCalendarEventSchema,
  MacroIndicatorSchema,
  MarketPriceSchema,
  NewsArticleSchema,
  validateOrThrow
} from '../shared/normalizedSchemas.js';

function upsertBy(rows, row, matcher) {
  const index = rows.findIndex((current) => matcher(current, row));
  if (index >= 0) rows[index] = { ...rows[index], ...row };
  else rows.push(row);
}

async function timed(provider, operation) {
  if (!sourceHealthService.canRequest(provider)) {
    throw new Error(`${provider} circuit breaker is open`);
  }
  const startedAt = Date.now();
  try {
    const result = await operation();
    sourceHealthService.success(provider, { latencyMs: Date.now() - startedAt });
    return result;
  } catch (error) {
    sourceHealthService.failure(provider, error);
    throw error;
  }
}

export class IngestionService {
  async run({ actor, sources = ['fred', 'alpha_vantage', 'fmp'] }) {
    const results = [];
    if (sources.includes('fred')) {
      for (const seriesId of ['DGS10', 'FEDFUNDS', 'CPIAUCSL', 'UNRATE', 'GDP', 'VIXCLS', 'DTWEXBGS']) {
        try {
          const payload = await timed('FRED', () => fredConnector.fetchSeries(seriesId));
          const normalized = fredConnector.normalizeSeries(seriesId, payload)
            .map((row) => validateOrThrow(MacroIndicatorSchema, row, `FRED ${seriesId}`));
          for (const row of normalized) {
            upsertBy(store.macroIndicators, row, (a, b) => a.provider === b.provider && a.seriesId === b.seriesId && a.date === b.date);
          }
          results.push({ source: 'fred', seriesId, mock: Boolean(payload.mock), rows: normalized.length });
        } catch (error) {
          sourceHealthService.failure('FRED', error);
          results.push({ source: 'fred', seriesId, mock: false, rows: 0, status: 'failed', error: error.message });
        }
      }
    }
    if (sources.includes('alpha_vantage')) {
      for (const symbol of ['USDJPY', 'EURUSD', 'SPY', 'QQQ', 'GLD', 'USO']) {
        try {
          const payload = await timed('Alpha Vantage', () => alphaVantageConnector.fetchQuote(symbol));
          const normalized = validateOrThrow(MarketPriceSchema, alphaVantageConnector.normalizeQuote(symbol, payload), `Alpha Vantage ${symbol}`);
          upsertBy(store.marketData, normalized, (a, b) => a.provider === b.provider && a.symbol === b.symbol);
          results.push({ source: 'alpha_vantage', symbol, mock: Boolean(payload.mock), rows: 1 });
        } catch (error) {
          sourceHealthService.failure('Alpha Vantage', error);
          results.push({ source: 'alpha_vantage', symbol, mock: false, rows: 0, status: 'failed', error: error.message });
        }
      }
      try {
        const newsPayload = await timed('Alpha Vantage', () => alphaVantageConnector.fetchNewsSentiment());
        const news = alphaVantageConnector.normalizeNews(newsPayload)
          .map((row) => validateOrThrow(NewsArticleSchema, row, 'Alpha Vantage news'));
        for (const row of news) {
          upsertBy(store.newsArticles, row, (a, b) => a.rawSourceId === b.rawSourceId);
        }
        results.push({ source: 'alpha_vantage_news', mock: Boolean(newsPayload.mock), rows: news.length });
      } catch (error) {
        sourceHealthService.failure('Alpha Vantage', error);
        results.push({ source: 'alpha_vantage_news', mock: false, rows: 0, status: 'failed', error: error.message });
      }
    }
    if (sources.includes('fmp')) {
      try {
        const payload = await timed('Financial Modeling Prep', () => fmpConnector.fetchEconomicCalendar());
        const calendar = fmpConnector.normalizeCalendar(payload)
          .map((row) => validateOrThrow(EconomicCalendarEventSchema, row, 'FMP calendar'));
        for (const row of calendar) {
          upsertBy(store.economicCalendar, row, (a, b) => a.rawSourceId === b.rawSourceId);
        }
        results.push({ source: 'fmp_calendar', mock: payload.some?.((row) => row.event === 'US CPI YoY') ?? false, rows: calendar.length });
      } catch (error) {
        sourceHealthService.failure('Financial Modeling Prep', error);
        results.push({ source: 'fmp_calendar', mock: false, rows: 0, status: 'failed', error: error.message });
      }

      try {
        const newsPayload = await timed('Financial Modeling Prep', () => fmpConnector.fetchNews());
        const news = fmpConnector.normalizeNews(newsPayload)
          .map((row) => validateOrThrow(NewsArticleSchema, row, 'FMP news'));
        for (const row of news) {
          upsertBy(store.newsArticles, row, (a, b) => a.rawSourceId === b.rawSourceId);
        }
        results.push({ source: 'fmp_news', mock: newsPayload.some?.((row) => row.site === 'FMP Mock') ?? false, rows: news.length });
      } catch (error) {
        sourceHealthService.failure('Financial Modeling Prep', error);
        results.push({ source: 'fmp_news', mock: false, rows: 0, status: 'failed', error: error.message });
      }
    }

    const run = {
      id: randomUUID(),
      status: 'completed',
      results,
      completedAt: new Date().toISOString()
    };
    store.ingestionRuns.push(run);
    await cacheService.set('market:snapshot', store.marketData, 60);
    await cacheService.set('macro:latest', store.macroIndicators, 300);
    await cacheService.set('news:latest', store.newsArticles, 120);
    await cacheService.set('calendar:latest', store.economicCalendar, 300);
    publishEvent('market_data.updated', run);
    auditService.record({ eventType: 'ingestion.completed', actor, objectType: 'ingestion_run', objectId: run.id, payload: run });
    return run;
  }

  status() {
    return {
      asOf: new Date().toISOString(),
      providers: [
        { provider: 'FRED', status: sourceHealthService.ensure('FRED').status, mode: fredConnector.hasCredentials() ? 'real' : 'mock', records: store.macroIndicators.length },
        { provider: 'Alpha Vantage', status: sourceHealthService.ensure('Alpha Vantage').status, mode: alphaVantageConnector.hasCredentials() ? 'real' : 'mock', records: store.marketData.length + store.newsArticles.filter((row) => row.provider === 'Alpha Vantage').length },
        { provider: 'Financial Modeling Prep', status: sourceHealthService.ensure('Financial Modeling Prep').status, mode: fmpConnector.hasCredentials() ? 'real' : 'mock', records: store.economicCalendar.length + store.newsArticles.filter((row) => row.provider === 'Financial Modeling Prep').length }
      ],
      health: sourceHealthService.list(),
      recentRuns: store.ingestionRuns.slice(-10).reverse()
    };
  }
}

export const ingestionService = new IngestionService();
