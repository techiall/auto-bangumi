import { Archive, CheckCircle2, LoaderCircle, RefreshCcw, Send, ShieldAlert, Truck } from 'lucide-react';
import type { ReactNode } from 'react';
import { useState } from 'react';
import { Button } from '~/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card';
import { DownloadRecord, MovedHistoryRecord } from '~/components/downloads/download-record';
import { splitDownloadRows } from '~/components/downloads/download-model';
import { formatTime } from '~/components/downloads/download-format';
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
  const [showHistory, setShowHistory] = useState(false);
  const { attentionRows, activeRows, moveJobRows, seedingRows, historyRows } = splitDownloadRows(rows);

  return (
    <Card className="p-5">
      <CardHeader className="mb-5 flex-col sm:flex-row sm:items-start">
        <div className="min-w-0">
          <CardTitle>
            {selectedSubscriptionTitle ? `${selectedSubscriptionTitle} Activity` : 'Download Activity'}
          </CardTitle>
          {lastUpdatedAt ? (
            <div className="mt-1 text-xs text-slate-500">Updated at {formatTime(lastUpdatedAt)}</div>
          ) : null}
        </div>
        <Button variant="outline" size="sm" onClick={onRefresh} disabled={loading}>
          <RefreshCcw className={loading ? 'mr-2 size-4 animate-spin' : 'mr-2 size-4'} />
          Refresh
        </Button>
      </CardHeader>

      <CardContent className="grid gap-4">
        {error ? (
          <div className="rounded-xl border border-rose-900 bg-rose-950/70 px-4 py-3 text-sm text-rose-100">
            {error}
          </div>
        ) : null}

        <PrimarySection
          title="Needs Attention"
          icon={<ShieldAlert className="size-4" />}
          rows={attentionRows}
          emptyText="No problems need your attention."
          tone="attention"
          onRetryMove={onRetryMove}
          retryingMoveHashes={retryingMoveHashes}
        />

        <PrimarySection
          title="Active Queue"
          icon={<LoaderCircle className={loading ? 'size-4 animate-spin' : 'size-4'} />}
          rows={activeRows}
          emptyText="No active downloads right now."
          tone="active"
          onRetryMove={onRetryMove}
          retryingMoveHashes={retryingMoveHashes}
        />

        <PrimarySection
          title="Move Jobs"
          icon={<Truck className="size-4" />}
          rows={moveJobRows}
          emptyText="No files are being moved right now."
          tone="move"
          onRetryMove={onRetryMove}
          retryingMoveHashes={retryingMoveHashes}
        />

        <PrimarySection
          title="Seeding"
          icon={<Send className="size-4" />}
          rows={seedingRows}
          emptyText="No qB seeding episodes right now."
          tone="seeding"
          onRetryMove={onRetryMove}
          retryingMoveHashes={retryingMoveHashes}
        />

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
                <span className="block truncate text-sm font-medium text-slate-200">Moved History</span>
                <span className="block truncate text-xs text-slate-500">{historyRows.length} moved total</span>
              </span>
            </span>
            <span className="shrink-0 text-xs font-medium text-slate-500">{showHistory ? 'Hide' : 'Show all'}</span>
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
                <EmptySection icon={<CheckCircle2 className="size-4" />} text="No moved episodes yet." />
              )}
            </div>
          ) : null}
        </section>
      </CardContent>
    </Card>
  );
}

function PrimarySection({
  title,
  icon,
  rows,
  emptyText,
  tone,
  onRetryMove,
  retryingMoveHashes,
}: {
  title: string;
  icon: ReactNode;
  rows: DownloadRow[];
  emptyText: string;
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

      {rows.length ? (
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
      ) : (
        <EmptySection icon={icon} text={emptyText} />
      )}
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
