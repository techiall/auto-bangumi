export function PageHero() {
  return (
    <div className="min-w-0">
      <div className="flex items-center gap-3">
        <div className="grid size-10 shrink-0 place-items-center rounded-2xl border border-cyan-500/25 bg-cyan-400 text-lg font-black text-slate-950 shadow-[0_0_36px_rgba(34,211,238,0.22)]">
          A
        </div>
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
