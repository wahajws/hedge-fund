import { randomUUID } from 'node:crypto';
import { store } from '../db/store.js';
import { publishEvent } from '../shared/events.js';

const defaultCircuit = {
  state: 'closed',
  failureCount: 0,
  openedAt: null,
  lastFailure: null,
  lastSuccess: null
};

export class SourceHealthService {
  ensure(provider) {
    if (!store.sourceHealth[provider]) {
      store.sourceHealth[provider] = {
        id: randomUUID(),
        provider,
        status: 'unknown',
        latencyMs: null,
        lastSuccessAt: null,
        lastFailureAt: null,
        failureCount: 0,
        rateLimitRemaining: null,
        circuit: { ...defaultCircuit },
        updatedAt: new Date().toISOString()
      };
    }
    return store.sourceHealth[provider];
  }

  canRequest(provider) {
    const health = this.ensure(provider);
    if (health.circuit.state !== 'open') return true;
    const openedAt = health.circuit.openedAt ? new Date(health.circuit.openedAt).getTime() : 0;
    if (Date.now() - openedAt > 60_000) {
      health.circuit.state = 'half_open';
      return true;
    }
    return false;
  }

  success(provider, { latencyMs, rateLimitRemaining = null } = {}) {
    const health = this.ensure(provider);
    health.status = 'healthy';
    health.latencyMs = latencyMs ?? health.latencyMs;
    health.lastSuccessAt = new Date().toISOString();
    health.failureCount = 0;
    health.rateLimitRemaining = rateLimitRemaining;
    health.circuit = { ...defaultCircuit, lastSuccess: health.lastSuccessAt };
    health.updatedAt = new Date().toISOString();
    publishEvent('source.healthy', health);
    return health;
  }

  failure(provider, error) {
    const health = this.ensure(provider);
    health.status = health.failureCount >= 2 ? 'failed' : 'degraded';
    health.lastFailureAt = new Date().toISOString();
    health.failureCount += 1;
    health.circuit.failureCount = health.failureCount;
    health.circuit.lastFailure = String(error?.message ?? error);
    if (health.failureCount >= 3) {
      health.circuit.state = 'open';
      health.circuit.openedAt = health.lastFailureAt;
    }
    health.updatedAt = new Date().toISOString();
    publishEvent('source.degraded', health);
    return health;
  }

  list() {
    return Object.values(store.sourceHealth);
  }
}

export const sourceHealthService = new SourceHealthService();

