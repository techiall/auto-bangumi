import { Activity, Rss } from 'lucide-react';
import { cn } from '~/lib/utils';

export type PageTab = 'subscriptions' | 'downloads';

const tabs: Array<{ id: PageTab; label: string; icon: typeof Rss }> = [
  { id: 'subscriptions', label: 'Subscriptions', icon: Rss },
  { id: 'downloads', label: 'Downloads', icon: Activity },
];

interface PageTabsProps {
  activeTab: PageTab;
  onChange: (tab: PageTab) => void;
}

export function PageTabs({ activeTab, onChange }: PageTabsProps) {
  return (
    <div className="w-full min-w-0 rounded-2xl border border-slate-800 bg-slate-900/70 p-1.5 md:w-auto">
      <div className="grid gap-1.5 sm:grid-cols-2">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              type="button"
              className={cn(
                'flex w-full min-w-0 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-colors md:min-w-36',
                active
                  ? 'bg-cyan-400 text-slate-950 shadow-[0_10px_30px_rgba(34,211,238,0.2)]'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-slate-100',
              )}
              onClick={() => onChange(tab.id)}>
              <Icon className="size-4" />
              {tab.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
