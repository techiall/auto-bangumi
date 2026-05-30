import { useCallback, useEffect, useRef, useState } from 'react';
import type { DownloadMessage } from '~/components/downloads/download-types';
import { downloadsWebSocketUrl, fetchDownloads } from '~/lib/api';
import { asMessage } from '~/lib/subscription';
import type { DownloadState } from '~/types';

const POLL_INTERVAL_MS = 2000;

export interface DownloadStateSnapshot {
  data: DownloadState;
  loading: boolean;
  error: string | null;
  lastUpdatedAt: Date | null;
  refresh: (options?: { silent?: boolean; subscriptionRss?: string }) => Promise<void>;
}

export function useDownloadState(enabled: boolean): DownloadStateSnapshot {
  const [data, setData] = useState<DownloadState>({ active: {}, moveJobs: {}, completed: {} });
  const [loading, setLoading] = useState(true);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const socketRef = useRef<WebSocket | null>(null);
  const httpRequestInFlightRef = useRef(false);

  const refresh = useCallback(async (options: { silent?: boolean; subscriptionRss?: string } = {}) => {
    const socket = socketRef.current;
    if (!options.subscriptionRss && socket?.readyState === WebSocket.OPEN) {
      socket.send('refresh');
      return;
    }

    if (httpRequestInFlightRef.current) return;
    httpRequestInFlightRef.current = true;
    if (!options.silent) setLoading(true);
    setError(null);
    try {
      setData(await fetchDownloads(options.subscriptionRss));
      setLastUpdatedAt(new Date());
    } catch (caught) {
      setError(asMessage(caught));
    } finally {
      httpRequestInFlightRef.current = false;
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!enabled) return;

    let disposed = false;
    let reconnectTimer: number | undefined;
    const pollingTimer = window.setInterval(() => {
      if (socketRef.current?.readyState === WebSocket.OPEN) return;
      void refresh({ silent: true });
    }, POLL_INTERVAL_MS);

    const connect = () => {
      if (disposed) return;
      const socket = new WebSocket(downloadsWebSocketUrl());
      socketRef.current = socket;

      socket.addEventListener('message', (event) => {
        const message = parseDownloadMessage(event.data);
        if (!message) return;

        if (message.type === 'state') {
          setData(message.data);
          setLastUpdatedAt(new Date());
          setError(null);
          setLoading(false);
          return;
        }

        setError(message.message);
        setLoading(false);
      });

      socket.addEventListener('error', () => {
        setLoading(false);
        void refresh({ silent: true });
      });

      socket.addEventListener('close', () => {
        if (socketRef.current === socket) socketRef.current = null;
        if (!disposed) reconnectTimer = window.setTimeout(connect, 3000);
      });
    };

    void refresh({ silent: true });
    connect();

    return () => {
      disposed = true;
      window.clearInterval(pollingTimer);
      if (reconnectTimer) window.clearTimeout(reconnectTimer);
      socketRef.current?.close();
      socketRef.current = null;
    };
  }, [enabled, refresh]);

  return { data, loading, error, lastUpdatedAt, refresh };
}

function parseDownloadMessage(value: unknown): DownloadMessage | null {
  if (typeof value !== 'string') return null;

  try {
    const parsed = JSON.parse(value) as Partial<DownloadMessage>;
    if (parsed.type === 'state' && parsed.data) return parsed as DownloadMessage;
    if (parsed.type === 'error' && typeof parsed.message === 'string') return parsed as DownloadMessage;
  } catch {
    return null;
  }

  return null;
}
