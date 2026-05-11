import { randomUUID } from 'node:crypto';
import { store } from '../db/store.js';
import { publishEvent } from '../shared/events.js';
import { auditService } from '../services/auditService.js';

export class OrchestrationLogger {
  log({ workflowId, agentName = null, eventType, status = 'info', payload = {}, actor = { id: 'orchestrator', role: 'system', type: 'system' } }) {
    const row = {
      id: randomUUID(),
      workflowId,
      agentName,
      eventType,
      status,
      payload,
      createdAt: new Date().toISOString()
    };
    store.orchestrationLogs.push(row);
    publishEvent('workflow.status', row);
    auditService.record({
      eventType: `orchestration.${eventType}`,
      actor,
      objectType: 'workflow',
      objectId: workflowId,
      payload: row
    });
    return row;
  }

  list({ workflowId } = {}) {
    return store.orchestrationLogs.filter((row) => !workflowId || row.workflowId === workflowId);
  }
}

export const orchestrationLogger = new OrchestrationLogger();

