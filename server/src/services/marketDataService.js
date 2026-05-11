import { store } from '../db/store.js';

export class MarketDataService {
  list({ symbol } = {}) {
    return symbol ? store.marketData.filter((row) => row.symbol === symbol) : store.marketData;
  }

  snapshot() {
    return {
      asOf: new Date().toISOString(),
      freshness: this.freshness(),
      data: store.marketData
    };
  }

  freshness() {
    const delayed = store.marketData.filter((row) => row.freshnessStatus !== 'fresh').length;
    if (delayed === 0) return 'fresh';
    if (delayed < 3) return 'delayed';
    return 'degraded';
  }
}

export const marketDataService = new MarketDataService();

