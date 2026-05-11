import { randomUUID } from 'node:crypto';
import { store } from '../db/store.js';
import { auditService } from './auditService.js';
import { publishEvent } from '../shared/events.js';

function requiredRoleFor(objectType, riskLevel) {
  if (objectType === 'compliance_finding') return 'compliance';
  if (riskLevel === 'critical' || riskLevel === 'high') return 'cio';
  if (objectType === 'risk_snapshot') return 'risk';
  return 'analyst';
}

export class ApprovalService {
  create({ actor, objectType, objectId, title, riskLevel = 'watch', payload = {} }) {
    const approval = {
      id: randomUUID(),
      objectType,
      objectId,
      title,
      status: 'pending',
      riskLevel,
      requiredRole: requiredRoleFor(objectType, riskLevel),
      assignedTo: null,
      decision: null,
      decisionReason: null,
      actionHistory: [
        {
          action: 'created',
          actorId: actor?.id ?? 'system',
          at: new Date().toISOString()
        }
      ],
      payload,
      createdAt: new Date().toISOString(),
      decidedAt: null
    };
    store.approvals.push(approval);
    publishEvent('approval.requested', approval);
    auditService.record({ eventType: 'approval.requested', actor, objectType: 'approval', objectId: approval.id, payload: approval });
    return approval;
  }

  list({ status } = {}) {
    return status ? store.approvals.filter((row) => row.status === status) : store.approvals;
  }

  decide({ id, actor, decision, comment }) {
    const approval = store.approvals.find((row) => row.id === id);
    if (!approval) return null;
    const normalized = String(decision).toLowerCase();
    if (!['approved', 'rejected', 'changes_requested', 'escalated'].includes(normalized)) {
      throw new Error('Invalid approval decision.');
    }
    approval.status = normalized;
    approval.decision = normalized;
    approval.decisionReason = comment ?? '';
    approval.decidedAt = new Date().toISOString();
    approval.actionHistory.push({
      action: normalized,
      actorId: actor.id,
      role: actor.role,
      comment,
      at: approval.decidedAt
    });
    publishEvent('approval.completed', approval);
    auditService.record({ eventType: 'approval.completed', actor, objectType: 'approval', objectId: approval.id, payload: { decision: normalized, comment } });
    return approval;
  }
}

export const approvalService = new ApprovalService();

