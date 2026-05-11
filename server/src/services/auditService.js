import { createHash, randomUUID } from 'node:crypto';
import { env } from '../config/env.js';
import { store } from '../db/store.js';
import { publishEvent } from '../shared/events.js';

function hashPayload(payload) {
  return createHash('sha256')
    .update(JSON.stringify(payload))
    .update(env.auditHashSecret)
    .digest('hex');
}

export class AuditService {
  record({ eventType, actor, objectType, objectId, payload = {} }) {
    const event = {
      id: randomUUID(),
      eventType,
      actorType: actor?.type ?? 'user',
      actorId: actor?.id ?? actor?.name ?? 'system',
      actorRole: actor?.role ?? 'system',
      objectType,
      objectId,
      payload,
      payloadHash: hashPayload(payload),
      createdAt: new Date().toISOString()
    };
    store.auditTrail.push(event);
    publishEvent('audit.recorded', event);
    return event;
  }

  list({ limit = 100, objectId, actor } = {}) {
    let rows = [...store.auditTrail].reverse();
    if (objectId) rows = rows.filter((row) => row.objectId === objectId);
    if (actor) rows = rows.filter((row) => row.actorId === actor);
    return rows.slice(0, Number(limit));
  }
}

export const auditService = new AuditService();

