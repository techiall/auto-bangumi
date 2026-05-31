import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

export type LocaleChoice = 'system' | string;

interface LocaleMeta {
  label: string;
  shortLabel: string;
  htmlLang: string;
}

interface LocaleOption extends LocaleMeta {
  code: string;
}

type LocaleMessages = Record<string, string>;
type TranslationValues = Record<string, string | number>;
type RawLocaleFile = { $locale?: LocaleMeta; [key: string]: unknown };

interface LocaleBundle {
  meta: LocaleMeta;
  messages: LocaleMessages;
}

interface I18nContextValue {
  choice: LocaleChoice;
  locale: string;
  locales: LocaleOption[];
  setChoice: (choice: LocaleChoice) => void;
  t: (key: string, values?: TranslationValues) => string;
}

export const LOCALE_STORAGE_KEY = 'auto-bangumi:locale';
export const DEFAULT_LOCALE = 'en';

const localeFiles = import.meta.glob<RawLocaleFile>('../locales/*.json', {
  eager: true,
  import: 'default',
});
const localeBundles = loadLocaleBundles(localeFiles);
const defaultBundle = localeBundles.get(DEFAULT_LOCALE) ??
  [...localeBundles.values()][0] ?? {
    meta: { label: 'English', shortLabel: 'EN', htmlLang: 'en' },
    messages: {},
  };
const availableLocales = [...localeBundles.entries()]
  .map(([code, bundle]) => ({ code, ...bundle.meta }))
  .sort((first, second) => {
    if (first.code === DEFAULT_LOCALE) return -1;
    if (second.code === DEFAULT_LOCALE) return 1;
    return first.code.localeCompare(second.code);
  });

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [choice, setChoiceState] = useState<LocaleChoice>('system');
  const [locale, setLocale] = useState(DEFAULT_LOCALE);

  useEffect(() => {
    const storedChoice = getStoredLocaleChoice();
    const resolvedLocale = resolveLocaleChoice(storedChoice);
    setChoiceState(storedChoice);
    setLocale(resolvedLocale);
    applyLocale(resolvedLocale, storedChoice);
  }, []);

  useEffect(() => {
    const syncStoredChoice = (event: StorageEvent) => {
      if (event.key !== null && event.key !== LOCALE_STORAGE_KEY) return;

      const storedChoice = getStoredLocaleChoice();
      const resolvedLocale = resolveLocaleChoice(storedChoice);
      setChoiceState(storedChoice);
      setLocale(resolvedLocale);
      applyLocale(resolvedLocale, storedChoice);
    };

    window.addEventListener('storage', syncStoredChoice);
    return () => window.removeEventListener('storage', syncStoredChoice);
  }, []);

  const value = useMemo<I18nContextValue>(
    () => ({
      choice,
      locale,
      locales: availableLocales,
      setChoice: (nextChoice) => {
        persistLocaleChoice(nextChoice);
        const resolvedLocale = resolveLocaleChoice(nextChoice);
        setChoiceState(nextChoice);
        setLocale(resolvedLocale);
        applyLocale(resolvedLocale, nextChoice);
      },
      t: (key, values) => translate(locale, key, values),
    }),
    [choice, locale],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) throw new Error('useI18n must be used within I18nProvider.');
  return context;
}

export function getStoredLocaleChoice(): LocaleChoice {
  if (typeof window === 'undefined') return 'system';

  const stored = readStoredLocaleChoice();
  if (!stored || stored === 'system') return 'system';
  return localeBundles.has(stored) ? stored : 'system';
}

function persistLocaleChoice(choice: LocaleChoice) {
  if (typeof window === 'undefined') return;

  try {
    if (choice === 'system') {
      window.localStorage.removeItem(LOCALE_STORAGE_KEY);
    } else {
      window.localStorage.setItem(LOCALE_STORAGE_KEY, choice);
    }
  } catch {
    // Storage can be unavailable in hardened browser contexts.
  }
}

function resolveLocaleChoice(choice: LocaleChoice) {
  if (choice !== 'system' && localeBundles.has(choice)) return choice;
  return detectBrowserLocale();
}

function detectBrowserLocale() {
  if (typeof navigator === 'undefined') return DEFAULT_LOCALE;

  for (const candidate of navigator.languages?.length ? navigator.languages : [navigator.language]) {
    const locale = findAvailableLocale(candidate);
    if (locale) return locale;
  }

  return DEFAULT_LOCALE;
}

function findAvailableLocale(value?: string) {
  if (!value) return undefined;
  if (localeBundles.has(value)) return value;

  const language = value.split('-')[0]?.toLowerCase();
  if (!language) return undefined;

  return availableLocales.find((locale) => locale.code.toLowerCase().split('-')[0] === language)?.code;
}

function applyLocale(locale: string, choice: LocaleChoice) {
  if (typeof document === 'undefined') return;

  const root = document.documentElement;
  const meta = localeBundles.get(locale)?.meta ?? defaultBundle.meta;
  root.lang = meta.htmlLang;
  root.dataset.locale = locale;
  root.dataset.localeChoice = choice;
}

function translate(locale: string, key: string, values?: TranslationValues) {
  const template = localeBundles.get(locale)?.messages[key] ?? defaultBundle.messages[key] ?? key;
  if (!values) return template;

  return Object.entries(values).reduce((text, [name, value]) => text.replaceAll(`{${name}}`, String(value)), template);
}

function readStoredLocaleChoice() {
  try {
    return window.localStorage.getItem(LOCALE_STORAGE_KEY);
  } catch {
    return null;
  }
}

function loadLocaleBundles(files: Record<string, RawLocaleFile>) {
  const bundles = new Map<string, LocaleBundle>();

  for (const [path, file] of Object.entries(files)) {
    const code = path.match(/([^/]+)\.json$/)?.[1];
    if (!code) continue;

    const { $locale, ...rawMessages } = file;
    bundles.set(code, {
      meta: {
        label: $locale?.label ?? code,
        shortLabel: $locale?.shortLabel ?? code,
        htmlLang: $locale?.htmlLang ?? code,
      },
      messages: Object.fromEntries(
        Object.entries(rawMessages).filter((entry): entry is [string, string] => typeof entry[1] === 'string'),
      ),
    });
  }

  return bundles;
}
