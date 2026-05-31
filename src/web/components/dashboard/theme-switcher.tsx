import { Monitor, Moon, Sun } from 'lucide-react';
import { useEffect, useState } from 'react';
import {
  THEME_STORAGE_KEY,
  applyThemeChoice,
  getStoredThemeChoice,
  persistThemeChoice,
  type ThemeChoice,
} from '~/lib/theme';
import { useI18n } from '~/lib/i18n';
import { cn } from '~/lib/utils';

const choices: Array<{ value: ThemeChoice; labelKey: string; icon: typeof Monitor }> = [
  { value: 'system', labelKey: 'theme.system', icon: Monitor },
  { value: 'light', labelKey: 'theme.light', icon: Sun },
  { value: 'dark', labelKey: 'theme.dark', icon: Moon },
];

interface ThemeSwitcherProps {
  className?: string;
}

export function ThemeSwitcher({ className }: ThemeSwitcherProps) {
  const { t } = useI18n();
  const [mounted, setMounted] = useState(false);
  const [choice, setChoice] = useState<ThemeChoice>('system');

  useEffect(() => {
    setChoice(getStoredThemeChoice());
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    applyThemeChoice(choice);

    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const applySystemTheme = () => {
      applyThemeChoice('system');
    };

    if (choice === 'system') {
      media.addEventListener('change', applySystemTheme);
    }

    return () => {
      media.removeEventListener('change', applySystemTheme);
    };
  }, [choice, mounted]);

  useEffect(() => {
    if (!mounted) return;

    const syncStoredChoice = (event: StorageEvent) => {
      if (event.key === null || event.key === THEME_STORAGE_KEY) {
        setChoice(getStoredThemeChoice());
      }
    };

    window.addEventListener('storage', syncStoredChoice);
    return () => window.removeEventListener('storage', syncStoredChoice);
  }, [mounted]);

  function chooseTheme(nextChoice: ThemeChoice) {
    setChoice(nextChoice);
    persistThemeChoice(nextChoice);
    applyThemeChoice(nextChoice);
  }

  return (
    <div
      className={cn(
        'inline-grid grid-cols-3 rounded-full border border-slate-800 bg-slate-950/72 p-1 shadow-sm backdrop-blur',
        className,
      )}
      role="radiogroup"
      aria-label={t('theme.mode')}>
      {choices.map((item) => {
        const Icon = item.icon;
        const active = choice === item.value;
        const label = t(item.labelKey);

        return (
          <button
            key={item.value}
            type="button"
            className={cn(
              'grid size-8 place-items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/30',
              active
                ? 'bg-cyan-400 text-slate-950 shadow-[0_8px_24px_rgba(8,145,178,0.22)]'
                : 'text-slate-500 hover:bg-slate-900/70 hover:text-slate-100',
            )}
            role="radio"
            aria-checked={active}
            aria-label={label}
            title={label}
            onClick={() => chooseTheme(item.value)}>
            <Icon className="size-4" />
          </button>
        );
      })}
    </div>
  );
}
