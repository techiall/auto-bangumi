import { memo } from 'react';
import { RotateCcw } from 'lucide-react';
import { Badge } from '~/components/ui/badge';
import { Button } from '~/components/ui/button';
import {
  formatBytes,
  formatDuration,
  formatEta,
  formatMovedAt,
  formatRatio,
  normalizeProgress,
} from '~/components/downloads/download-format';
import { isSeedingRow } from '~/components/downloads/download-model';
import type { CompletedDownloadRow, DownloadRow } from '~/components/downloads/download-types';

export const DownloadRecord = memo(function DownloadRecord({
  row,
  onRetryMove,
  retrying = false,
}: {
  row: DownloadRow;
  onRetryMove?: (hash: string) => void;
  retrying?: boolean;
}) {
  const qbit = row.qbit;
  const isCompleted = row.state === 'completed';
  const isSeeding = isSeedingRow(row);
  const season = row.season ?? 1;

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950/55 p-4 shadow-[0_18px_50px_rgba(2,6,23,0.22)] [contain-intrinsic-size:16rem] [content-visibility:auto]">
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(20rem,0.95fr)]">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={isCompleted ? 'outline' : 'muted'}>{statusLabel(row)}</Badge>
            <InfoPill label="Episode" value={`S${season}E${row.number}`} />
            {qbit ? <InfoPill label="Size" value={formatBytes(qbit.totalSize)} /> : null}
          </div>
          <div className="mt-3 truncate text-base font-semibold text-slate-50">{row.title ?? 'Unknown title'}</div>
          {row.folder ? <div className="mt-1 truncate text-xs text-slate-500">{row.folder}</div> : null}
        </div>

        <div className="grid gap-3">
          {isSeeding ? <SeedingCell row={row} /> : null}
          {row.state === 'active' && !isSeeding ? <ProgressCell row={row} /> : null}
          {row.state === 'moveJob' ? <MoveJobCell row={row} onRetryMove={onRetryMove} retrying={retrying} /> : null}
          <QbittorrentMeta row={row} />
        </div>
      </div>

      <div className="mt-4 border-t border-slate-800/70 pt-3 text-xs text-slate-500">
        {isCompleted ? <MovedCell row={row} /> : null}
        {row.state === 'moveJob' ? <MoveTargetCell row={row} /> : null}
        {row.state === 'active' ? <HashCell hash={row.hash} /> : null}
      </div>
    </div>
  );
});

export const MovedHistoryRecord = memo(function MovedHistoryRecord({ row }: { row: CompletedDownloadRow }) {
  return (
    <div className="grid gap-3 rounded-2xl border border-slate-800 bg-slate-950/45 px-4 py-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
      <div className="min-w-0">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <span className="truncate text-sm font-medium text-slate-200">{row.title}</span>
          <span className="shrink-0 rounded-full border border-slate-800 bg-slate-950 px-2 py-0.5 text-xs text-slate-400">
            S{row.season}E{row.number}
          </span>
        </div>
        <div className="mt-1 truncate text-xs text-slate-500" title={row.targetPath ?? undefined}>
          {row.targetPath ?? row.folder ?? 'Moved'}
        </div>
      </div>
      <div className="shrink-0 text-xs text-slate-500 sm:text-right">{formatMovedAt(row.movedAt)}</div>
    </div>
  );
});

function InfoPill({ label, value }: { label: string; value: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-slate-800 bg-slate-950 px-2.5 py-0.5 text-xs">
      <span className="text-slate-500">{label}</span>
      <span className="font-medium text-slate-200">{value}</span>
    </span>
  );
}

function MoveTargetCell({ row }: { row: DownloadRow & { state: 'moveJob' } }) {
  return (
    <div className="grid gap-1">
      <div className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-slate-600">Target</div>
      <div className="truncate text-slate-300" title={row.targetRelativePath}>
        {row.targetRelativePath}
      </div>
      {row.error ? <div className="mt-1 text-rose-300">{row.error}</div> : null}
    </div>
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
  if (!row.qbit) return <span className="text-slate-500">Waiting for qB status</span>;

  const percent = normalizeProgress(row.qbit.progress);
  return (
    <div className="grid gap-2 rounded-xl border border-slate-800 bg-slate-950/70 p-3">
      <div className="flex items-center justify-between gap-3 text-xs">
        <span className="font-medium text-slate-300">Download Progress</span>
        <span className="font-semibold text-cyan-100">{percent}%</span>
      </div>
      <div
        className="h-2 overflow-hidden rounded-full bg-slate-800"
        role="progressbar"
        aria-label={`${row.title ?? 'Episode'} download progress`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}>
        <div className="h-full rounded-full bg-cyan-400" style={{ width: `${Math.min(percent, 100)}%` }} />
      </div>
    </div>
  );
}

function MoveJobCell({
  row,
  onRetryMove,
  retrying,
}: {
  row: DownloadRow & { state: 'moveJob' };
  onRetryMove?: (hash: string) => void;
  retrying?: boolean;
}) {
  const toneClass =
    row.status === 'failed' ? 'text-rose-200' : row.status === 'moving' ? 'text-sky-100' : 'text-slate-300';
  const title =
    row.status === 'failed' ? 'Move Failed' : row.status === 'moving' ? 'Moving to Library' : 'Ready for Agent';
  const retryMove = row.status === 'failed' ? onRetryMove : undefined;

  return (
    <div className="grid gap-2 rounded-xl border border-slate-800 bg-slate-950/70 p-3">
      <div className="flex items-center justify-between gap-3 text-xs">
        <span className={`font-medium ${toneClass}`}>{title}</span>
        {retryMove ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-7 rounded-lg px-2 text-xs"
            disabled={retrying}
            onClick={() => retryMove(row.hash)}>
            <RotateCcw className={retrying ? 'mr-1.5 size-3.5 animate-spin' : 'mr-1.5 size-3.5'} />
            {retrying ? 'Retrying' : 'Retry move'}
          </Button>
        ) : (
          <span className="font-semibold text-slate-400">Attempt {row.attempts}</span>
        )}
      </div>
      <div className="text-xs text-slate-500">
        {row.status === 'moving'
          ? 'The library agent has claimed this episode.'
          : row.status === 'failed'
            ? 'The agent reported a transfer failure.'
            : 'Waiting for a library agent to claim it.'}
      </div>
    </div>
  );
}

function SeedingCell({ row }: { row: DownloadRow }) {
  if (row.qbitError) return <span className="text-rose-300">qB unavailable</span>;
  if (row.state === 'completed' && row.qbitRemovedAt) return <span className="text-slate-500">Cleaned</span>;
  if (!row.qbit) return <span className="text-slate-500">Moved</span>;

  const ratioPercent = normalizeProgress(row.qbit.ratio);
  return (
    <div className="grid gap-2 rounded-xl border border-slate-800 bg-slate-950/70 p-3">
      <div className="flex items-center justify-between gap-3 text-xs">
        <span className="font-medium text-slate-300">Seeding Ratio</span>
        <span className="font-semibold text-emerald-100">{formatRatio(row.qbit.ratio)}</span>
      </div>
      <div
        className="h-2 overflow-hidden rounded-full bg-slate-800"
        role="progressbar"
        aria-label={`${row.title ?? 'Episode'} seeding ratio`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.min(ratioPercent, 100)}>
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
        {row.state === 'completed'
          ? 'Moved and no longer tracked by qB'
          : row.state === 'moveJob'
            ? 'Available for library transfer'
            : 'Waiting for qB status'}
      </div>
    );

  const qbit = row.qbit;

  return (
    <div className="grid gap-2 text-xs sm:grid-cols-2">
      {isSeedingRow(row) ? (
        <>
          <Metric label="Time" value={formatDuration(qbit.seedingTime)} />
          <Metric label="Upload" value={`${formatBytes(qbit.uploadSpeed)}/s`} />
          <Metric label="Uploaded" value={formatBytes(qbit.totalUploaded)} />
        </>
      ) : row.state === 'active' ? (
        <>
          <Metric label="Download" value={`${formatBytes(qbit.downloadSpeed)}/s`} />
          <Metric label="Upload" value={`${formatBytes(qbit.uploadSpeed)}/s`} />
          <Metric label="ETA" value={formatEta(qbit.eta).replace(/^ETA\s*/, '')} />
        </>
      ) : (
        <>
          <Metric label="qB State" value={qbit.stateMessage || qbit.state} />
          <Metric label="Size" value={formatBytes(qbit.totalSize)} />
          <Metric label="Upload" value={`${formatBytes(qbit.uploadSpeed)}/s`} />
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
  if (row.state === 'moveJob') {
    if (row.status === 'failed') return 'Move failed';
    if (row.status === 'moving') return 'Moving';
    return 'Ready to move';
  }
  if (row.qbitRemovedAt) return 'Cleaned';
  if (row.qbit) return row.qbit.stateMessage || row.qbit.state || 'Seeding';
  return 'Moved';
}
