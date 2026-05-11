import { store } from '../db/store.js';

export class PortfolioService {
  getPortfolio(portfolioId = 'GLOBAL-MACRO-01') {
    const positions = store.portfolioPositions.filter((position) => position.portfolioId === portfolioId);
    const totalNotional = positions.reduce((sum, position) => sum + position.notional, 0);
    return {
      portfolioId,
      asOf: positions[0]?.asOf ?? new Date().toISOString(),
      totalNotional,
      positions
    };
  }
}

export const portfolioService = new PortfolioService();

