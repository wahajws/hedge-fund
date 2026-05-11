import { WebSocketServer } from 'ws';
import { eventBus } from '../shared/events.js';
import { env } from '../config/env.js';

export function attachWebSocketHub(server) {
  const wss = new WebSocketServer({ server, path: '/ws' });

  wss.on('connection', (socket) => {
    socket.isAlive = true;
    socket.on('pong', () => {
      socket.isAlive = true;
    });
    socket.send(JSON.stringify({
      type: 'system.connected',
      payload: {
        message: 'Macro Fund AI OS backend stream connected',
        channels: ['market.snapshot', 'macro.events', 'workflow.status', 'agent.logs', 'risk.alerts', 'approval.updates', 'audit.ticker', 'system.health']
      },
      createdAt: new Date().toISOString()
    }));
  });

  const heartbeat = setInterval(() => {
    for (const client of wss.clients) {
      if (client.isAlive === false) {
        client.terminate();
        continue;
      }
      client.isAlive = false;
      client.ping();
    }
  }, env.websocketHeartbeatMs);

  wss.on('close', () => clearInterval(heartbeat));

  eventBus.on('*', (event) => {
    const message = JSON.stringify(event);
    for (const client of wss.clients) {
      if (client.readyState === client.OPEN) {
        client.send(message);
      }
    }
  });

  return wss;
}
