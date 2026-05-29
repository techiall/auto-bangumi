import { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import { DownloadActivityBoard } from '~/components/downloads/download-activity-board';
import { buildDownloadRows, summarizeDownloads } from '~/components/downloads/download-model';
import { DownloadOverview } from '~/components/downloads/download-overview';
import { DownloadStatusNotes } from '~/components/downloads/download-status-notes';
import type { DownloadMessage } from '~/components/downloads/download-types';
import { downloadsWebSocketUrl, fetchDownloads } from '~/lib/api';
import { asMessage } from '~/lib/subscription';
import type { DownloadState } from '~/types';

export function DownloadProgress({ active }: { active: boolean }) {
  const [data, setData] = useState<DownloadState>({ active: {}, moveJobs: {}, completed: {} });
  const [loading, setLoading] = useState(true);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const socketRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (!active) return;

    let disposed = false;
    let reconnectTimer: number | undefined;

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
        setError('Download status stream is unavailable.');
        setLoading(false);
      });

      socket.addEventListener('close', () => {
        if (socketRef.current === socket) socketRef.current = null;
        if (!disposed) reconnectTimer = window.setTimeout(connect, 3000);
      });
    };

    connect();

    return () => {
      disposed = true;
      if (reconnectTimer) window.clearTimeout(reconnectTimer);
      socketRef.current?.close();
      socketRef.current = null;
    };
  }, [active]);

  const rows = useMemo(() => buildDownloadRows(data), [data]);
  const deferredRows = useDeferredValue(rows);
  const summary = useMemo(() => summarizeDownloads(data, rows), [data, rows]);

  async function refresh(options: { silent?: boolean } = {}) {
    const socket = socketRef.current;
    if (socket?.readyState === WebSocket.OPEN) {
      socket.send('refresh');
      return;
    }

    if (!options.silent) setLoading(true);
    setError(null);
    try {
      setData(await fetchDownloads());
      setLastUpdatedAt(new Date());
    } catch (caught) {
      setError(asMessage(caught));
    } finally {
      if (!options.silent) setLoading(false);
    }
  }

  return (
    <div className="grid gap-5">
      <DownloadOverview summary={summary} loading={loading} />

      <DownloadActivityBoard
        rows={deferredRows}
        loading={loading}
        error={error}
        lastUpdatedAt={lastUpdatedAt}
        onRefresh={() => void refresh()}
      />

      <DownloadStatusNotes />
    </div>
  );
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
