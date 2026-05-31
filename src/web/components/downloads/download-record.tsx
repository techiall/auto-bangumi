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
import { useI18n } from '~/lib/i18n';
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
  const { t } = useI18n();
  const qbit = row.qbit;
  const isCompleted = row.state === 'completed';
  const isSeeding = isSeedingRow(row);
  const season = row.season ?? 1;

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950/55 p-4 shadow-[0_18px_50px_rgba(2,6,23,0.22)] [contain-intrinsic-size:16rem] [content-visibility:auto]">
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(20rem,0.95fr)]">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={isCompleted ? 'outline' : 'muted'}>{statusLabel(row, t)}</Badge>
            <InfoPill label={t('downloads.episode')} value={`S${season}E${row.number}`} />
            {qbit ? <InfoPill label={t('downloads.size')} value={formatBytes(qbit.totalSize)} /> : null}
          </div>
          <div className="mt-3 truncate text-base font-semibold text-slate-50">
            {row.title ?? t('downloads.unknownTitle')}
          </div>
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
  const { locale, t } = useI18n();

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
          {row.targetPath ?? row.folder ?? t('downloads.moved')}
        </div>
      </div>
      <div className="shrink-0 text-xs text-slate-500 sm:text-right">{formatMovedAt(row.movedAt, locale)}</div>
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
  const { t } = useI18n();

  return (
    <div className="grid gap-1">
      <div className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-slate-600">
        {t('downloads.target')}
      </div>
      <div className="truncate text-slate-300" title={row.targetRelativePath}>
        {row.targetRelativePath}
      </div>
      {row.error ? <div className="mt-1 text-rose-300">{row.error}</div> : null}
    </div>
  );
}

function HashCell({ hash }: { hash: string }) {
  const { t } = useI18n();

  return (
    <div className="grid gap-1">
      <div className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-slate-600">
        {t('downloads.hash')}
      </div>
      <div className="break-all font-mono text-xs text-slate-400">{hash}</div>
    </div>
  );
}

function MovedCell({ row }: { row: DownloadRow & { state: 'completed' } }) {
  const { locale, t } = useI18n();

  return (
    <div className="min-w-0">
      <div className="truncate text-slate-300" title={row.targetPath ?? undefined}>
        {row.targetPath ?? t('downloads.movedFallback')}
      </div>
      <div className="mt-1 text-xs text-slate-500">
        {formatMovedAt(row.movedAt, locale)}
        {row.qbitRemovedAt ? ` · ${t('downloads.cleanedAt', { time: formatMovedAt(row.qbitRemovedAt, locale) })}` : ''}
      </div>
    </div>
  );
}

function ProgressCell({ row }: { row: DownloadRow & { state: 'active' } }) {
  const { t } = useI18n();

  if (row.qbitError) return <span className="text-rose-300">{t('downloads.qbUnavailable')}</span>;
  if (!row.qbit) return <span className="text-slate-500">{t('downloads.waitingForQbStatus')}</span>;

  const percent = normalizeProgress(row.qbit.progress);
  return (
    <div className="grid gap-2 rounded-xl border border-slate-800 bg-slate-950/70 p-3">
      <div className="flex items-center justify-between gap-3 text-xs">
        <span className="font-medium text-slate-300">{t('downloads.downloadProgress')}</span>
        <span className="font-semibold text-cyan-100">{percent}%</span>
      </div>
      <div
        className="h-2 overflow-hidden rounded-full bg-slate-800"
        role="progressbar"
        aria-label={t('downloads.downloadProgressLabel', { title: row.title ?? t('downloads.episode') })}
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
  const { t } = useI18n();
  const toneClass =
    row.status === 'failed' ? 'text-rose-200' : row.status === 'moving' ? 'text-sky-100' : 'text-slate-300';
  const title =
    row.status === 'failed'
      ? t('downloads.moveFailed')
      : row.status === 'moving'
        ? t('downloads.movingToLibrary')
        : t('downloads.readyForAgent');
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
            {retrying ? t('downloads.retrying') : t('downloads.retryMove')}
          </Button>
        ) : (
          <span className="font-semibold text-slate-400">{t('downloads.attempt', { count: row.attempts })}</span>
        )}
      </div>
      <div className="text-xs text-slate-500">
        {row.status === 'moving'
          ? t('downloads.libraryAgentClaimed')
          : row.status === 'failed'
            ? t('downloads.transferFailure')
            : t('downloads.waitingForAgent')}
      </div>
    </div>
  );
}

function SeedingCell({ row }: { row: DownloadRow }) {
  const { t } = useI18n();

  if (row.qbitError) return <span className="text-rose-300">{t('downloads.qbUnavailable')}</span>;
  if (row.state === 'completed' && row.qbitRemovedAt)
    return <span className="text-slate-500">{t('downloads.cleaned')}</span>;
  if (!row.qbit) return <span className="text-slate-500">{t('downloads.moved')}</span>;

  const ratioPercent = normalizeProgress(row.qbit.ratio);
  return (
    <div className="grid gap-2 rounded-xl border border-slate-800 bg-slate-950/70 p-3">
      <div className="flex items-center justify-between gap-3 text-xs">
        <span className="font-medium text-slate-300">{t('downloads.seedingRatio')}</span>
        <span className="font-semibold text-emerald-100">{formatRatio(row.qbit.ratio)}</span>
      </div>
      <div
        className="h-2 overflow-hidden rounded-full bg-slate-800"
        role="progressbar"
        aria-label={t('downloads.seedingRatioLabel', { title: row.title ?? t('downloads.episode') })}
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
  const { t } = useI18n();

  if (row.qbitError) return <div className="text-xs text-rose-300">{row.qbitError}</div>;
  if (!row.qbit)
    return (
      <div className="text-xs text-slate-500">
        {row.state === 'completed'
          ? t('downloads.movedAndUntracked')
          : row.state === 'moveJob'
            ? t('downloads.availableForTransfer')
            : t('downloads.waitingForQbStatus')}
      </div>
    );

  const qbit = row.qbit;

  return (
    <div className="grid gap-2 text-xs sm:grid-cols-2">
      {isSeedingRow(row) ? (
        <>
          <Metric label={t('downloads.time')} value={formatDuration(qbit.seedingTime)} />
          <Metric label={t('downloads.upload')} value={`${formatBytes(qbit.uploadSpeed)}/s`} />
          <Metric label={t('downloads.uploaded')} value={formatBytes(qbit.totalUploaded)} />
        </>
      ) : row.state === 'active' ? (
        <>
          <Metric label={t('downloads.download')} value={`${formatBytes(qbit.downloadSpeed)}/s`} />
          <Metric label={t('downloads.upload')} value={`${formatBytes(qbit.uploadSpeed)}/s`} />
          <Metric label={t('downloads.eta')} value={formatEta(qbit.eta)} />
        </>
      ) : (
        <>
          <Metric label={t('downloads.qbState')} value={qbit.stateMessage || qbit.state} />
          <Metric label={t('downloads.size')} value={formatBytes(qbit.totalSize)} />
          <Metric label={t('downloads.upload')} value={`${formatBytes(qbit.uploadSpeed)}/s`} />
        </>
      )}
      <Metric label={t('downloads.seeds')} value={`${qbit.connectedSeeds}/${qbit.totalSeeds}`} />
      <Metric label={t('downloads.peers')} value={`${qbit.connectedPeers}/${qbit.totalPeers}`} />
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

function statusLabel(row: DownloadRow, t: (key: string) => string) {
  if (row.state === 'active') return row.qbit?.stateMessage || row.qbit?.state || t('downloads.downloading');
  if (row.state === 'moveJob') {
    if (row.status === 'failed') return t('downloads.moveFailed');
    if (row.status === 'moving') return t('downloads.moving');
    return t('downloads.readyToMove');
  }
  if (row.qbitRemovedAt) return t('downloads.cleaned');
  if (row.qbit) return row.qbit.stateMessage || row.qbit.state || t('downloads.seeding');
  return t('downloads.moved');
}
