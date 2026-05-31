import { Languages } from 'lucide-react';
import { useI18n, type LocaleChoice } from '~/lib/i18n';
import { cn } from '~/lib/utils';

interface LanguageSwitcherProps {
  className?: string;
}

export function LanguageSwitcher({ className }: LanguageSwitcherProps) {
  const { choice, locales, setChoice, t } = useI18n();
  const choices: Array<{ value: LocaleChoice; label: string; shortLabel: string }> = [
    { value: 'system', label: t('language.auto'), shortLabel: t('language.autoShort') },
    ...locales.map((locale) => ({
      value: locale.code,
      label: locale.label,
      shortLabel: locale.shortLabel,
    })),
  ];

  return (
    <div
      className={cn(
        'inline-grid rounded-full border border-slate-800 bg-slate-950/72 p-1 shadow-sm backdrop-blur',
        className,
      )}
      style={{ gridTemplateColumns: `repeat(${choices.length}, minmax(0, 1fr))` }}
      role="radiogroup"
      aria-label={t('language.mode')}>
      {choices.map((item, index) => {
        const active = choice === item.value;

        return (
          <button
            key={item.value}
            type="button"
            className={cn(
              'grid h-8 min-w-8 place-items-center rounded-full px-2 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/30',
              active
                ? 'bg-cyan-400 text-slate-950 shadow-[0_8px_24px_rgba(8,145,178,0.22)]'
                : 'text-slate-500 hover:bg-slate-900/70 hover:text-slate-100',
            )}
            role="radio"
            aria-checked={active}
            aria-label={item.label}
            title={item.label}
            onClick={() => setChoice(item.value)}>
            {index === 0 ? <Languages className="size-4" aria-hidden="true" /> : item.shortLabel}
          </button>
        );
      })}
    </div>
  );
}
