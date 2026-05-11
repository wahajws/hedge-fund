import { BaseConnector } from './baseConnector.js';
import { env } from '../config/env.js';
import { randomUUID } from 'node:crypto';

export class FredConnector extends BaseConnector {
  constructor() {
    super({ provider: 'FRED', apiKey: env.fredApiKey });
  }

  async fetchSeries(seriesId) {
    if (!this.hasCredentials() || env.useMockProviders) {
      return this.mockSeries(seriesId);
    }
    const url = new URL('https://api.stlouisfed.org/fred/series/observations');
    url.searchParams.set('series_id', seriesId);
    url.searchParams.set('api_key', this.apiKey);
    url.searchParams.set('file_type', 'json');
    const response = await fetch(url);
    if (!response.ok) throw new Error(`FRED ${seriesId} failed with ${response.status}`);
    return response.json();
  }

  normalizeSeries(seriesId, payload) {
    const observations = payload.observations ?? [];
    return observations
      .filter((row) => row.value !== '.')
      .slice(-5)
      .map((row, index, rows) => {
        const value = Number(row.value);
        const previousValue = index > 0 ? Number(rows[index - 1].value) : null;
        return {
      id: randomUUID(),
      provider: this.provider,
      seriesId,
      name: this.seriesName(seriesId),
      date: row.date,
      value,
      previousValue,
      change: previousValue === null ? null : Number((value - previousValue).toFixed(4)),
      units: this.seriesUnit(seriesId),
      realtimeStart: row.realtime_start,
      realtimeEnd: row.realtime_end,
      freshnessStatus: this.freshness(row.date),
      sourceHealth: 'healthy',
      rawSourceId: `fred:${seriesId}:${row.date}`,
      raw: row
        };
      });
  }

  mockSeries(seriesId) {
    const values = {
      DGS10: 4.71,
      FEDFUNDS: 4.83,
      CPIAUCSL: 3.4,
      UNRATE: 4.1,
      GDP: 2.2,
      VIXCLS: 19.4,
      DTWEXBGS: 123.8
    };
    return {
      mock: true,
      observations: [
        {
          realtime_start: '2026-05-11',
          realtime_end: '2026-05-11',
          date: '2026-05-11',
          value: String(values[seriesId] ?? 1)
        }
      ]
    };
  }

  seriesName(seriesId) {
    return {
      DGS10: '10-Year Treasury Constant Maturity Rate',
      FEDFUNDS: 'Effective Federal Funds Rate',
      CPIAUCSL: 'Consumer Price Index for All Urban Consumers',
      UNRATE: 'Unemployment Rate',
      GDP: 'Gross Domestic Product',
      VIXCLS: 'CBOE Volatility Index',
      DTWEXBGS: 'Trade Weighted U.S. Dollar Index'
    }[seriesId] ?? seriesId;
  }

  seriesUnit(seriesId) {
    return {
      DGS10: 'percent',
      FEDFUNDS: 'percent',
      CPIAUCSL: 'index',
      UNRATE: 'percent',
      GDP: 'billions_usd',
      VIXCLS: 'index',
      DTWEXBGS: 'index'
    }[seriesId] ?? 'unknown';
  }
}

export const fredConnector = new FredConnector();
