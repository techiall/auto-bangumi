import { createFileRoute } from '@tanstack/react-router';
import { PageTabs, type PageTab } from '~/components/dashboard/page-tabs';
import { DownloadProgress } from '~/components/downloads/download-progress';
import { CurrentSubscriptions } from '~/components/subscription/current-subscriptions';
import { PageHero } from '~/components/subscription/page-hero';
import { SearchPanel } from '~/components/subscription/search-panel';
import { SubscriptionSettings } from '~/components/subscription/subscription-settings';
import { useSubscriptionManager } from '~/components/subscription/use-subscription-manager';
import { cn } from '~/lib/utils';

export const Route = createFileRoute('/')({
  validateSearch: (search: Record<string, unknown>): { tab?: PageTab } => ({
    tab: search.tab === 'downloads' || search.tab === 'subscriptions' ? search.tab : undefined,
  }),
  component: HomePage,
});

function HomePage() {
  const navigate = Route.useNavigate();
  const search = Route.useSearch();
  const activeTab = search.tab ?? 'subscriptions';
  const subscriptions = useSubscriptionManager();
  const setActiveTab = (tab: PageTab) => {
    void navigate({
      search: tab === 'subscriptions' ? {} : { tab },
      replace: true,
    });
  };

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#020617,#0f172a_48%,#111827)]">
      <main className="mx-auto flex w-full max-w-7xl flex-col gap-5 px-4 py-6 md:px-6">
        <PageHero />
        <PageTabs activeTab={activeTab} onChange={setActiveTab} />

        {activeTab === 'subscriptions' ? (
          <>
            {subscriptions.notice && !subscriptions.selectedBangumi ? (
              <div
                className={cn(
                  'rounded-xl border px-4 py-3 text-sm',
                  subscriptions.notice.kind === 'error'
                    ? 'border-rose-900 bg-rose-950/70 text-rose-100'
                    : 'border-cyan-900 bg-cyan-950/70 text-cyan-100',
                )}>
                {subscriptions.notice.message}
              </div>
            ) : null}

            <div className="grid gap-5 xl:grid-cols-[minmax(0,1.08fr)_minmax(25rem,0.92fr)] xl:items-start">
              <SearchPanel
                query={subscriptions.query}
                results={subscriptions.results}
                selectedBangumiId={subscriptions.selectedBangumi?.id}
                loadingBangumiId={subscriptions.loadingBangumiId}
                isSearchLoading={subscriptions.isSearchLoading}
                isBrowseLoading={subscriptions.isBrowseLoading}
                settingsSlot={
                  subscriptions.selectedBangumi ? (
                    <SubscriptionSettings
                      bangumi={subscriptions.selectedBangumi}
                      selectedGroup={subscriptions.selectedGroup}
                      selectedGroupId={subscriptions.selectedGroupId}
                      form={subscriptions.form}
                      isSubmitting={subscriptions.isSubmitting}
                      notice={subscriptions.notice}
                      onGroupSelect={subscriptions.setSelectedGroupId}
                      onFormChange={subscriptions.setForm}
                      onSubmit={(event) => void subscriptions.handleSubmit(event)}
                    />
                  ) : null
                }
                onQueryChange={subscriptions.setQuery}
                onSearch={() => void subscriptions.runSearch(subscriptions.query)}
                onBrowse={() => void subscriptions.runSearch('', 'browse')}
                onChoose={(item) => void subscriptions.chooseBangumi(item)}
              />

              <div className="grid gap-5 xl:sticky xl:top-5">
                <div className="hidden xl:block">
                  <CurrentSubscriptions
                    subscriptions={subscriptions.displayedSubscriptions}
                    isLoading={subscriptions.isConfigLoading}
                    onRefresh={() => void subscriptions.refreshConfig()}
                    onDelete={(index) => void subscriptions.handleDelete(index)}
                    onUpdate={(index, payload) => void subscriptions.handleUpdate(index, payload)}
                  />
                </div>
              </div>
            </div>

            <div className="xl:hidden">
              <CurrentSubscriptions
                subscriptions={subscriptions.displayedSubscriptions}
                isLoading={subscriptions.isConfigLoading}
                onRefresh={() => void subscriptions.refreshConfig()}
                onDelete={(index) => void subscriptions.handleDelete(index)}
                onUpdate={(index, payload) => void subscriptions.handleUpdate(index, payload)}
              />
            </div>
          </>
        ) : (
          <DownloadProgress />
        )}
      </main>
    </div>
  );
}
