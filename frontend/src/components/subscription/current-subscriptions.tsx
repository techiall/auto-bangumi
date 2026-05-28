import { Check, Layers3, LoaderCircle, RefreshCcw, Trash2, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Button } from '~/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card';
import { Input } from '~/components/ui/input';
import { Field, StateBox } from '~/components/subscription/shared';
import { inferMikanBangumiUrl, splitCommaList } from '~/lib/subscription';
import type { SubscriptionConfig } from '~/types';

interface CurrentSubscriptionsProps {
  subscriptions: Array<{ subscription: SubscriptionConfig; index: number }>;
  isLoading: boolean;
  onRefresh: () => void;
  onDelete: (index: number) => void;
  onUpdate: (index: number, payload: { folder: string; season: number; filters: string[] }) => void;
}

export function CurrentSubscriptions({
  subscriptions,
  isLoading,
  onRefresh,
  onDelete,
  onUpdate,
}: CurrentSubscriptionsProps) {
  return (
    <Card className="p-5">
      <CardHeader className="mb-5">
        <CardTitle>当前订阅</CardTitle>
        <Button variant="outline" size="sm" onClick={onRefresh}>
          <RefreshCcw className="mr-2 size-4" />
          刷新
        </Button>
      </CardHeader>
      <CardContent className="grid gap-3">
        {isLoading ? (
          <StateBox icon={<LoaderCircle className="size-4 animate-spin" />} text="正在读取配置..." />
        ) : !subscriptions.length ? (
          <StateBox icon={<Layers3 className="size-4" />} text="当前还没有订阅。" />
        ) : (
          subscriptions.map(({ subscription, index }) => (
            <SubscriptionCard
              key={`${subscription.rss}-${index}`}
              subscription={subscription}
              index={index}
              onDelete={onDelete}
              onUpdate={onUpdate}
            />
          ))
        )}
      </CardContent>
    </Card>
  );
}

function SubscriptionCard({
  subscription,
  index,
  onDelete,
  onUpdate,
}: {
  subscription: SubscriptionConfig;
  index: number;
  onDelete: (index: number) => void;
  onUpdate: (index: number, payload: { folder: string; season: number; filters: string[] }) => void;
}) {
  const mikanUrl = inferMikanBangumiUrl(subscription.rss);
  const [expanded, setExpanded] = useState(false);
  const [folder, setFolder] = useState(subscription.folder);
  const [season, setSeason] = useState(String(subscription.season));
  const [filters, setFilters] = useState(subscription.filters?.join(', ') ?? '');

  useEffect(() => {
    setFolder(subscription.folder);
    setSeason(String(subscription.season));
    setFilters(subscription.filters?.join(', ') ?? '');
  }, [subscription.filters, subscription.folder, subscription.season]);

  function resetForm() {
    setFolder(subscription.folder);
    setSeason(String(subscription.season));
    setFilters(subscription.filters?.join(', ') ?? '');
  }

  function save() {
    const nextSeason = Number(season);
    if (!Number.isInteger(nextSeason) || nextSeason <= 0) return;

    onUpdate(index, {
      folder: folder.trim() || subscription.title,
      season: nextSeason,
      filters: splitCommaList(filters),
    });
    setExpanded(false);
  }

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4 transition-colors hover:border-slate-700">
      <div
        role="button"
        tabIndex={0}
        className="grid cursor-pointer gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start"
        onClick={() => setExpanded((value) => !value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            setExpanded((value) => !value);
          }
        }}>
        <div className="min-w-0 space-y-2">
          <div className="flex min-w-0 items-center gap-2">
            {mikanUrl ? (
              <a
                href={mikanUrl}
                target="_blank"
                rel="noreferrer"
                onClick={(event) => event.stopPropagation()}
                className="min-w-0 truncate font-medium text-slate-100 underline decoration-slate-700 underline-offset-4 transition-colors hover:text-cyan-200 hover:decoration-cyan-400">
                <span className="truncate">{subscription.title}</span>
              </a>
            ) : (
              <div className="min-w-0 truncate font-medium text-slate-100">{subscription.title}</div>
            )}
            <a
              href={subscription.rss}
              target="_blank"
              rel="noreferrer"
              onClick={(event) => event.stopPropagation()}
              className="shrink-0 rounded-full border border-cyan-800 bg-cyan-950/70 px-2.5 py-0.5 text-xs font-semibold text-cyan-200 transition-colors hover:border-cyan-500 hover:bg-cyan-900 hover:text-cyan-50">
              RSS
            </a>
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-400">
            <span>
              <span className="text-slate-500">Season</span>{' '}
              <span className="font-medium text-slate-200">{subscription.season}</span>
            </span>
            <span>
              <span className="text-slate-500">文件夹</span>{' '}
              <span className="font-medium text-slate-200">{subscription.folder}</span>
            </span>
            {subscription.filters?.length ? (
              <span>
                <span className="text-slate-500">过滤</span>{' '}
                <span className="font-medium text-slate-200">{subscription.filters.join(' / ')}</span>
              </span>
            ) : null}
          </div>
        </div>

        <div className="flex flex-wrap gap-2 sm:justify-end">
          <Button
            variant="danger"
            size="sm"
            className="w-fit whitespace-nowrap"
            onClick={(event) => {
              event.stopPropagation();
              onDelete(index);
            }}>
            <Trash2 className="mr-2 size-4" />
            删除
          </Button>
        </div>
      </div>
      {expanded ? (
        <div
          className="mt-4 rounded-xl border border-slate-800 bg-slate-950/70 p-3"
          onClick={(event) => event.stopPropagation()}>
          <div className="grid gap-3 md:grid-cols-[7rem_1fr]">
            <Field label="季数">
              <Input type="number" min="1" value={season} onChange={(event) => setSeason(event.target.value)} />
            </Field>
            <Field label="文件夹">
              <Input value={folder} onChange={(event) => setFolder(event.target.value)} />
            </Field>
            <Field label="标题过滤">
              <Input
                value={filters}
                onChange={(event) => setFilters(event.target.value)}
                placeholder="例如 1080p, 简中"
              />
            </Field>
          </div>
          <div className="mt-3 flex flex-wrap justify-end gap-2">
            <Button variant="soft" size="sm" className="w-fit whitespace-nowrap" onClick={save}>
              <Check className="mr-2 size-4" />
              保存
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="w-fit whitespace-nowrap"
              onClick={() => {
                resetForm();
                setExpanded(false);
              }}>
              <X className="mr-2 size-4" />
              取消
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
