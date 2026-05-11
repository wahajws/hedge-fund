import { EventEmitter } from 'node:events';

export const eventBus = new EventEmitter();
eventBus.setMaxListeners(100);

export function publishEvent(type, payload) {
  const event = {
    type,
    payload,
    createdAt: new Date().toISOString()
  };
  eventBus.emit(type, event);
  eventBus.emit('*', event);
  return event;
}

