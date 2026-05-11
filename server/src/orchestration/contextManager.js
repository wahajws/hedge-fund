import { store } from '../db/store.js';
import { randomUUID } from 'node:crypto';
import { marketDataService } from '../services/marketDataService.js';
import { macroDataService } from '../services/macroDataService.js';
import { marketIntelligenceService } from '../services/marketIntelligenceService.js';
import { newsService } from '../services/newsService.js';
import { economicCalendarService } from '../services/economicCalendarService.js';
import { portfolioService } from '../services/portfolioService.js';
import { riskEngine } from '../services/riskEngine.js';
import { approvalService } from '../services/approvalService.js';

function latest(rows, count) {
  return [...rows].slice(-count);
}

export class ContextManager {
  buildBaseContext({ portfolioId = 'GLOBAL-MACRO-01', question = null } = {}) {
    const market = marketDataService.list();
    const macro = macroDataService.list();
    const news = newsService.list();
    const calendar = economicCalendarService.list();
    const signals = marketIntelligenceService.list();
    const portfolio = portfolioService.getPortfolio(portfolioId);
    const risk = riskEngine.latest(portfolioId);
    const approvals = approvalService.list();

    return this.compress({
      question,
      portfolioId,
      market,
      macro,
      news,
      calendar,
      signals,
      portfolio,
      risk,
      approvals,
      previousWorkflowResults: latest(store.agentLogs, 20),
      approvalHistory: latest(store.approvals, 20)
    });
  }

  compress(context) {
    return {
      question: context.question,
      portfolioId: context.portfolioId,
      market: latest(context.market, 20),
      macro: latest(context.macro, 20),
      news: latest(context.news, 30),
      calendar: latest(context.calendar, 20),
      signals: latest(context.signals, 20),
      portfolio: context.portfolio,
      risk: context.risk,
      approvals: latest(context.approvals, 20),
      previousWorkflowResults: context.previousWorkflowResults,
      approvalHistory: context.approvalHistory,
      lineage: this.lineage(context)
    };
  }

  lineage(context) {
    const rows = [
      ...context.market,
      ...context.macro,
      ...context.news,
      ...context.calendar,
      ...context.signals,
      ...(context.portfolio?.positions ?? [])
    ];
    return rows.map((row) => ({
      id: row.id ?? row.seriesId ?? row.symbol,
      provider: row.provider ?? 'internal',
      type: row.seriesId ? 'macro' : row.assetClass ? 'market_or_position' : row.event ? 'calendar' : row.title ? 'news' : row.type ? 'signal' : 'unknown',
      label: row.name ?? row.symbol ?? row.event ?? row.title ?? row.type
    }));
  }

  remember({ workflowId, key, value }) {
    const memory = {
      id: randomUUID(),
      workflowId,
      key,
      value,
      createdAt: new Date().toISOString()
    };
    store.workflowMemory.push(memory);
    return memory;
  }

  getMemory(workflowId) {
    return store.workflowMemory.filter((row) => row.workflowId === workflowId);
  }
}

export const contextManager = new ContextManager();
