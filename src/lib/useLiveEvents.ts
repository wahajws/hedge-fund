import { useEffect, useState } from 'react';

export type LiveEvent = {
  type: string;
  payload: unknown;
  createdAt: string;
};

export function useLiveEvents() {
  const [events, setEvents] = useState<LiveEvent[]>([]);
  const [status, setStatus] = useState<'connecting' | 'open' | 'closed'>('connecting');

  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const defaultUrl = import.meta.env.PROD ? `${protocol}//${window.location.host}/ws` : 'ws://127.0.0.1:4000/ws';
    const ws = new WebSocket(import.meta.env.VITE_WS_URL ?? defaultUrl);
    ws.onopen = () => setStatus('open');
    ws.onclose = () => setStatus('closed');
    ws.onerror = () => setStatus('closed');
    ws.onmessage = (message) => {
      try {
        const event = JSON.parse(message.data) as LiveEvent;
        setEvents((current) => [event, ...current].slice(0, 80));
      } catch {
        // Ignore malformed operational events from development tools.
      }
    };
    return () => ws.close();
  }, []);

  return { events, status };
}
