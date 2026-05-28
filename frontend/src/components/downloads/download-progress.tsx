import { CheckCircle2, Clock3, Database, LoaderCircle, RefreshCcw } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Badge } from '~/components/ui/badge';
import { Button } from '~/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card';
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
  const activeSpeed = Object.values(data.active).reduce((sum, item) => sum + (item.qbit?.downloadSpeed ?? 0), 0);

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
      <div className="grid gap-4 md:grid-cols-3">
        <SummaryCard label="活跃记录" value={activeCount} icon={loading ? LoaderCircle : Clock3} spinning={loading} />
        <SummaryCard label="实时速度" value={formatBytes(activeSpeed) + '/s'} icon={Database} />
        <SummaryCard label="已完成" value={completedCount} icon={CheckCircle2} />
      </div>

      <Card className="p-5">
        <CardHeader className="mb-5">
          <div>
            <CardTitle>下载记录</CardTitle>
            {lastUpdatedAt ? (
              <div className="mt-1 text-xs text-slate-500">更新于 {formatTime(lastUpdatedAt)}</div>
            ) : null}
          </div>
          <Button variant="outline" size="sm" onClick={() => void refresh()} disabled={loading}>
            <RefreshCcw className={loading ? 'mr-2 size-4 animate-spin' : 'mr-2 size-4'} />
            刷新
          </Button>
        </CardHeader>
        <CardContent>
          {error ? (
            <div className="rounded-xl border border-rose-900 bg-rose-950/70 px-4 py-3 text-sm text-rose-100">
              {error}
            </div>
          ) : rows.length ? (
            <div className="overflow-hidden rounded-2xl border border-slate-800">
              <div className="grid grid-cols-[minmax(0,1.15fr)_6rem_7rem_minmax(9rem,0.8fr)_minmax(0,1.1fr)] gap-3 bg-slate-900/80 px-4 py-3 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                <div>番组</div>
                <div>集数</div>
                <div>状态</div>
                <div>进度</div>
                <div>位置 / 时间</div>
              </div>
              <div className="max-h-[calc(100vh-19rem)] overflow-y-auto">
                {rows.map((row) => (
                  <DownloadRecord key={row.hash} row={row} />
                ))}
              </div>
            </div>
          ) : (
            <div className="grid place-items-center rounded-2xl border border-dashed border-slate-800 px-4 py-16 text-center">
              <div className="text-sm font-medium text-slate-200">db.json 暂无下载记录</div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  icon: Icon,
  spinning = false,
}: {
  label: string;
  value: number | string;
  icon: typeof Clock3;
  spinning?: boolean;
}) {
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="text-sm text-slate-400">{label}</div>
          <div className="mt-2 text-3xl font-semibold text-slate-50">{value}</div>
        </div>
        <div className="rounded-2xl bg-slate-900 p-3 text-cyan-200">
          <Icon className={spinning ? 'size-5 animate-spin' : 'size-5'} />
        </div>
      </div>
    </Card>
  );
}

function DownloadRecord({ row }: { row: DownloadRow }) {
  return (
    <div className="grid grid-cols-[minmax(0,1.15fr)_6rem_7rem_minmax(9rem,0.8fr)_minmax(0,1.1fr)] gap-3 border-t border-slate-800 px-4 py-3 text-sm">
      <div className="min-w-0">
        <div className="truncate font-medium text-slate-100">{row.title}</div>
        {row.folder ? <div className="mt-1 truncate text-xs text-slate-500">{row.folder}</div> : null}
      </div>
      <div className="text-slate-300">
        S{row.season}E{row.number}
      </div>
      <div>
        <Badge variant={row.state === 'active' ? 'muted' : 'outline'}>
          {row.state === 'active' ? row.qbit?.stateMessage || row.qbit?.state || '活跃' : '完成'}
        </Badge>
      </div>
      <div>{row.state === 'active' ? <ProgressCell row={row} /> : <span className="text-slate-500">100%</span>}</div>
      <div className="min-w-0">{row.state === 'completed' ? <MovedCell row={row} /> : formatActiveMeta(row)}</div>
    </div>
  );
}

function MovedCell({ row }: { row: DownloadRow & { state: 'completed' } }) {
  return (
    <div className="min-w-0">
      <div className="truncate text-slate-300" title={row.targetPath ?? undefined}>
        {row.targetPath ?? '已移动，未记录路径'}
      </div>
      <div className="mt-1 text-xs text-slate-500">
        {formatMovedAt(row.movedAt)}
        {row.qbitRemovedAt ? ` · qB 已清理 ${formatMovedAt(row.qbitRemovedAt)}` : ''}
      </div>
    </div>
  );
}

function ProgressCell({ row }: { row: DownloadRow & { state: 'active' } }) {
  if (row.qbitError) return <span className="text-rose-300">qB 不可用</span>;
  if (!row.qbit) return <span className="text-slate-500">未找到</span>;

  const percent = normalizeProgress(row.qbit.progress);
  return (
    <div className="grid gap-1">
      <div className="h-2 overflow-hidden rounded-full bg-slate-800">
        <div className="h-full rounded-full bg-cyan-400" style={{ width: `${Math.min(percent, 100)}%` }} />
      </div>
      <div className="text-xs text-slate-500">{percent}%</div>
    </div>
  );
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

function formatMovedAt(value: string) {
  if (!value || value === new Date(0).toISOString()) return '-';
  return new Intl.DateTimeFormat('zh-CN', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(value));
}

function formatTime(value: Date) {
  return new Intl.DateTimeFormat('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(value);
}

function normalizeProgress(value: number) {
  if (!Number.isFinite(value)) return 0;
  const percent = value <= 1 ? value * 100 : value;
  return Math.max(0, Math.min(100, Math.round(percent)));
}

function formatActiveMeta(row: DownloadRow & { state: 'active' }) {
  if (row.qbitError) return row.qbitError;
  if (!row.qbit) return row.hash;

  const speed = formatBytes(row.qbit.downloadSpeed) + '/s';
  const eta = formatEta(row.qbit.eta);
  return `${speed}${eta ? ` · ${eta}` : ''}`;
}

function formatBytes(value: number) {
  if (!Number.isFinite(value) || value <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let next = value;
  let index = 0;
  while (next >= 1024 && index < units.length - 1) {
    next /= 1024;
    index += 1;
  }
  return `${next >= 10 || index === 0 ? next.toFixed(0) : next.toFixed(1)} ${units[index]}`;
}

function formatEta(value: number) {
  if (!Number.isFinite(value) || value <= 0 || value >= 8640000) return '';
  const hours = Math.floor(value / 3600);
  const minutes = Math.floor((value % 3600) / 60);
  if (hours > 0) return `剩余 ${hours}h ${minutes}m`;
  return `剩余 ${minutes}m`;
}
