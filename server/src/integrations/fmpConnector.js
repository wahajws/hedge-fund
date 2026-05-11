import { BaseConnector } from './baseConnector.js';
import { env } from '../config/env.js';
import { randomUUID } from 'node:crypto';

export class FmpConnector extends BaseConnector {
  constructor() {
    super({ provider: 'Financial Modeling Prep', apiKey: env.fmpApiKey });
  }

  async fetchEconomicCalendar() {
    if (!this.hasCredentials() || env.useMockProviders) {
      return this.mockCalendar();
    }
    const url = new URL('https://financialmodelingprep.com/stable/economic-calendar');
    url.searchParams.set('apikey', this.apiKey);
    const response = await fetch(url);
    if (!response.ok) throw new Error(`FMP calendar failed with ${response.status}`);
    return response.json();
  }

  normalizeCalendar(payload) {
    return payload.slice(0, 20).map((row) => ({
      id: randomUUID(),
      provider: this.provider,
      event: row.event,
      country: row.country,
      date: row.date,
      actual: this.toNumberOrNull(row.actual),
      previous: this.toNumberOrNull(row.previous),
      consensus: this.toNumberOrNull(row.consensus),
      surprise: this.surprise(row.actual, row.consensus),
      surprisePercent: this.surprisePercent(row.actual, row.consensus),
      importance: row.impact ?? row.importance,
      category: this.categoryFromText(row.event),
      freshnessStatus: this.freshness(row.date),
      rawSourceId: `fmp:calendar:${row.event}:${row.date}`,
      raw: row
    }));
  }

  async fetchNews() {
    if (!this.hasCredentials() || env.useMockProviders) {
      return this.mockNews();
    }
    const url = new URL('https://financialmodelingprep.com/stable/news/stock-latest');
    url.searchParams.set('apikey', this.apiKey);
    url.searchParams.set('limit', '50');
    const response = await fetch(url);
    if (!response.ok) throw new Error(`FMP news failed with ${response.status}`);
    return response.json();
  }

  normalizeNews(payload) {
    return payload.slice(0, 50).map((row) => ({
      id: randomUUID(),
      provider: this.provider,
      title: row.title,
      url: row.url ?? null,
      publishedAt: row.publishedDate ?? row.date ?? new Date().toISOString(),
      source: row.site ?? this.provider,
      summary: row.text ?? row.summary ?? null,
      clusterId: `cluster-${this.categoryFromText(`${row.title} ${row.text ?? ''}`)}`,
      category: this.categoryFromText(`${row.title} ${row.text ?? ''}`),
      symbols: row.symbol ? [row.symbol] : [],
      relevanceScore: 70,
      freshnessStatus: this.freshness(row.publishedDate ?? row.date),
      rawSourceId: `fmp:news:${row.url ?? row.title}`,
      raw: row
    }));
  }

  mockCalendar() {
    return [
      {
        event: 'US CPI YoY',
        country: 'US',
        date: new Date().toISOString(),
        actual: 3.4,
        previous: 3.2,
        consensus: 3.3,
        impact: 'high'
      },
      {
        event: 'Fed Chair Testimony',
        country: 'US',
        date: new Date(Date.now() + 3_600_000).toISOString(),
        actual: null,
        previous: null,
        consensus: null,
        impact: 'high'
      }
    ];
  }

  mockNews() {
    return [
      {
        title: 'Dollar strengthens as rate differentials widen',
        site: 'FMP Mock',
        publishedDate: new Date().toISOString(),
        url: 'mock://fmp/news/usd-rates',
        text: 'FX markets moved with renewed focus on US rate differentials.',
        symbol: 'USDJPY'
      },
      {
        title: 'Equity index futures decline after yields rise',
        site: 'FMP Mock',
        publishedDate: new Date().toISOString(),
        url: 'mock://fmp/news/equity-yields',
        text: 'SPY and QQQ proxies weakened as real rates moved higher.',
        symbol: 'QQQ'
      }
    ];
  }

  toNumberOrNull(value) {
    if (value === null || value === undefined || value === '') return null;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  surprise(actual, consensus) {
    const a = this.toNumberOrNull(actual);
    const c = this.toNumberOrNull(consensus);
    return a === null || c === null ? null : Number((a - c).toFixed(4));
  }

  surprisePercent(actual, consensus) {
    const a = this.toNumberOrNull(actual);
    const c = this.toNumberOrNull(consensus);
    if (a === null || c === null || c === 0) return null;
    return Number((((a - c) / Math.abs(c)) * 100).toFixed(2));
  }

  categoryFromText(text) {
    const lower = String(text).toLowerCase();
    if (lower.includes('cpi') || lower.includes('inflation')) return 'inflation';
    if (lower.includes('fed') || lower.includes('rate') || lower.includes('yield')) return 'rates';
    if (lower.includes('oil') || lower.includes('energy')) return 'commodities';
    if (lower.includes('fx') || lower.includes('dollar') || lower.includes('yen')) return 'fx';
    if (lower.includes('recession') || lower.includes('gdp')) return 'growth';
    return 'macro_event';
  }
}

export const fmpConnector = new FmpConnector();
