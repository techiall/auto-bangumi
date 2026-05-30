import { AppMark } from '~/components/dashboard/app-mark';

export function PageHero() {
  return (
    <div className="min-w-0">
      <div className="flex items-center gap-3">
        <AppMark className="size-11 shrink-0 drop-shadow-[0_0_28px_rgba(34,211,238,0.28)]" />
        <div className="min-w-0">
          <h1 className="truncate font-serif text-3xl font-bold tracking-tight text-slate-50 md:text-4xl">
            Auto Bangumi
          </h1>
          <p className="mt-1 truncate text-sm text-slate-400">Mikan RSS console for subscriptions and downloads.</p>
        </div>
      </div>
    </div>
  );
}
