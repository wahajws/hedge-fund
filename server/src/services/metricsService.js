import { store } from '../db/store.js';
import { sourceHealthService } from './sourceHealthService.js';
import { cacheService } from './cacheService.js';

function avg(values) {
  const filtered = values.filter((value) => Number.isFinite(value));
  if (!filtered.length) return 0;
  return Number((filtered.reduce((sum, value) => sum + value, 0) / filtered.length).toFixed(2));
}

function secondsBetween(start, end) {
  if (!start || !end) return null;
  return Math.max(0, (new Date(end).getTime() - new Date(start).getTime()) / 1000);
}

export class MetricsService {
  workflowMetrics() {
    const durations = store.workflows.map((workflow) => secondsBetween(workflow.startedAt, workflow.completedAt)).filter((value) => value !== null);
    return {
      total: store.workflows.length,
      waitingForHuman: store.workflows.filter((workflow) => workflow.status === 'waiting_for_human').length,
      failed: store.workflows.filter((workflow) => workflow.status === 'failed').length,
      averageCompletionSeconds: avg(durations),
      byType: Object.groupBy ? Object.groupBy(store.workflows, (workflow) => workflow.type) : {}
    };
  }

  approvalMetrics() {
    const pending = store.approvals.filter((approval) => approval.status === 'pending');
    const decided = store.approvals.filter((approval) => approval.decidedAt);
    return {
      pending: pending.length,
      pendingHighRisk: pending.filter((approval) => ['high', 'critical'].includes(approval.riskLevel)).length,
      decided: decided.length,
      averageDecisionSeconds: avg(decided.map((approval) => secondsBetween(approval.createdAt, approval.decidedAt))),
      oldestPendingAt: pending.map((approval) => approval.createdAt).sort()[0] ?? null
    };
  }

  aiMetrics() {
    return {
      qwenCalls: store.auditTrail.filter((event) => event.eventType === 'qwen.invocation.completed').length,
      agentExecutions: store.agentLogs.length,
      averageAgentConfidence: avg(store.agentLogs.map((log) => Number(log.confidence))),
      schemaGuardrails: store.agentLogs.flatMap((log) => log.outputJson?.guardrails ?? []).reduce((acc, guardrail) => {
        acc[guardrail] = (acc[guardrail] ?? 0) + 1;
        return acc;
      }, {})
    };
  }

  sourceMetrics() {
    return {
      providers: sourceHealthService.list(),
      staleMarketFeeds: store.marketData.filter((row) => row.freshnessStatus !== 'fresh').length,
      staleMacroFeeds: store.macroIndicators.filter((row) => row.freshnessStatus && row.freshnessStatus !== 'fresh').length,
      ingestionRuns: store.ingestionRuns.length,
      failedIngestionItems: store.ingestionRuns.flatMap((run) => run.results ?? []).filter((item) => item.status === 'failed').length
    };
  }

  executiveMetrics() {
    return {
      asOf: new Date().toISOString(),
      workflow: this.workflowMetrics(),
      approvals: this.approvalMetrics(),
      ai: this.aiMetrics(),
      dataSources: this.sourceMetrics(),
      risk: {
        snapshots: store.riskSnapshots.length,
        latestSeverity: store.riskSnapshots.at(-1)?.severity ?? 'watch',
        latestPressureScore: store.riskSnapshots.at(-1)?.pressureScore ?? null,
        executiveAlerts: store.executiveAlerts.length,
        criticalAlerts: store.executiveAlerts.filter((alert) => alert.riskLevel === 'critical').length
      },
      cache: {
        mode: cacheService.mode
      }
    };
  }

  readiness() {
    const unhealthySources = sourceHealthService.list().filter((source) => source.status === 'failed');
    const qwenReady = Boolean(process.env.QWEN_API_KEY);
    return {
      asOf: new Date().toISOString(),
      status: qwenReady && unhealthySources.length < 2 ? 'ready_with_degraded_feeds_allowed' : 'degraded',
      checks: {
        qwenGateway: qwenReady ? 'ready' : 'mock_or_missing_key',
        sourceHealth: unhealthySources.length ? 'degraded' : 'ready',
        cache: cacheService.mode,
        approvals: 'ready',
        audit: 'ready'
      },
      degradedSources: unhealthySources.map((source) => source.provider)
    };
  }
}

export const metricsService = new MetricsService();
