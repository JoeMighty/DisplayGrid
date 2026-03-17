import { useEffect, useRef, useCallback } from 'react';

type MessageHandler = (data: unknown) => void;

export function useWS(url: string | null, onMessage: MessageHandler) {
  const ws      = useRef<WebSocket | null>(null);
  const timer   = useRef<ReturnType<typeof setTimeout>>();
  const handler = useRef(onMessage);
  handler.current = onMessage;

  const connect = useCallback(() => {
    if (!url) return;
    const sock = new WebSocket(url);
    ws.current = sock;

    sock.onmessage = e => {
      try { handler.current(JSON.parse(e.data)); } catch {}
    };

    sock.onclose = () => {
      // Reconnect after 5 s
      timer.current = setTimeout(connect, 5000);
    };

    sock.onerror = () => { sock.close(); };
  }, [url]);

  useEffect(() => {
    connect();
    return () => {
      clearTimeout(timer.current);
      ws.current?.close();
    };
  }, [connect]);

  const send = useCallback((data: unknown) => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify(data));
    }
  }, []);

  return { send };
}
