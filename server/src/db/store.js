import { randomUUID } from 'node:crypto';

const now = () => new Date().toISOString();

export const store = {
  marketData: [
    { id: randomUUID(), provider: 'Alpha Vantage', symbol: 'USDJPY', assetClass: 'FX', timestamp: now(), value: 162.18, unit: 'spot', freshnessStatus: 'fresh' },
    { id: randomUUID(), provider: 'FRED', symbol: 'US10Y', assetClass: 'Rates', timestamp: now(), value: 4.71, unit: 'percent', freshnessStatus: 'fresh' },
    { id: randomUUID(), provider: 'Alpha Vantage', symbol: 'GLD', assetClass: 'ETF', timestamp: now(), value: 191.4, unit: 'price', freshnessStatus: 'fresh' },
    { id: randomUUID(), provider: 'Alpha Vantage', symbol: 'WTI', assetClass: 'Commodity', timestamp: now(), value: 88.2, unit: 'price', freshnessStatus: 'fresh' },
    { id: randomUUID(), provider: 'Alpha Vantage', symbol: 'SPY', assetClass: 'ETF', timestamp: now(), value: 514.7, unit: 'price', freshnessStatus: 'fresh' },
    { id: randomUUID(), provider: 'Alpha Vantage', symbol: 'QQQ', assetClass: 'ETF', timestamp: now(), value: 442.3, unit: 'price', freshnessStatus: 'fresh' }
  ],
  macroIndicators: [
    { id: randomUUID(), provider: 'FRED', seriesId: 'CPIAUCSL', name: 'CPI All Urban Consumers', date: '2026-05-11', value: 3.4, units: 'pct_yoy', realtimeStart: '2026-05-11', realtimeEnd: '2026-05-11' },
    { id: randomUUID(), provider: 'FRED', seriesId: 'UNRATE', name: 'Unemployment Rate', date: '2026-05-11', value: 4.1, units: 'percent', realtimeStart: '2026-05-11', realtimeEnd: '2026-05-11' },
    { id: randomUUID(), provider: 'FRED', seriesId: 'DGS10', name: '10-Year Treasury Constant Maturity', date: '2026-05-11', value: 4.71, units: 'percent', realtimeStart: '2026-05-11', realtimeEnd: '2026-05-11' }
  ],
  newsArticles: [
    { id: randomUUID(), provider: 'FMP', title: 'US yields rise after hotter inflation print', source: 'Financial Modeling Prep', publishedAt: now(), clusterId: 'cluster-cpi', summary: 'Rates repriced higher after inflation surprised above consensus.' },
    { id: randomUUID(), provider: 'Alpha Vantage', title: 'Technology shares pressured by real-rate move', source: 'Alpha Vantage News', publishedAt: now(), clusterId: 'cluster-cpi', summary: 'Long-duration equity proxies sold off as yields rose.' }
  ],
  economicCalendar: [],
  marketSignals: [],
  sourceHealth: {},
  ingestionRuns: [],
  portfolioPositions: [
    { id: randomUUID(), portfolioId: 'GLOBAL-MACRO-01', symbol: 'USDJPY', direction: 'long', quantity: 1, assetClass: 'FX', notional: 12_000_000, currency: 'USD', asOf: now() },
    { id: randomUUID(), portfolioId: 'GLOBAL-MACRO-01', symbol: 'US10Y', direction: 'short', quantity: 1, assetClass: 'Rates Future', notional: 18_000_000, currency: 'USD', asOf: now() },
    { id: randomUUID(), portfolioId: 'GLOBAL-MACRO-01', symbol: 'GLD', direction: 'long', quantity: 1, assetClass: 'ETF', notional: 7_500_000, currency: 'USD', asOf: now() },
    { id: randomUUID(), portfolioId: 'GLOBAL-MACRO-01', symbol: 'WTI', direction: 'long', quantity: 1, assetClass: 'Commodity', notional: 8_000_000, currency: 'USD', asOf: now() },
    { id: randomUUID(), portfolioId: 'GLOBAL-MACRO-01', symbol: 'SPY', direction: 'short', quantity: 1, assetClass: 'ETF', notional: 10_500_000, currency: 'USD', asOf: now() },
    { id: randomUUID(), portfolioId: 'GLOBAL-MACRO-01', symbol: 'QQQ', direction: 'long', quantity: 1, assetClass: 'ETF', notional: 11_000_000, currency: 'USD', asOf: now() }
  ],
  riskSnapshots: [],
  workflows: [],
  workflowExecutions: [],
  workflowMemory: [],
  agentLogs: [],
  orchestrationLogs: [],
  executiveAlerts: [],
  demoRuns: [],
  approvals: [],
  auditTrail: [],
  generatedReports: [],
  systemHealthLogs: []
};
