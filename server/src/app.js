import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { env } from './config/env.js';
import { attachActor } from './middleware/auth.js';
import { rateLimit } from './middleware/rateLimit.js';
import { requestContext } from './shared/requestContext.js';
import { apiRouter } from './routes/api.js';
import { logger } from './shared/logger.js';

export function createApp() {
  const app = express();
  app.disable('x-powered-by');
  app.use(helmet());
  app.use(cors({ origin: env.corsOrigin, credentials: true }));
  app.use(express.json({ limit: '1mb' }));
  app.use(requestContext);
  app.use(attachActor);
  app.use(rateLimit({ windowMs: env.rateLimitWindowMs, max: env.rateLimitMax }));

  app.get('/', (req, res) => {
    res.json({
      requestId: req.requestId,
      name: 'Macro Fund AI Operating System API',
      phase: '3-backend-architecture',
      llmProvider: 'qwen-only',
      docs: {
        health: '/api/health',
        workflows: '/api/workflows',
        runWorkflow: 'POST /api/workflows/run'
      }
    });
  });

  app.use('/api', apiRouter);
  app.use('/', apiRouter);

  app.use((req, res) => {
    res.status(404).json({
      requestId: req.requestId,
      error: 'NotFound',
      message: `API route not found: ${req.method} ${req.originalUrl}`
    });
  });

  app.use((error, req, res, _next) => {
    logger.error({ error, requestId: req.requestId }, 'API request failed');
    const status = error.name === 'ZodError' ? 400 : 500;
    res.status(status).json({
      requestId: req.requestId,
      error: error.name ?? 'InternalServerError',
      message: status === 400 ? error.message : 'Internal backend error.'
    });
  });

  return app;
}
