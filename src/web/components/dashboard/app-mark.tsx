import { TvMinimalPlay } from 'lucide-react';
import { cn } from '~/lib/utils';

type AppMarkProps = {
  className?: string;
};

export function AppMark({ className = 'size-10' }: AppMarkProps) {
  return (
    <span
      aria-label="Auto Bangumi"
      className={cn(
        'grid shrink-0 place-items-center rounded-2xl border border-cyan-200/25 bg-gradient-to-br from-cyan-300 via-cyan-500 to-teal-400 text-slate-950 shadow-[0_0_32px_rgba(34,211,238,0.24)]',
        className,
      )}
      role="img">
      <TvMinimalPlay className="size-[60%]" strokeWidth={2.5} />
    </span>
  );
}
