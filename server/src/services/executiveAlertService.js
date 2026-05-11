import { randomUUID } from 'node:crypto';
import { store } from '../db/store.js';
import { publishEvent } from '../shared/events.js';
import { auditService } from './auditService.js';

export class ExecutiveAlertService {
  createFromAgent({ actor, workflowId, agentLog, approvalId = null }) {
    const output = agentLog.outputJson;
    const alert = {
      id: randomUUID(),
      workflowId,
      agentLogId: agentLog.id,
      title: output.summary?.slice(0, 140) ?? 'Executive alert',
      riskLevel: output.riskLevel ?? 'watch',
      keySignals: output.keySignals ?? [],
      affectedPositions: output.affectedPositions ?? [],
      escalationReason: output.escalationReason,
      approvalRequired: Boolean(agentLog.approvalRequired),
      approvalId,
      status: approvalId ? 'pending_approval' : 'open',
      createdAt: new Date().toISOString()
    };
    store.executiveAlerts.push(alert);
    publishEvent('risk.alerts', alert);
    auditService.record({
      eventType: 'executive_alert.created',
      actor,
      objectType: 'executive_alert',
      objectId: alert.id,
      payload: alert
    });
    return alert;
  }

  list({ status, riskLevel } = {}) {
    return store.executiveAlerts
      .filter((alert) => !status || alert.status === status)
      .filter((alert) => !riskLevel || alert.riskLevel === riskLevel)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }
}

export const executiveAlertService = new ExecutiveAlertService();

