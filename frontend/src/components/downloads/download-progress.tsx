import { Activity, ArrowDownUp, LoaderCircle, RefreshCcw, type LucideIcon } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Badge } from '~/components/ui/badge';
import { Button } from '~/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card';
import {
  formatBytes,
  formatDuration,
  formatEta,
  formatMovedAt,
  formatRatio,
  formatTime,
  normalizeProgress,
} from '~/components/downloads/download-format';
import { fetchDownloads } from '~/lib/api';
import { asMessage } from '~/lib/subscription';
import type { ActiveDownload, CompletedDownload, DownloadState } from '~/types';

type DownloadRow =
  | ({ hash: string; state: 'active' } & ActiveDownload)
  | ({ hash: string; state: 'completed' } & CompletedDownload);
type CompletedDownloadRow = { hash: string; state: 'completed' } & CompletedDownload;

export function DownloadProgress() {
  const [data, setData] = useState<DownloadState>({ active: {}, completed: {} });
  const [loading, setLoading] = useState(true);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void refresh();
    const timer = window.setInterval(() => {
      void refresh({ silent: true });
    }, 2000);

    return () => window.clearInterval(timer);
  }, []);

  const rows = useMemo(() => buildRows(data), [data]);
  const activeCount = Object.keys(data.active).length;
  const completedCount = Object.keys(data.completed).length;
  const qbitItems = [...Object.values(data.active), ...Object.values(data.completed)].filter((item) => item.qbit);
  const downloadSpeed = qbitItems.reduce((sum, item) => sum + (item.qbit?.downloadSpeed ?? 0), 0);
  const uploadSpeed = qbitItems.reduce((sum, item) => sum + (item.qbit?.uploadSpeed ?? 0), 0);
  const seedingCount = Object.values(data.completed).filter((item) => item.qbit && !item.qbitRemovedAt).length;

  async function refresh(options: { silent?: boolean } = {}) {
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
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.25fr)_minmax(20rem,0.75fr)]">
        <QueueSummaryCard
          activeCount={activeCount}
          completedCount={completedCount}
          seedingCount={seedingCount}
          loading={loading}
        />
        <SummaryCard
          label="Down / Up"
          value={`${formatBytes(downloadSpeed)}/s · ${formatBytes(uploadSpeed)}/s`}
          icon={ArrowDownUp}
          compactValue
        />
      </div>

      <Card className="p-5">
        <CardHeader className="mb-5">
          <div>
            <CardTitle>Download Activity</CardTitle>
            {lastUpdatedAt ? (
              <div className="mt-1 text-xs text-slate-500">Updated at {formatTime(lastUpdatedAt)}</div>
            ) : null}
          </div>
          <Button variant="outline" size="sm" onClick={() => void refresh()} disabled={loading}>
            <RefreshCcw className={loading ? 'mr-2 size-4 animate-spin' : 'mr-2 size-4'} />
            Refresh
          </Button>
        </CardHeader>
        <CardContent>
          {error ? (
            <div className="rounded-xl border border-rose-900 bg-rose-950/70 px-4 py-3 text-sm text-rose-100">
              {error}
            </div>
          ) : rows.length ? (
            <div className="max-h-[calc(100vh-19rem)] overflow-y-auto pr-1">
              <div className="grid gap-3">
                {rows.map((row) => (
                  <DownloadRecord key={row.hash} row={row} />
                ))}
              </div>
            </div>
          ) : (
            <div className="grid place-items-center rounded-2xl border border-dashed border-slate-800 px-4 py-16 text-center">
              <div className="text-sm font-medium text-slate-200">No download records in db.json.</div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function QueueSummaryCard({
  activeCount,
  completedCount,
  seedingCount,
  loading,
}: {
  activeCount: number;
  completedCount: number;
  seedingCount: number;
  loading: boolean;
}) {
  const Icon = loading ? LoaderCircle : Activity;

  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="text-sm text-slate-400">Queue Status</div>
          <div className="mt-2 flex flex-wrap items-end gap-x-5 gap-y-2">
            <div className="text-3xl font-semibold tracking-tight text-slate-50">{activeCount}</div>
            <div className="pb-1 text-xs font-medium uppercase tracking-[0.16em] text-cyan-200">Active</div>
            <div className="pb-1 text-sm text-slate-500">
              <span className="font-medium text-slate-300">{completedCount}</span> Moved
            </div>
            <div className="pb-1 text-sm text-slate-500">
              <span className="font-medium text-emerald-200">{seedingCount}</span> Seeding
            </div>
          </div>
        </div>
        <div className="rounded-2xl bg-slate-900 p-3 text-cyan-200">
          <Icon className={loading ? 'size-5 animate-spin' : 'size-5'} />
        </div>
      </div>
    </Card>
  );
}

function SummaryCard({
  label,
  value,
  icon: Icon,
  spinning = false,
  compactValue = false,
}: {
  label: string;
  value: number | string;
  icon: LucideIcon;
  spinning?: boolean;
  compactValue?: boolean;
}) {
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="text-sm text-slate-400">{label}</div>
          <div
            className={
              compactValue
                ? 'mt-2 whitespace-nowrap text-xl font-semibold tracking-tight text-slate-50'
                : 'mt-2 text-3xl font-semibold text-slate-50'
            }>
            {value}
          </div>
        </div>
        <div className="rounded-2xl bg-slate-900 p-3 text-cyan-200">
          <Icon className={spinning ? 'size-5 animate-spin' : 'size-5'} />
        </div>
      </div>
    </Card>
  );
}

function DownloadRecord({ row }: { row: DownloadRow }) {
  const qbit = row.qbit;
  const isCompleted = row.state === 'completed';

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950/55 p-4 shadow-[0_18px_50px_rgba(2,6,23,0.22)]">
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(20rem,0.95fr)]">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={isCompleted ? 'outline' : 'muted'}>{statusLabel(row)}</Badge>
            <InfoPill label="Episode" value={`S${row.season}E${row.number}`} />
            {qbit ? <InfoPill label="Size" value={formatBytes(qbit.totalSize)} /> : null}
          </div>
          <div className="mt-3 truncate text-base font-semibold text-slate-50">{row.title}</div>
          {row.folder ? <div className="mt-1 truncate text-xs text-slate-500">{row.folder}</div> : null}
        </div>

        <div className="grid gap-3">
          {isCompleted ? <SeedingCell row={row} /> : <ProgressCell row={row} />}
          <QbittorrentMeta row={row} />
        </div>
      </div>

      <div className="mt-4 border-t border-slate-800/70 pt-3 text-xs text-slate-500">
        {isCompleted ? <MovedCell row={row} /> : <HashCell hash={row.hash} />}
      </div>
    </div>
  );
}

function InfoPill({ label, value }: { label: string; value: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-slate-800 bg-slate-950 px-2.5 py-0.5 text-xs">
      <span className="text-slate-500">{label}</span>
      <span className="font-medium text-slate-200">{value}</span>
    </span>
  );
}

function HashCell({ hash }: { hash: string }) {
  return (
    <div className="grid gap-1">
      <div className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-slate-600">Hash</div>
      <div className="break-all font-mono text-xs text-slate-400">{hash}</div>
    </div>
  );
}

function MovedCell({ row }: { row: DownloadRow & { state: 'completed' } }) {
  return (
    <div className="min-w-0">
      <div className="truncate text-slate-300" title={row.targetPath ?? undefined}>
        {row.targetPath ?? 'Moved, path not recorded'}
      </div>
      <div className="mt-1 text-xs text-slate-500">
        {formatMovedAt(row.movedAt)}
        {row.qbitRemovedAt ? ` · qB cleaned at ${formatMovedAt(row.qbitRemovedAt)}` : ''}
      </div>
    </div>
  );
}

function ProgressCell({ row }: { row: DownloadRow & { state: 'active' } }) {
  if (row.qbitError) return <span className="text-rose-300">qB unavailable</span>;
  if (!row.qbit) return <span className="text-slate-500">Not found</span>;

  const percent = normalizeProgress(row.qbit.progress);
  return (
    <div className="grid gap-2 rounded-xl border border-slate-800 bg-slate-950/70 p-3">
      <div className="flex items-center justify-between gap-3 text-xs">
        <span className="font-medium text-slate-300">Download Progress</span>
        <span className="font-semibold text-cyan-100">{percent}%</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-slate-800">
        <div className="h-full rounded-full bg-cyan-400" style={{ width: `${Math.min(percent, 100)}%` }} />
      </div>
    </div>
  );
}

function SeedingCell({ row }: { row: DownloadRow & { state: 'completed' } }) {
  if (row.qbitError) return <span className="text-rose-300">qB unavailable</span>;
  if (row.qbitRemovedAt) return <span className="text-slate-500">Cleaned</span>;
  if (!row.qbit) return <span className="text-slate-500">Moved</span>;

  const ratioPercent = normalizeProgress(row.qbit.ratio);
  return (
    <div className="grid gap-2 rounded-xl border border-slate-800 bg-slate-950/70 p-3">
      <div className="flex items-center justify-between gap-3 text-xs">
        <span className="font-medium text-slate-300">Seeding Ratio</span>
        <span className="font-semibold text-emerald-100">{formatRatio(row.qbit.ratio)}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-slate-800">
        <div className="h-full rounded-full bg-emerald-400" style={{ width: `${Math.min(ratioPercent, 100)}%` }} />
      </div>
      <div className="text-xs text-slate-500">{formatDuration(row.qbit.seedingTime)}</div>
    </div>
  );
}

function QbittorrentMeta({ row }: { row: DownloadRow }) {
  if (row.qbitError) return <div className="text-xs text-rose-300">{row.qbitError}</div>;
  if (!row.qbit)
    return (
      <div className="text-xs text-slate-500">
        {row.state === 'completed' ? 'Moved and no longer tracked by qB' : 'Waiting for qB status'}
      </div>
    );

  const qbit = row.qbit;

  return (
    <div className="grid gap-2 text-xs sm:grid-cols-2">
      {row.state === 'completed' ? (
        <>
          <Metric label="Time" value={formatDuration(qbit.seedingTime)} />
          <Metric label="Upload" value={`${formatBytes(qbit.uploadSpeed)}/s`} />
          <Metric label="Uploaded" value={formatBytes(qbit.totalUploaded)} />
        </>
      ) : (
        <>
          <Metric label="Download" value={`${formatBytes(qbit.downloadSpeed)}/s`} />
          <Metric label="Upload" value={`${formatBytes(qbit.uploadSpeed)}/s`} />
          <Metric label="ETA" value={formatEta(qbit.eta).replace(/^ETA\s*/, '')} />
        </>
      )}
      <Metric label="Seeds" value={`${qbit.connectedSeeds}/${qbit.totalSeeds}`} />
      <Metric label="Peers" value={`${qbit.connectedPeers}/${qbit.totalPeers}`} />
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-2">
      <div className="text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-slate-600">{label}</div>
      <div className="mt-1 truncate font-medium text-slate-200" title={value}>
        {value}
      </div>
    </div>
  );
}

function statusLabel(row: DownloadRow) {
  if (row.state === 'active') return row.qbit?.stateMessage || row.qbit?.state || 'Downloading';
  if (row.qbitRemovedAt) return 'Cleaned';
  if (row.qbit) return row.qbit.stateMessage || row.qbit.state || 'Seeding';
  return 'Moved';
}

function buildRows(data: DownloadState): DownloadRow[] {
  const activeRows = Object.entries(data.active).map(
    ([hash, episode]): DownloadRow => ({
      ...episode,
      hash,
      state: 'active',
    }),
  );

  const completedRows = Object.entries(data.completed)
    .map(
      ([hash, episode]): CompletedDownloadRow => ({
        ...episode,
        hash,
        state: 'completed',
      }),
    )
    .sort((first, second) => second.movedAt.localeCompare(first.movedAt));

  return [...activeRows, ...completedRows];
}
