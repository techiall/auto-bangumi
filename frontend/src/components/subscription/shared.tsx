import type { ReactNode } from 'react';
import { Label } from '~/components/ui/label';
import { cn } from '~/lib/utils';
import type { MikanBangumiGroup } from '~/types';

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid gap-2">
      <Label>{label}</Label>
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
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'grid gap-2 rounded-2xl border px-4 py-3 text-left transition-colors',
        active ? 'border-cyan-500 bg-cyan-950/80' : 'border-slate-800 bg-slate-900/70 hover:bg-slate-800',
      )}>
      <div className="font-medium text-slate-100">{group.name}</div>
      <div className="break-all text-xs leading-5 text-slate-500">{group.rss}</div>
    </button>
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
