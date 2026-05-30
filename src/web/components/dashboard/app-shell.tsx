import type { ReactNode } from 'react';
import { LogOut } from 'lucide-react';
import { PageHero } from '~/components/subscription/page-hero';
import { PageTabs, type PageTab } from '~/components/dashboard/page-tabs';
import { Button } from '~/components/ui/button';

interface AppShellProps {
  activeTab: PageTab;
  children: ReactNode;
  onTabChange: (tab: PageTab) => void;
  onLogout: () => void;
}

export function AppShell({ activeTab, children, onTabChange, onLogout }: AppShellProps) {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.14),transparent_32rem),linear-gradient(180deg,#020617,#0f172a_48%,#111827)]">
      <main className="mx-auto flex w-full max-w-7xl flex-col gap-4 overflow-hidden px-3 py-4 sm:px-4 md:px-6 md:py-5">
        <header className="flex min-w-0 flex-col gap-4 overflow-hidden rounded-3xl border border-slate-800/90 bg-slate-950/72 p-4 shadow-[0_24px_70px_rgba(0,0,0,0.32)] backdrop-blur md:flex-row md:items-center md:justify-between md:p-5">
          <PageHero />
          <div className="flex shrink-0 items-center gap-2">
            <PageTabs activeTab={activeTab} onChange={onTabChange} />
            <Button type="button" variant="ghost" size="sm" onClick={onLogout} title="Sign out">
              <LogOut className="h-4 w-4" />
              <span className="sr-only">Sign out</span>
            </Button>
          </div>
        </header>
        {children}
      </main>
    </div>
  );
}
