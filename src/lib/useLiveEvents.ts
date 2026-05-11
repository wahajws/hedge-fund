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
    const isPublicHost = !['localhost', '127.0.0.1', '::1'].includes(window.location.hostname);
    if (isPublicHost) {
      setStatus('closed');
      return;
    }
    const configured = import.meta.env.VITE_WS_URL as string | undefined;
    const defaultUrl = import.meta.env.PROD ? null : 'ws://127.0.0.1:4000/ws';
    let url = defaultUrl;
    if (configured) {
      const trimmed = configured.trim().replace(/^['"]|['"]$/g, '');
      try {
        const parsed = new URL(trimmed);
        const isLoopback = ['localhost', '127.0.0.1', '[::1]', '::1'].includes(parsed.hostname);
        url = isPublicHost && (isLoopback || parsed.protocol !== 'wss:') ? null : trimmed;
      } catch {
        url = isPublicHost ? null : trimmed;
      }
    }
    if (!url) {
      setStatus('closed');
      return;
    }
    const ws = new WebSocket(url);
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
