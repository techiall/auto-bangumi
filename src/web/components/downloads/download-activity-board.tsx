import { Archive, CheckCircle2, LoaderCircle, RefreshCcw, Send, ShieldAlert, Truck } from 'lucide-react';
import type { ReactNode } from 'react';
import { useState } from 'react';
import { Button } from '~/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card';
import { DownloadRecord, MovedHistoryRecord } from '~/components/downloads/download-record';
import { splitDownloadRows } from '~/components/downloads/download-model';
import { formatTime } from '~/components/downloads/download-format';
import { useI18n } from '~/lib/i18n';
import type { DownloadRow } from '~/components/downloads/download-types';

interface DownloadActivityBoardProps {
  rows: DownloadRow[];
  loading: boolean;
  error: string | null;
  lastUpdatedAt: Date | null;
  selectedSubscriptionTitle?: string;
  onRefresh: () => void;
  onRetryMove: (hash: string) => void;
  retryingMoveHashes: Set<string>;
}

export function DownloadActivityBoard({
  rows,
  loading,
  error,
  lastUpdatedAt,
  selectedSubscriptionTitle,
  onRefresh,
  onRetryMove,
  retryingMoveHashes,
}: DownloadActivityBoardProps) {
  const { locale, t } = useI18n();
  const [showHistory, setShowHistory] = useState(false);
  const { attentionRows, activeRows, moveJobRows, seedingRows, historyRows } = splitDownloadRows(rows);
  const hasActivityRows = rows.length > 0;

  return (
    <Card className="p-5">
      <CardHeader className="mb-5 flex-col sm:flex-row sm:items-start">
        <div className="min-w-0">
          <CardTitle>
            {selectedSubscriptionTitle
              ? t('downloads.activityFor', { title: selectedSubscriptionTitle })
              : t('downloads.activity')}
          </CardTitle>
          {lastUpdatedAt ? (
            <div className="mt-1 text-xs text-slate-500">
              {t('downloads.updatedAt', { time: formatTime(lastUpdatedAt, locale) })}
            </div>
          ) : null}
        </div>
        <Button variant="outline" size="sm" onClick={onRefresh} disabled={loading}>
          <RefreshCcw className={loading ? 'mr-2 size-4 animate-spin' : 'mr-2 size-4'} />
          {t('downloads.refresh')}
        </Button>
      </CardHeader>

      <CardContent className="grid gap-4">
        {error ? (
          <div className="rounded-xl border border-rose-900 bg-rose-950/70 px-4 py-3 text-sm text-rose-100">
            {error}
          </div>
        ) : null}

        {hasActivityRows ? (
          <>
            {attentionRows.length ? (
              <PrimarySection
                title={t('downloads.needsAttention')}
                icon={<ShieldAlert className="size-4" />}
                rows={attentionRows}
                tone="attention"
                onRetryMove={onRetryMove}
                retryingMoveHashes={retryingMoveHashes}
              />
            ) : null}

            {activeRows.length ? (
              <PrimarySection
                title={t('downloads.activeQueue')}
                icon={<LoaderCircle className={loading ? 'size-4 animate-spin' : 'size-4'} />}
                rows={activeRows}
                tone="active"
                onRetryMove={onRetryMove}
                retryingMoveHashes={retryingMoveHashes}
              />
            ) : null}

            {moveJobRows.length ? (
              <PrimarySection
                title={t('downloads.moveJobs')}
                icon={<Truck className="size-4" />}
                rows={moveJobRows}
                tone="move"
                onRetryMove={onRetryMove}
                retryingMoveHashes={retryingMoveHashes}
              />
            ) : null}

            {seedingRows.length ? (
              <PrimarySection
                title={t('downloads.seeding')}
                icon={<Send className="size-4" />}
                rows={seedingRows}
                tone="seeding"
                onRetryMove={onRetryMove}
                retryingMoveHashes={retryingMoveHashes}
              />
            ) : null}

            <section className="overflow-hidden rounded-2xl border border-dashed border-slate-800/90 bg-slate-950/28">
              <button
                type="button"
                aria-expanded={showHistory}
                className="flex w-full items-center justify-between gap-4 px-4 py-3 text-left transition-colors hover:bg-slate-900/40"
                onClick={() => setShowHistory((value) => !value)}>
                <span className="flex min-w-0 items-center gap-3">
                  <span className="grid size-8 shrink-0 place-items-center rounded-xl border border-slate-800 bg-slate-900/80 text-emerald-200">
                    <Archive className="size-4" />
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium text-slate-200">
                      {t('downloads.movedHistory')}
                    </span>
                    <span className="block truncate text-xs text-slate-500">
                      {t('downloads.movedTotal', { count: historyRows.length })}
                    </span>
                  </span>
                </span>
                <span className="shrink-0 text-xs font-medium text-slate-500">
                  {showHistory ? t('common.hide') : t('common.show')}
                </span>
              </button>

              {showHistory ? (
                <div className="border-t border-slate-800/80 bg-slate-950/36 p-3">
                  {historyRows.length ? (
                    <div className="max-h-[34rem] overflow-y-auto pr-1 [scrollbar-color:#334155_transparent]">
                      <div className="grid gap-2">
                        {historyRows.map((row) => (
                          <MovedHistoryRecord key={row.hash} row={row} />
                        ))}
                      </div>
                    </div>
                  ) : (
                    <EmptySection icon={<CheckCircle2 className="size-4" />} text={t('downloads.emptyHistory')} />
                  )}
                </div>
              ) : null}
            </section>
          </>
        ) : (
          <EmptyBoard loading={loading} />
        )}
      </CardContent>
    </Card>
  );
}

function PrimarySection({
  title,
  icon,
  rows,
  tone,
  onRetryMove,
  retryingMoveHashes,
}: {
  title: string;
  icon: ReactNode;
  rows: DownloadRow[];
  tone: 'attention' | 'active' | 'move' | 'seeding';
  onRetryMove: (hash: string) => void;
  retryingMoveHashes: Set<string>;
}) {
  const toneClass = {
    attention: 'text-amber-200',
    active: 'text-cyan-200',
    move: 'text-sky-200',
    seeding: 'text-emerald-200',
  }[tone];
  const retryMoveHandler = tone === 'attention' ? onRetryMove : undefined;

  return (
    <section className="grid gap-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm font-medium text-slate-300">
          <span className={toneClass}>{icon}</span>
          {title}
        </div>
        <div className="text-xs text-slate-500">{rows.length}</div>
      </div>

      <div
        className={
          (tone === 'active' || tone === 'move' || tone === 'seeding') && rows.length > 3
            ? 'max-h-[34rem] overflow-y-auto pr-1 [scrollbar-color:#334155_transparent]'
            : ''
        }>
        <div className="grid gap-3">
          {rows.map((row) => (
            <DownloadRecord
              key={row.hash}
              row={row}
              onRetryMove={retryMoveHandler}
              retrying={retryingMoveHashes.has(row.hash)}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

function EmptySection({ icon, text }: { icon: ReactNode; text: string }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-slate-800/80 bg-slate-950/36 px-4 py-5 text-sm text-slate-500">
      <span className="text-slate-600">{icon}</span>
      {text}
    </div>
  );
}

function EmptyBoard({ loading }: { loading: boolean }) {
  const { t } = useI18n();

  return (
    <div className="grid min-h-48 place-items-center rounded-2xl border border-dashed border-slate-800/90 bg-slate-950/32 px-6 py-10 text-center">
      <div className="grid max-w-md justify-items-center gap-3">
        <span className="grid size-11 place-items-center rounded-2xl border border-slate-800 bg-slate-900/70 text-cyan-200">
          {loading ? <LoaderCircle className="size-5 animate-spin" /> : <CheckCircle2 className="size-5" />}
        </span>
        <div>
          <div className="text-base font-semibold text-slate-200">{t('downloads.emptyBoardTitle')}</div>
          <div className="mt-1 text-sm leading-6 text-slate-500">{t('downloads.emptyBoardText')}</div>
        </div>
      </div>
    </div>
  );
}
