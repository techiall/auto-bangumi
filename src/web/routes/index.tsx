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
  const navigate = Route.useNavigate();
  const routeTab = search.tab ?? 'subscriptions';
  const [activeTab, setActiveTabState] = useState<PageTab>(routeTab);
  const [visitedTabs, setVisitedTabs] = useState<Set<PageTab>>(() => new Set([routeTab]));

  useEffect(() => {
    setActiveTabState(routeTab);
    setVisitedTabs((current) => new Set(current).add(routeTab));
  }, [routeTab]);

  const setActiveTab = (tab: PageTab) => {
    if (tab === activeTab) return;

    setActiveTabState(tab);
    setVisitedTabs((current) => new Set(current).add(tab));
    void navigate({
      to: '/',
      search: tab === 'subscriptions' ? {} : { tab },
      replace: true,
    });
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
