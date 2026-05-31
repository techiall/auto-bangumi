import type { ReactNode } from 'react';
import { LogOut } from 'lucide-react';
import { PageHero } from '~/components/subscription/page-hero';
import { PageTabs, type PageTab } from '~/components/dashboard/page-tabs';
import { ThemeSwitcher } from '~/components/dashboard/theme-switcher';
import { Button } from '~/components/ui/button';

interface AppShellProps {
  activeTab: PageTab;
  children: ReactNode;
  onTabChange: (tab: PageTab) => void;
  onLogout: () => void;
}

export function AppShell({ activeTab, children, onTabChange, onLogout }: AppShellProps) {
  return (
    <div className="app-shell-bg min-h-screen">
      <main className="mx-auto flex w-full max-w-7xl flex-col gap-4 overflow-hidden px-3 py-4 sm:px-4 md:px-6 md:py-5">
        <header className="flex min-w-0 flex-col gap-4 overflow-hidden rounded-3xl border border-slate-800/90 bg-slate-950/72 p-4 shadow-[0_24px_70px_rgba(0,0,0,0.32)] backdrop-blur md:grid md:grid-cols-[minmax(0,1fr)_auto] md:items-center md:p-5">
          <PageHero />
          <div className="flex min-w-0 flex-col gap-2 md:items-end">
            <div className="flex items-center justify-end gap-2 text-xs text-slate-500">
              <ThemeSwitcher />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 gap-1.5 rounded-full px-2.5 text-xs text-slate-500 hover:text-slate-100"
                onClick={onLogout}>
                <LogOut className="h-3.5 w-3.5" />
                Sign out
              </Button>
            </div>
            <PageTabs activeTab={activeTab} onChange={onTabChange} />
          </div>
        </header>
        {children}
      </main>
    </div>
  );
}
