export type ThemeChoice = 'system' | 'light' | 'dark';
export type ResolvedTheme = 'light' | 'dark';

export const THEME_STORAGE_KEY = 'auto-bangumi:theme';

export function getStoredThemeChoice(): ThemeChoice {
  if (typeof window === 'undefined') return 'system';

  const stored = readStoredThemeChoice();
  return isThemeChoice(stored) ? stored : 'system';
}

export function persistThemeChoice(choice: ThemeChoice) {
  if (typeof window === 'undefined') return;

  try {
    if (choice === 'system') {
      window.localStorage.removeItem(THEME_STORAGE_KEY);
    } else {
      window.localStorage.setItem(THEME_STORAGE_KEY, choice);
    }
  } catch {
    // Storage can be unavailable in hardened browser contexts.
  }
}

export function applyThemeChoice(choice: ThemeChoice): ResolvedTheme {
  const resolved = resolveThemeChoice(choice);

  if (typeof document !== 'undefined') {
    const root = document.documentElement;
    root.dataset.theme = resolved;
    root.dataset.themeChoice = choice;
    root.style.colorScheme = resolved;

    document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]').forEach((meta) => {
      meta.content = resolved === 'dark' ? '#020617' : '#f8fafc';
    });
  }

  return resolved;
}

export function resolveThemeChoice(choice: ThemeChoice): ResolvedTheme {
  if (choice !== 'system') return choice;
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function isThemeChoice(value: string | null): value is ThemeChoice {
  return value === 'system' || value === 'light' || value === 'dark';
}

function readStoredThemeChoice() {
  try {
    return window.localStorage.getItem(THEME_STORAGE_KEY);
  } catch {
    return null;
  }
}
