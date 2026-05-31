import { CurrentSubscriptions } from '~/components/subscription/current-subscriptions';
import { NoticeBanner } from '~/components/subscription/notice-banner';
import { SearchPanel } from '~/components/subscription/search-panel';
import { SubscriptionSettings } from '~/components/subscription/subscription-settings';
import type { SubscriptionDownloadSummary } from '~/components/downloads/download-types';
import type { useSubscriptionManager } from '~/components/subscription/use-subscription-manager';

interface SubscriptionsPageProps {
  downloadSummaries: ReadonlyMap<string, SubscriptionDownloadSummary>;
  manager: ReturnType<typeof useSubscriptionManager>;
  onViewDownloads: (subscriptionRss: string) => void;
}

export function SubscriptionsPage({ downloadSummaries, manager, onViewDownloads }: SubscriptionsPageProps) {
  return (
    <>
      {manager.notice && !manager.selectedBangumi ? <NoticeBanner notice={manager.notice} /> : null}

      <div className="grid min-w-0 gap-5 2xl:grid-cols-[minmax(0,1fr)_minmax(26rem,0.9fr)] 2xl:items-start">
        <SearchPanel
          query={manager.query}
          results={manager.results}
          selectedBangumiId={manager.selectedBangumi?.id}
          loadingBangumiId={manager.loadingBangumiId}
          isSearchLoading={manager.isSearchLoading}
          isBrowseLoading={manager.isBrowseLoading}
          settingsSlot={
            manager.selectedBangumi ? (
              <SubscriptionSettings
                bangumi={manager.selectedBangumi}
                selectedGroup={manager.selectedGroup}
                selectedGroupId={manager.selectedGroupId}
                form={manager.form}
                isSubmitting={manager.isSubmitting}
                notice={manager.notice}
                onGroupSelect={manager.setSelectedGroupId}
                onFormChange={manager.setForm}
                onSubmit={manager.handleSubmit}
                onCancel={manager.clearSelection}
              />
            ) : null
          }
          onQueryChange={manager.setQuery}
          onSearch={() => void manager.runSearch(manager.query)}
          onBrowse={() => void manager.runSearch('', 'browse')}
          onChoose={(item) => void manager.chooseBangumi(item)}
          onClearSelection={manager.clearSelection}
        />

        <div className="min-w-0 2xl:sticky 2xl:top-5">
          <CurrentSubscriptions
            subscriptions={manager.displayedSubscriptions}
            isLoading={manager.isConfigLoading}
            isRssRefreshing={manager.isRssRefreshing}
            pendingSubscriptionKeys={manager.pendingSubscriptionKeys}
            onReload={() => void manager.refreshConfig()}
            onRefreshRss={() => void manager.refreshRss()}
            onDelete={manager.handleDelete}
            onUpdate={manager.handleUpdate}
            downloadSummaries={downloadSummaries}
            onViewDownloads={onViewDownloads}
          />
        </div>
      </div>
    </>
  );
}
