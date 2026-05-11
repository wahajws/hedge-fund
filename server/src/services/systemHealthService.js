import { store } from '../db/store.js';
import { randomUUID } from 'node:crypto';
import { sourceHealthService } from './sourceHealthService.js';
import { cacheService } from './cacheService.js';

export class SystemHealthService {
  snapshot() {
    const services = [
      { service: 'api-gateway', status: 'healthy', latencyMs: 31 },
      { service: 'qwen-gateway', status: process.env.QWEN_API_KEY ? 'healthy' : 'mock_mode', latencyMs: 0 },
      { service: 'workflow-orchestrator', status: 'healthy', latencyMs: 44 },
      { service: 'audit-service', status: 'healthy', latencyMs: 12 },
      { service: 'market-data', status: 'healthy', latencyMs: 78 },
      { service: 'risk-engine', status: 'healthy', latencyMs: 19 }
    ];
    const snapshot = {
      asOf: new Date().toISOString(),
      services,
      queues: {
        workflow: 0,
        qwen: 0,
        approvals: store.approvals.filter((approval) => approval.status === 'pending').length,
        audit: 0,
        deadLetter: store.orchestrationLogs.filter((log) => log.status === 'failed').length
      },
      counts: {
        marketData: store.marketData.length,
        macroIndicators: store.macroIndicators.length,
        newsArticles: store.newsArticles.length,
        economicCalendar: store.economicCalendar.length,
        marketSignals: store.marketSignals.length,
        workflows: store.workflows.length,
        auditEvents: store.auditTrail.length
      },
      cache: {
        mode: cacheService.mode
      },
      sourceHealth: sourceHealthService.list()
    };
    store.systemHealthLogs.push({ ...snapshot, id: randomUUID() });
    return snapshot;
  }
}

export const systemHealthService = new SystemHealthService();
