import { Archive, ChevronDown, Layers3, LoaderCircle, RefreshCcw, Rss, Search } from 'lucide-react';
import { useDeferredValue, useMemo, useState } from 'react';
import { Button } from '~/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card';
import { Input } from '~/components/ui/input';
import { StateBox } from '~/components/subscription/shared';
import { SubscriptionCard } from '~/components/subscription/subscription-card';
import type { SubscriptionDownloadSummary } from '~/components/downloads/download-types';
import { useI18n } from '~/lib/i18n';
import type { SubscriptionConfig, UpdateSeasonPayload } from '~/types';

interface CurrentSubscriptionsProps {
  subscriptions: Array<{ subscription: SubscriptionConfig; key: string }>;
  isLoading: boolean;
  isRssRefreshing: boolean;
  pendingSubscriptionKeys: Set<string>;
  downloadSummaries: ReadonlyMap<string, SubscriptionDownloadSummary>;
  onReload: () => void;
  onRefreshRss: () => void;
  onDelete: (subscriptionKey: string) => void;
  onUpdate: (subscriptionKey: string, payload: UpdateSeasonPayload) => void;
  onViewDownloads: (subscriptionKey: string) => void;
}

export function CurrentSubscriptions({
  subscriptions,
  isLoading,
  isRssRefreshing,
  pendingSubscriptionKeys,
  downloadSummaries,
  onReload,
  onRefreshRss,
  onDelete,
  onUpdate,
  onViewDownloads,
}: CurrentSubscriptionsProps) {
  const { t } = useI18n();
  const [filter, setFilter] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  const deferredFilter = useDeferredValue(filter);
  const filteredSubscriptions = useMemo(
    () => filterSubscriptions(subscriptions, deferredFilter, t('common.archived')),
    [deferredFilter, subscriptions, t],
  );
  const archivedCount = subscriptions.filter(({ subscription }) => subscription.archived).length;
  const activeCount = subscriptions.length - archivedCount;

  return (
    <Card className="p-4 md:p-5">
      <CardHeader className="mb-5 flex-col sm:flex-row sm:items-start">
        <div className="min-w-0">
          <CardTitle>{t('subscriptions.current')}</CardTitle>
          <div className="mt-1 text-sm text-slate-500">
            {t('subscriptions.activeArchivedSummary', { active: activeCount, archived: archivedCount })}
          </div>
        </div>
        <div className="flex w-full flex-wrap gap-2 sm:w-auto sm:justify-end">
          <Button variant="ghost" size="sm" onClick={onReload} disabled={isLoading}>
            <RefreshCcw className={isLoading ? 'mr-2 size-4 animate-spin' : 'mr-2 size-4'} />
            {t('common.reload')}
          </Button>
          <Button variant="default" size="sm" onClick={onRefreshRss} disabled={isRssRefreshing}>
            {isRssRefreshing ? <LoaderCircle className="mr-2 size-4 animate-spin" /> : <Rss className="mr-2 size-4" />}
            {t('subscriptions.refreshRss')}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="grid gap-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-500" />
          <Input
            value={filter}
            onChange={(event) => setFilter(event.target.value)}
            placeholder={t('subscriptions.filter')}
            className="pl-9"
          />
        </div>

        <SubscriptionListState
          subscriptions={subscriptions}
          filteredSubscriptions={filteredSubscriptions}
          isLoading={isLoading}
          showArchived={showArchived}
          onToggleArchived={() => setShowArchived((value) => !value)}
          pendingSubscriptionKeys={pendingSubscriptionKeys}
          downloadSummaries={downloadSummaries}
          onDelete={onDelete}
          onUpdate={onUpdate}
          onViewDownloads={onViewDownloads}
        />
      </CardContent>
    </Card>
  );
}

function SubscriptionListState({
  subscriptions,
  filteredSubscriptions,
  isLoading,
  showArchived,
  pendingSubscriptionKeys,
  downloadSummaries,
  onToggleArchived,
  onDelete,
  onUpdate,
  onViewDownloads,
}: {
  subscriptions: Array<{ subscription: SubscriptionConfig; key: string }>;
  filteredSubscriptions: Array<{ subscription: SubscriptionConfig; key: string }>;
  isLoading: boolean;
  showArchived: boolean;
  pendingSubscriptionKeys: Set<string>;
  downloadSummaries: ReadonlyMap<string, SubscriptionDownloadSummary>;
  onToggleArchived: () => void;
  onDelete: (subscriptionKey: string) => void;
  onUpdate: (subscriptionKey: string, payload: UpdateSeasonPayload) => void;
  onViewDownloads: (subscriptionKey: string) => void;
}) {
  const { t } = useI18n();

  if (isLoading)
    return <StateBox icon={<LoaderCircle className="size-4 animate-spin" />} text={t('subscriptions.loadingConfig')} />;
  if (!subscriptions.length)
    return <StateBox icon={<Layers3 className="size-4" />} text={t('subscriptions.noSubscriptions')} />;
  if (!filteredSubscriptions.length)
    return <StateBox icon={<Search className="size-4" />} text={t('subscriptions.noMatching')} />;

  const activeSubscriptions = filteredSubscriptions.filter(({ subscription }) => !subscription.archived);
  const archivedSubscriptions = filteredSubscriptions.filter(({ subscription }) => subscription.archived);

  return (
    <>
      {activeSubscriptions.length ? (
        activeSubscriptions.map(({ subscription, key }) => (
          <SubscriptionCard
            key={key}
            subscription={subscription}
            subscriptionKey={key}
            isPending={pendingSubscriptionKeys.has(key)}
            downloadSummary={downloadSummaries.get(key)}
            onDelete={onDelete}
            onUpdate={onUpdate}
            onViewDownloads={onViewDownloads}
          />
        ))
      ) : (
        <StateBox icon={<Search className="size-4" />} text={t('subscriptions.noActiveMatch')} />
      )}

      {archivedSubscriptions.length ? (
        <div className="mt-3 overflow-hidden rounded-2xl border border-dashed border-slate-800/90 bg-slate-950/28">
          <button
            type="button"
            aria-expanded={showArchived}
            className="group flex w-full items-center justify-between gap-4 px-4 py-3 text-left transition-colors hover:bg-slate-900/40"
            onClick={onToggleArchived}>
            <span className="flex min-w-0 items-center gap-3">
              <span className="grid size-8 shrink-0 place-items-center rounded-xl border border-slate-800 bg-slate-900/80 text-amber-200">
                <Archive className="size-4" />
              </span>
              <span className="min-w-0">
                <span className="block truncate text-sm font-medium text-slate-200">{t('common.archived')}</span>
                <span className="block truncate text-xs text-slate-500">
                  {t('subscriptions.hiddenFromRss', { count: archivedSubscriptions.length })}
                </span>
              </span>
            </span>
            <span className="flex shrink-0 items-center gap-2 text-xs font-medium text-slate-500 group-hover:text-slate-300">
              {showArchived ? t('common.hide') : t('common.show')}
              <ChevronDown className={`size-4 transition-transform ${showArchived ? 'rotate-180' : ''}`} />
            </span>
          </button>

          {showArchived ? (
            <div className="grid gap-3 border-t border-slate-800/80 bg-slate-950/36 p-3">
              {archivedSubscriptions.map(({ subscription, key }) => (
                <SubscriptionCard
                  key={key}
                  subscription={subscription}
                  subscriptionKey={key}
                  isPending={pendingSubscriptionKeys.has(key)}
                  downloadSummary={downloadSummaries.get(key)}
                  onDelete={onDelete}
                  onUpdate={onUpdate}
                  onViewDownloads={onViewDownloads}
                />
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
    </>
  );
}

function filterSubscriptions(
  subscriptions: Array<{ subscription: SubscriptionConfig; key: string }>,
  filter: string,
  archivedKeyword: string,
) {
  const keyword = filter.trim().toLowerCase();
  if (!keyword) return subscriptions;

  return subscriptions.filter(({ subscription }) =>
    [
      subscription.title,
      subscription.folder,
      subscription.rss,
      subscription.archived ? archivedKeyword : '',
      subscription.filters?.join(' '),
    ]
      .filter(Boolean)
      .some((value) => value?.toLowerCase().includes(keyword)),
  );
}
