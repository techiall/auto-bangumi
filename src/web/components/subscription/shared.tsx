import type { ReactNode } from 'react';
import { Rss } from 'lucide-react';
import { Label } from '~/components/ui/label';
import { useI18n } from '~/lib/i18n';
import { cn } from '~/lib/utils';
import type { MikanBangumiGroup } from '~/types';

export function Field({ id, label, children }: { id?: string; label: string; children: ReactNode }) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={id}>{label}</Label>
      {children}
    </div>
  );
}

export function GroupOption({
  group,
  active,
  onClick,
}: {
  group: MikanBangumiGroup;
  active: boolean;
  onClick: () => void;
}) {
  const { t } = useI18n();

  return (
    <div
      className={cn(
        'flex min-w-0 items-center gap-3 rounded-xl border px-3 py-2.5 transition-colors',
        active ? 'border-cyan-500 bg-cyan-950/70' : 'border-slate-800 bg-slate-900/54 hover:bg-slate-900',
      )}>
      <button type="button" onClick={onClick} className="min-w-0 flex-1 text-left">
        <span className="block truncate font-medium text-slate-100">{group.name}</span>
      </button>
      <a
        href={group.rss}
        target="_blank"
        rel="noreferrer"
        className="inline-flex shrink-0 items-center gap-1 rounded-full border border-cyan-800/80 bg-cyan-950/70 px-2.5 py-1 text-xs font-medium text-cyan-100 transition-colors hover:border-cyan-500 hover:bg-cyan-900 hover:text-cyan-50"
        title={`${group.name} RSS`}>
        <Rss className="size-3.5" />
        {t('common.rss')}
      </a>
    </div>
  );
}

export function StateBox({ icon, text }: { icon: ReactNode; text: string }) {
  return (
    <div className="flex items-center gap-2 rounded-2xl bg-slate-900 px-4 py-3 text-sm text-slate-400">
      {icon}
      <span>{text}</span>
    </div>
  );
}
