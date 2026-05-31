import { createFileRoute } from '@tanstack/react-router';
import { useEffect, useMemo, useState } from 'react';
import { LoginPage } from '~/components/auth/login-page';
import { AppShell } from '~/components/dashboard/app-shell';
import type { PageTab } from '~/components/dashboard/page-tabs';
import { DownloadProgress } from '~/components/downloads/download-progress';
import { buildDownloadRows, buildSubscriptionDownloadSummaries } from '~/components/downloads/download-model';
import { useDownloadState } from '~/components/downloads/use-download-state';
import { SubscriptionsPage } from '~/components/subscription/subscriptions-page';
import { useSubscriptionManager } from '~/components/subscription/use-subscription-manager';
import { AuthenticationError, fetchSession, logout } from '~/lib/api';
import { useI18n } from '~/lib/i18n';

export const Route = createFileRoute('/')({
  validateSearch: (search: Record<string, unknown>): { tab?: PageTab; subscription?: string } => ({
    tab: search.tab === 'downloads' || search.tab === 'subscriptions' ? search.tab : undefined,
    subscription: typeof search.subscription === 'string' && search.subscription ? search.subscription : undefined,
  }),
  component: HomePage,
});

function HomePage() {
  const { t } = useI18n();
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const routeTab = search.tab ?? 'subscriptions';
  const [activeTab, setActiveTabState] = useState<PageTab>(routeTab);
  const [authenticated, setAuthenticated] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [visitedTabs, setVisitedTabs] = useState<Set<PageTab>>(() => new Set([routeTab]));
  const subscriptionManager = useSubscriptionManager(authenticated);
  const downloads = useDownloadState(authenticated);
  const downloadRows = useMemo(() => buildDownloadRows(downloads.data), [downloads.data]);
  const downloadSummaries = useMemo(
    () => buildSubscriptionDownloadSummaries(subscriptionManager.subscriptions, downloadRows),
    [downloadRows, subscriptionManager.subscriptions],
  );

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

  useEffect(() => {
    if (!search.subscription || !subscriptionManager.subscriptions.length) return;
    if (subscriptionManager.subscriptions.some((subscription) => subscription.rss === search.subscription)) return;

    void navigate({
      to: '/',
      search: { tab: 'downloads' },
      replace: true,
    });
  }, [navigate, search.subscription, subscriptionManager.subscriptions]);

  const setActiveTab = (tab: PageTab) => {
    if (tab === activeTab) return;

    setActiveTabState(tab);
    setVisitedTabs((current) => new Set(current).add(tab));
    void navigate({
      to: '/',
      search:
        tab === 'subscriptions' ? {} : { tab, ...(search.subscription ? { subscription: search.subscription } : {}) },
      replace: true,
    });
  };

  const viewSubscriptionDownloads = (subscriptionRss: string) => {
    setActiveTabState('downloads');
    setVisitedTabs((current) => new Set(current).add('downloads'));
    void navigate({
      to: '/',
      search: { tab: 'downloads', subscription: subscriptionRss },
    });
  };

  const selectDownloadSubscription = (subscriptionRss: string | undefined) => {
    void navigate({
      to: '/',
      search: subscriptionRss ? { tab: 'downloads', subscription: subscriptionRss } : { tab: 'downloads' },
      replace: true,
    });
  };

  async function signOut() {
    await logout().catch(() => undefined);
    setAuthenticated(false);
  }

  if (checkingSession) {
    return (
      <div className="session-check-bg flex min-h-screen items-center justify-center text-sm text-slate-400">
        {t('auth.checkingSession')}
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
          <SubscriptionsPage
            manager={subscriptionManager}
            downloadSummaries={downloadSummaries}
            onViewDownloads={viewSubscriptionDownloads}
          />
        </div>
      ) : null}
      {visitedTabs.has('downloads') ? (
        <div hidden={activeTab !== 'downloads'}>
          <DownloadProgress
            downloads={downloads}
            subscriptions={subscriptionManager.displayedSubscriptions.map(({ subscription }) => subscription)}
            selectedSubscriptionRss={search.subscription}
            onSelectSubscription={selectDownloadSubscription}
          />
        </div>
      ) : null}
    </AppShell>
  );
}
