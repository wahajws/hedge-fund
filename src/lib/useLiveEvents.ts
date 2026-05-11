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
    const isLoopbackWs = (value: string) => /^wss?:\/\/(127\.0\.0\.1|localhost|\[::1\])(?::\d+)?/i.test(value);
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const configured = import.meta.env.VITE_WS_URL as string | undefined;
    const defaultUrl = import.meta.env.PROD ? null : 'ws://127.0.0.1:4000/ws';
    const url = configured && !(isPublicHost && isLoopbackWs(configured)) ? configured : defaultUrl;
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
