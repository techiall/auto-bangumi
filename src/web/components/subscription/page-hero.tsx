import { AppMark } from '~/components/dashboard/app-mark';
import { useI18n } from '~/lib/i18n';

export function PageHero() {
  const { t } = useI18n();

  return (
    <div className="min-w-0">
      <div className="flex items-center gap-3">
        <AppMark className="size-10 shrink-0 drop-shadow-[0_0_28px_rgba(34,211,238,0.28)] sm:size-11" />
        <div className="min-w-0">
          <h1 className="truncate font-serif text-2xl font-bold tracking-tight text-slate-50 sm:text-3xl md:text-4xl">
            Auto Bangumi
          </h1>
          <p className="mt-1 text-xs text-slate-400 sm:hidden">{t('app.taglineShort')}</p>
          <p className="mt-1 hidden truncate text-sm text-slate-400 sm:block">{t('app.tagline')}</p>
        </div>
      </div>
    </div>
  );
}
