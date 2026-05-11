import Redis from 'ioredis';
import { env } from '../config/env.js';

class MemoryCache {
  constructor() {
    this.rows = new Map();
  }

  async get(key) {
    const row = this.rows.get(key);
    if (!row) return null;
    if (row.expiresAt && row.expiresAt < Date.now()) {
      this.rows.delete(key);
      return null;
    }
    return row.value;
  }

  async set(key, value, ttlSeconds = 60) {
    this.rows.set(key, {
      value,
      expiresAt: ttlSeconds ? Date.now() + ttlSeconds * 1000 : null
    });
  }

  async del(key) {
    this.rows.delete(key);
  }
}

export class CacheService {
  constructor() {
    this.redis = env.redisUrl ? new Redis(env.redisUrl, { lazyConnect: true, maxRetriesPerRequest: 1 }) : null;
    this.memory = new MemoryCache();
    this.mode = this.redis ? 'redis' : 'memory';
  }

  async get(key) {
    if (!this.redis) return this.memory.get(key);
    try {
      await this.ensureRedis();
      const value = await this.redis.get(key);
      return value ? JSON.parse(value) : null;
    } catch {
      this.mode = 'memory-fallback';
      return this.memory.get(key);
    }
  }

  async set(key, value, ttlSeconds = 60) {
    if (!this.redis) return this.memory.set(key, value, ttlSeconds);
    try {
      await this.ensureRedis();
      await this.redis.set(key, JSON.stringify(value), 'EX', ttlSeconds);
    } catch {
      this.mode = 'memory-fallback';
      await this.memory.set(key, value, ttlSeconds);
    }
  }

  async del(key) {
    if (!this.redis) return this.memory.del(key);
    try {
      await this.ensureRedis();
      await this.redis.del(key);
    } catch {
      this.mode = 'memory-fallback';
      await this.memory.del(key);
    }
  }

  async ensureRedis() {
    if (!this.redis || this.redis.status === 'ready') return;
    if (this.redis.status === 'wait') await this.redis.connect();
  }
}

export const cacheService = new CacheService();

