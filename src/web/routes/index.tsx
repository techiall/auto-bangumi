import { createFileRoute } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { AppShell } from '~/components/dashboard/app-shell';
import type { PageTab } from '~/components/dashboard/page-tabs';
import { DownloadProgress } from '~/components/downloads/download-progress';
import { SubscriptionsPage } from '~/components/subscription/subscriptions-page';

export const Route = createFileRoute('/')({
  validateSearch: (search: Record<string, unknown>): { tab?: PageTab } => ({
    tab: search.tab === 'downloads' || search.tab === 'subscriptions' ? search.tab : undefined,
  }),
  component: HomePage,
});

function HomePage() {
  const search = Route.useSearch();
  const routeTab = search.tab ?? 'subscriptions';
  const [activeTab, setActiveTabState] = useState<PageTab>(routeTab);
  const [visitedTabs, setVisitedTabs] = useState<Set<PageTab>>(() => new Set([routeTab]));

  useEffect(() => {
    setActiveTabState(routeTab);
    setVisitedTabs((current) => new Set(current).add(routeTab));
  }, [routeTab]);

  useEffect(() => {
    const syncFromLocation = () => setActiveTabState(getTabFromLocation());
    window.addEventListener('popstate', syncFromLocation);
    return () => window.removeEventListener('popstate', syncFromLocation);
  }, []);

  const setActiveTab = (tab: PageTab) => {
    if (tab === activeTab) return;

    setActiveTabState(tab);
    setVisitedTabs((current) => new Set(current).add(tab));
    window.history.replaceState(null, '', tab === 'subscriptions' ? '/' : '/?tab=downloads');
  };

  return (
    <AppShell activeTab={activeTab} onTabChange={setActiveTab}>
      {visitedTabs.has('subscriptions') ? (
        <div hidden={activeTab !== 'subscriptions'}>
          <SubscriptionsPage />
        </div>
      ) : null}
      {visitedTabs.has('downloads') ? (
        <div hidden={activeTab !== 'downloads'}>
          <DownloadProgress active={activeTab === 'downloads'} />
        </div>
      ) : null}
    </AppShell>
  );
}

function getTabFromLocation(): PageTab {
  return new URLSearchParams(window.location.search).get('tab') === 'downloads' ? 'downloads' : 'subscriptions';
}
