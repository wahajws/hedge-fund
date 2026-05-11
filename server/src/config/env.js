import 'dotenv/config';

export const env = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: Number(process.env.API_PORT ?? process.env.PORT ?? 4000),
  host: process.env.API_HOST ?? '127.0.0.1',
  corsOrigin: process.env.CORS_ORIGIN ?? 'http://127.0.0.1:5173',
  jwtSecret: process.env.JWT_SECRET ?? 'local-dev-only',
  authRequired: process.env.AUTH_REQUIRED === 'true',
  internalServiceToken: process.env.INTERNAL_SERVICE_TOKEN ?? '',
  auditHashSecret: process.env.AUDIT_HASH_SECRET ?? 'local-audit-secret',
  databaseUrl: process.env.DATABASE_URL ?? '',
  redisUrl: process.env.REDIS_URL ?? '',
  fredApiKey: process.env.FRED_API_KEY ?? '',
  alphaVantageApiKey: process.env.ALPHA_VANTAGE_API_KEY ?? '',
  fmpApiKey: process.env.FMP_API_KEY ?? '',
  qwenApiKey: process.env.QWEN_API_KEY ?? '',
  qwenModel: process.env.QWEN_MODEL ?? 'qwen-plus',
  qwenTimeout: Number(process.env.QWEN_TIMEOUT ?? 30_000),
  qwenMaxRetries: Number(process.env.QWEN_MAX_RETRIES ?? 2),
  qwenConcurrency: Number(process.env.QWEN_CONCURRENCY ?? 3),
  qwenBaseUrl:
    process.env.QWEN_BASE_URL ??
    'https://dashscope-intl.aliyuncs.com/compatible-mode/v1/chat/completions',
  useMockProviders: process.env.USE_MOCK_PROVIDERS !== 'false',
  rateLimitWindowMs: Number(process.env.RATE_LIMIT_WINDOW_MS ?? 60_000),
  rateLimitMax: Number(process.env.RATE_LIMIT_MAX ?? 300),
  websocketHeartbeatMs: Number(process.env.WEBSOCKET_HEARTBEAT_MS ?? 30_000)
};
