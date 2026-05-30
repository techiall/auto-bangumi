import { createFileRoute } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { LoginPage } from '~/components/auth/login-page';
import { AppShell } from '~/components/dashboard/app-shell';
import type { PageTab } from '~/components/dashboard/page-tabs';
import { DownloadProgress } from '~/components/downloads/download-progress';
import { SubscriptionsPage } from '~/components/subscription/subscriptions-page';
import { AuthenticationError, fetchSession, logout } from '~/lib/api';

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
  const [authenticated, setAuthenticated] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [visitedTabs, setVisitedTabs] = useState<Set<PageTab>>(() => new Set([routeTab]));

  useEffect(() => {
    let disposed = false;

    fetchSession()
      .then(() => {
        if (!disposed) setAuthenticated(true);
      })
      .catch((caught) => {
        if (!disposed && !(caught instanceof AuthenticationError)) console.error(caught);
      })
      .finally(() => {
        if (!disposed) setCheckingSession(false);
      });

    return () => {
      disposed = true;
    };
  }, []);

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

  async function signOut() {
    await logout().catch(() => undefined);
    setAuthenticated(false);
  }

  if (checkingSession) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-sm text-slate-400">
        Checking session...
      </div>
    );
  }

  if (!authenticated) {
    return <LoginPage onAuthenticated={() => setAuthenticated(true)} />;
  }

  return (
    <AppShell activeTab={activeTab} onTabChange={setActiveTab} onLogout={() => void signOut()}>
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
