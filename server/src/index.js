import http from 'node:http';
import { env } from './config/env.js';
import { createApp } from './app.js';
import { attachWebSocketHub } from './websocket/hub.js';
import { logger } from './shared/logger.js';
import { startIngestionScheduler } from './services/ingestionScheduler.js';
import { ingestionService } from './services/ingestionService.js';
import { marketIntelligenceService } from './services/marketIntelligenceService.js';

const app = createApp();
const server = http.createServer(app);
attachWebSocketHub(server);
startIngestionScheduler();

server.listen(env.port, env.host, () => {
  logger.info({
    port: env.port,
    host: env.host,
    qwenMode: env.qwenApiKey ? 'real' : 'mock-gateway',
    providerMode: env.useMockProviders ? 'mock-fallback-enabled' : 'real-only'
  }, 'Macro Fund AI OS API listening');

  ingestionService
    .run({ actor: { id: 'startup-ingestion', role: 'operations', type: 'system' } })
    .then(() => marketIntelligenceService.generateSignals())
    .catch((error) => logger.warn({ error: error.message }, 'Initial ingestion failed'));
});
