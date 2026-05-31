import { Check, Languages, Monitor, Moon, Settings2, Sun } from 'lucide-react';
import { useEffect, useMemo, useRef, useState, type ComponentType, type ReactNode } from 'react';
import { useI18n, type LocaleChoice } from '~/lib/i18n';
import {
  THEME_STORAGE_KEY,
  applyThemeChoice,
  getStoredThemeChoice,
  persistThemeChoice,
  type ThemeChoice,
} from '~/lib/theme';
import { cn } from '~/lib/utils';

const themeChoices: Array<{ value: ThemeChoice; labelKey: string; icon: ComponentType<{ className?: string }> }> = [
  { value: 'system', labelKey: 'theme.system', icon: Monitor },
  { value: 'light', labelKey: 'theme.light', icon: Sun },
  { value: 'dark', labelKey: 'theme.dark', icon: Moon },
];

interface PreferenceMenuProps {
  className?: string;
}

export function PreferenceMenu({ className }: PreferenceMenuProps) {
  const { choice: localeChoice, locales, setChoice: setLocaleChoice, t } = useI18n();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [themeChoice, setThemeChoice] = useState<ThemeChoice>('system');
  const rootRef = useRef<HTMLDivElement>(null);

  const localeChoices = useMemo<Array<{ value: LocaleChoice; label: string; shortLabel: string }>>(
    () => [
      { value: 'system', label: t('language.auto'), shortLabel: t('language.autoShort') },
      ...locales.map((locale) => ({
        value: locale.code,
        label: locale.label,
        shortLabel: locale.shortLabel,
      })),
    ],
    [locales, t],
  );

  useEffect(() => {
    setThemeChoice(getStoredThemeChoice());
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    applyThemeChoice(themeChoice);

    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const applySystemTheme = () => {
      applyThemeChoice('system');
    };

    if (themeChoice === 'system') {
      media.addEventListener('change', applySystemTheme);
    }

    return () => {
      media.removeEventListener('change', applySystemTheme);
    };
  }, [themeChoice, mounted]);

  useEffect(() => {
    if (!mounted) return;

    const syncStoredChoice = (event: StorageEvent) => {
      if (event.key === null || event.key === THEME_STORAGE_KEY) {
        setThemeChoice(getStoredThemeChoice());
      }
    };

    window.addEventListener('storage', syncStoredChoice);
    return () => window.removeEventListener('storage', syncStoredChoice);
  }, [mounted]);

  useEffect(() => {
    if (!open) return;

    const closeOnOutsideClick = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };

    window.addEventListener('mousedown', closeOnOutsideClick);
    window.addEventListener('keydown', closeOnEscape);
    return () => {
      window.removeEventListener('mousedown', closeOnOutsideClick);
      window.removeEventListener('keydown', closeOnEscape);
    };
  }, [open]);

  function chooseTheme(nextChoice: ThemeChoice) {
    setThemeChoice(nextChoice);
    persistThemeChoice(nextChoice);
    applyThemeChoice(nextChoice);
  }

  return (
    <div ref={rootRef} className={cn('relative z-50 inline-flex', className)}>
      <button
        type="button"
        className="grid size-8 place-items-center rounded-full border border-slate-800 bg-slate-950/72 text-slate-500 shadow-sm backdrop-blur transition-colors hover:bg-slate-900/70 hover:text-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/30"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={t('preferences.label')}
        title={t('preferences.label')}
        onClick={() => setOpen((value) => !value)}>
        <Settings2 className="size-4" />
      </button>

      {open ? (
        <div
          className="absolute right-0 top-10 z-50 grid w-[min(20rem,calc(100vw-2rem))] gap-4 rounded-2xl border border-slate-800 bg-slate-950 p-3 text-slate-300 shadow-[0_24px_60px_rgba(0,0,0,0.28)]"
          role="dialog"
          aria-label={t('preferences.label')}>
          <PreferenceSection icon={<Languages className="size-4" />} title={t('language.mode')}>
            <div className="grid max-h-56 gap-1 overflow-y-auto pr-1" role="radiogroup" aria-label={t('language.mode')}>
              {localeChoices.map((item) => (
                <PreferenceOption
                  key={item.value}
                  label={item.label}
                  meta={item.shortLabel}
                  active={localeChoice === item.value}
                  onClick={() => setLocaleChoice(item.value)}
                />
              ))}
            </div>
          </PreferenceSection>

          <PreferenceSection icon={<Monitor className="size-4" />} title={t('theme.mode')}>
            <div className="grid gap-1" role="radiogroup" aria-label={t('theme.mode')}>
              {themeChoices.map((item) => {
                const Icon = item.icon;
                return (
                  <PreferenceOption
                    key={item.value}
                    icon={<Icon className="size-4" />}
                    label={t(item.labelKey)}
                    active={themeChoice === item.value}
                    onClick={() => chooseTheme(item.value)}
                  />
                );
              })}
            </div>
          </PreferenceSection>
        </div>
      ) : null}
    </div>
  );
}

function PreferenceSection({ icon, title, children }: { icon: ReactNode; title: string; children: ReactNode }) {
  return (
    <section className="grid gap-2">
      <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
        {icon}
        {title}
      </div>
      {children}
    </section>
  );
}

function PreferenceOption({
  active,
  icon,
  label,
  meta,
  onClick,
}: {
  active: boolean;
  icon?: ReactNode;
  label: string;
  meta?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={cn(
        'flex min-w-0 items-center justify-between gap-3 rounded-xl border px-3 py-2 text-left text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/30',
        active
          ? 'border-cyan-500/70 bg-cyan-950/70 text-cyan-100'
          : 'border-transparent text-slate-400 hover:border-slate-800 hover:bg-slate-900/70 hover:text-slate-100',
      )}
      role="radio"
      aria-checked={active}
      onClick={onClick}>
      <span className="flex min-w-0 items-center gap-2">
        {icon ? <span className={active ? 'text-cyan-200' : 'text-slate-500'}>{icon}</span> : null}
        <span className="truncate">{label}</span>
      </span>
      <span className="flex shrink-0 items-center gap-2">
        {meta ? <span className="text-xs font-semibold text-slate-500">{meta}</span> : null}
        {active ? <Check className="size-4 text-cyan-200" /> : null}
      </span>
    </button>
  );
}
