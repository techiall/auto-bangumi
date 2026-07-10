import { Activity, Rss } from 'lucide-react';
import type { KeyboardEvent } from 'react';
import { useI18n } from '~/lib/i18n';
import { cn } from '~/lib/utils';

export type PageTab = 'subscriptions' | 'downloads';

export const PAGE_TAB_IDS: Record<PageTab, { tab: string; panel: string }> = {
  subscriptions: { tab: 'page-tab-subscriptions', panel: 'page-panel-subscriptions' },
  downloads: { tab: 'page-tab-downloads', panel: 'page-panel-downloads' },
};

const tabs: Array<{ id: PageTab; labelKey: string; icon: typeof Rss }> = [
  { id: 'subscriptions', labelKey: 'tabs.subscriptions', icon: Rss },
  { id: 'downloads', labelKey: 'tabs.downloads', icon: Activity },
];

interface PageTabsProps {
  activeTab: PageTab;
  onChange: (tab: PageTab) => void;
}

export function PageTabs({ activeTab, onChange }: PageTabsProps) {
  const { t } = useI18n();

  function onTabKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight' && event.key !== 'Home' && event.key !== 'End') {
      return;
    }

    event.preventDefault();
    const lastIndex = tabs.length - 1;
    const nextIndex =
      event.key === 'Home'
        ? 0
        : event.key === 'End'
          ? lastIndex
          : event.key === 'ArrowRight'
            ? (index + 1) % tabs.length
            : (index - 1 + tabs.length) % tabs.length;
    const nextTab = tabs[nextIndex];
    onChange(nextTab.id);
    queueMicrotask(() => document.getElementById(PAGE_TAB_IDS[nextTab.id].tab)?.focus());
  }

  return (
    <div
      className="w-full min-w-0 rounded-2xl border border-slate-800 bg-slate-900/70 p-1.5 md:w-auto"
      role="tablist"
      aria-label={t('app.taglineShort')}>
      <div className="grid grid-cols-2 gap-1.5">
        {tabs.map((tab, index) => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          const ids = PAGE_TAB_IDS[tab.id];

          return (
            <button
              key={tab.id}
              id={ids.tab}
              type="button"
              role="tab"
              aria-selected={active}
              aria-controls={ids.panel}
              tabIndex={active ? 0 : -1}
              className={cn(
                'flex w-full min-w-0 items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/30 sm:px-4 sm:py-2.5 md:min-w-36',
                active
                  ? 'bg-cyan-400 text-slate-950 shadow-[0_10px_30px_rgba(34,211,238,0.2)]'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-slate-100',
              )}
              onClick={() => onChange(tab.id)}
              onKeyDown={(event) => onTabKeyDown(event, index)}>
              <Icon className="size-4" />
              {t(tab.labelKey)}
            </button>
          );
        })}
      </div>
    </div>
  );
}
