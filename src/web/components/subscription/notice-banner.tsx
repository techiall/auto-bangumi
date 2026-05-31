import { cn } from '~/lib/utils';

export type Notice = { kind: 'success' | 'error'; message: string };

export function NoticeBanner({ notice }: { notice: Notice }) {
  return (
    <div
      className={cn(
        'rounded-xl border px-4 py-3 text-sm',
        notice.kind === 'error'
          ? 'border-rose-900 bg-rose-950/70 text-rose-100'
          : 'border-cyan-900 bg-cyan-950/70 text-cyan-100',
      )}>
      {notice.message}
    </div>
  );
}
