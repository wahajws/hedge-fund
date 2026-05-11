import { BaseConnector } from './baseConnector.js';
import { env } from '../config/env.js';
import { randomUUID } from 'node:crypto';

export class AlphaVantageConnector extends BaseConnector {
  constructor() {
    super({ provider: 'Alpha Vantage', apiKey: env.alphaVantageApiKey });
  }

  async fetchQuote(symbol) {
    if (!this.hasCredentials() || env.useMockProviders) {
      return this.mockQuote(symbol);
    }
    if (symbol.length === 6 && ['USDJPY', 'EURUSD'].includes(symbol)) {
      const fromCurrency = symbol.slice(0, 3);
      const toCurrency = symbol.slice(3);
      const url = new URL('https://www.alphavantage.co/query');
      url.searchParams.set('function', 'CURRENCY_EXCHANGE_RATE');
      url.searchParams.set('from_currency', fromCurrency);
      url.searchParams.set('to_currency', toCurrency);
      url.searchParams.set('apikey', this.apiKey);
      const response = await fetch(url);
      if (!response.ok) throw new Error(`Alpha Vantage FX ${symbol} failed with ${response.status}`);
      return response.json();
    }
    const url = new URL('https://www.alphavantage.co/query');
    url.searchParams.set('function', 'GLOBAL_QUOTE');
    url.searchParams.set('symbol', symbol);
    url.searchParams.set('apikey', this.apiKey);
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Alpha Vantage ${symbol} failed with ${response.status}`);
    return response.json();
  }

  normalizeQuote(symbol, payload) {
    const fx = payload['Realtime Currency Exchange Rate'];
    if (fx) {
      const value = Number(fx['5. Exchange Rate']);
      return {
        id: randomUUID(),
        provider: this.provider,
        symbol,
        canonicalSymbol: symbol,
        assetClass: 'FX',
        value,
        previousValue: null,
        change: null,
        changePercent: null,
        timestamp: fx['6. Last Refreshed'] ?? new Date().toISOString(),
        currency: symbol.slice(3),
        unit: 'spot',
        freshnessStatus: 'fresh',
        sourceHealth: 'healthy',
        rawSourceId: `av:fx:${symbol}`,
        raw: fx
      };
    }

    const quote = payload['Global Quote'] ?? payload;
    const value = Number(quote['05. price'] ?? quote.price);
    const change = Number(quote['09. change'] ?? quote.change ?? 0);
    const changePercentRaw = quote['10. change percent'] ?? quote.changePercent ?? null;
    const changePercent = changePercentRaw === null ? null : Number(String(changePercentRaw).replace('%', ''));
    return {
      id: randomUUID(),
      provider: this.provider,
      symbol,
      canonicalSymbol: symbol,
      assetClass: this.assetClass(symbol),
      value,
      previousValue: value && change ? Number((value - change).toFixed(4)) : null,
      change: Number.isFinite(change) ? change : null,
      changePercent: Number.isFinite(changePercent) ? changePercent : null,
      timestamp: quote['07. latest trading day'] ?? new Date().toISOString(),
      currency: 'USD',
      unit: 'price',
      freshnessStatus: 'fresh',
      sourceHealth: 'healthy',
      rawSourceId: `av:quote:${symbol}`,
      raw: quote
    };
  }

  async fetchNewsSentiment({ tickers = 'SPY,QQQ,GLD,USO', topics = 'financial_markets,economy_monetary' } = {}) {
    if (!this.hasCredentials() || env.useMockProviders) {
      return this.mockNews();
    }
    const url = new URL('https://www.alphavantage.co/query');
    url.searchParams.set('function', 'NEWS_SENTIMENT');
    url.searchParams.set('tickers', tickers);
    url.searchParams.set('topics', topics);
    url.searchParams.set('sort', 'LATEST');
    url.searchParams.set('limit', '50');
    url.searchParams.set('apikey', this.apiKey);
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Alpha Vantage news failed with ${response.status}`);
    return response.json();
  }

  normalizeNews(payload) {
    const feed = payload.feed ?? payload.news ?? [];
    return feed.map((row) => ({
      id: randomUUID(),
      provider: this.provider,
      title: row.title,
      url: row.url ?? null,
      publishedAt: this.parseAlphaTime(row.time_published) ?? new Date().toISOString(),
      source: row.source ?? this.provider,
      summary: row.summary ?? null,
      clusterId: this.clusterFromText(row.title),
      category: this.categoryFromText(`${row.title} ${row.summary ?? ''}`),
      symbols: (row.ticker_sentiment ?? []).map((item) => item.ticker),
      relevanceScore: Math.round(Number(row.overall_sentiment_score ?? 0.5) * 50 + 50),
      freshnessStatus: 'fresh',
      rawSourceId: `av:news:${row.url ?? row.title}`,
      raw: row
    }));
  }

  mockQuote(symbol) {
    const values = {
      USDJPY: 162.18,
      EURUSD: 1.073,
      GLD: 191.4,
      WTI: 88.2,
      SPY: 514.7,
      QQQ: 442.3,
      USO: 81.4
    };
    const changes = {
      USDJPY: 0.84,
      EURUSD: -0.22,
      GLD: -1.12,
      WTI: 2.36,
      SPY: -0.68,
      QQQ: -1.24,
      USO: 2.1
    };
    return {
      mock: true,
      price: values[symbol] ?? 100,
      changePercent: changes[symbol] ?? 0,
      timestamp: new Date().toISOString()
    };
  }

  mockNews() {
    return {
      mock: true,
      feed: [
        {
          title: 'Treasury yields rise as inflation pressure persists',
          url: 'mock://alpha/news/rates-inflation',
          time_published: '20260511T041500',
          source: 'Alpha Vantage Mock',
          summary: 'Markets repriced rates after inflation data remained firm.',
          overall_sentiment_score: -0.18,
          ticker_sentiment: [{ ticker: 'SPY' }, { ticker: 'QQQ' }, { ticker: 'GLD' }]
        },
        {
          title: 'Oil advances on supply risk and geopolitical premium',
          url: 'mock://alpha/news/oil-supply',
          time_published: '20260511T041000',
          source: 'Alpha Vantage Mock',
          summary: 'Energy proxies moved higher as supply risk increased.',
          overall_sentiment_score: 0.12,
          ticker_sentiment: [{ ticker: 'USO' }]
        }
      ]
    };
  }

  assetClass(symbol) {
    if (['USDJPY', 'EURUSD'].includes(symbol)) return 'FX';
    if (['GLD', 'USO', 'SPY', 'QQQ'].includes(symbol)) return 'ETF';
    return 'Market';
  }

  categoryFromText(text) {
    const lower = String(text).toLowerCase();
    if (lower.includes('inflation') || lower.includes('cpi')) return 'inflation';
    if (lower.includes('yield') || lower.includes('fed') || lower.includes('rate')) return 'rates';
    if (lower.includes('oil') || lower.includes('commodity') || lower.includes('energy')) return 'commodities';
    if (lower.includes('fx') || lower.includes('yen') || lower.includes('dollar')) return 'fx';
    if (lower.includes('geopolitical') || lower.includes('war')) return 'geopolitics';
    if (lower.includes('recession') || lower.includes('growth')) return 'recession';
    return 'risk_sentiment';
  }

  clusterFromText(text) {
    return `cluster-${this.categoryFromText(text)}`;
  }

  parseAlphaTime(value) {
    if (!value || value.length < 8) return null;
    const year = value.slice(0, 4);
    const month = value.slice(4, 6);
    const day = value.slice(6, 8);
    const hour = value.slice(9, 11) || '00';
    const minute = value.slice(11, 13) || '00';
    return `${year}-${month}-${day}T${hour}:${minute}:00Z`;
  }
}

export const alphaVantageConnector = new AlphaVantageConnector();
