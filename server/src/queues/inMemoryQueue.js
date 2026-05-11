import { randomUUID } from 'node:crypto';
import { publishEvent } from '../shared/events.js';

export class InMemoryQueue {
  constructor(name) {
    this.name = name;
    this.jobs = [];
    this.handlers = new Map();
  }

  register(type, handler) {
    this.handlers.set(type, handler);
  }

  async add(type, payload) {
    const job = {
      id: randomUUID(),
      queue: this.name,
      type,
      payload,
      status: 'queued',
      attempts: 0,
      createdAt: new Date().toISOString(),
      completedAt: null
    };
    this.jobs.push(job);
    publishEvent('queue.job_queued', job);
    return this.process(job);
  }

  async process(job) {
    const handler = this.handlers.get(job.type);
    if (!handler) {
      job.status = 'failed';
      job.error = `No queue handler registered for ${job.type}`;
      publishEvent('queue.job_failed', job);
      return job;
    }
    try {
      job.status = 'running';
      job.attempts += 1;
      publishEvent('queue.job_started', job);
      job.result = await handler(job.payload);
      job.status = 'completed';
      job.completedAt = new Date().toISOString();
      publishEvent('queue.job_completed', job);
      return job;
    } catch (error) {
      job.status = 'failed';
      job.error = error.message;
      publishEvent('queue.job_failed', job);
      return job;
    }
  }

  snapshot() {
    return {
      name: this.name,
      queued: this.jobs.filter((job) => job.status === 'queued').length,
      running: this.jobs.filter((job) => job.status === 'running').length,
      completed: this.jobs.filter((job) => job.status === 'completed').length,
      failed: this.jobs.filter((job) => job.status === 'failed').length
    };
  }
}

export const workflowQueue = new InMemoryQueue('workflow');
export const qwenQueue = new InMemoryQueue('qwen');
export const ingestionQueue = new InMemoryQueue('ingestion');

