import { Activity, Rss } from 'lucide-react';
import { cn } from '~/lib/utils';

export type PageTab = 'subscriptions' | 'downloads';

const tabs: Array<{ id: PageTab; label: string; icon: typeof Rss }> = [
  { id: 'subscriptions', label: '订阅管理', icon: Rss },
  { id: 'downloads', label: '下载进度', icon: Activity },
];

interface PageTabsProps {
  activeTab: PageTab;
  onChange: (tab: PageTab) => void;
}

export function PageTabs({ activeTab, onChange }: PageTabsProps) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-1.5">
      <div className="grid gap-1.5 sm:grid-cols-2">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              type="button"
              className={cn(
                'flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-medium transition-colors',
                active ? 'bg-cyan-400 text-slate-950' : 'text-slate-400 hover:bg-slate-900 hover:text-slate-100',
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
