/// <reference types="vite/client" />
import type { ReactNode } from 'react';
import { HeadContent, Outlet, Scripts, createRootRoute } from '@tanstack/react-router';
import { I18nProvider } from '~/lib/i18n';
import { THEME_STORAGE_KEY } from '~/lib/theme';
import appCss from '~/styles/app.css?url';

const themeBootScript = `(function(){try{var k=${JSON.stringify(THEME_STORAGE_KEY)};var c=localStorage.getItem(k);var choice=c==='dark'||c==='light'?c:'system';var resolved=choice==='system'?(window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'):choice;var r=document.documentElement;r.dataset.theme=resolved;r.dataset.themeChoice=choice;r.style.colorScheme=resolved;}catch(e){}})();`;

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { name: 'theme-color', media: '(prefers-color-scheme: light)', content: '#f8fafc' },
      { name: 'theme-color', media: '(prefers-color-scheme: dark)', content: '#020617' },
      { title: 'Auto Bangumi' },
      { name: 'description', content: 'Search Mikan and update subscriptions from a cleaner web UI.' },
    ],
    links: [
      { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' },
      { rel: 'stylesheet', href: appCss },
    ],
  }),
  component: RootComponent,
});

function RootComponent() {
  return (
    <RootDocument>
      <Outlet />
    </RootDocument>
  );
}

function RootDocument({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootScript }} />
        <HeadContent />
      </head>
      <body>
        <I18nProvider>{children}</I18nProvider>
        <Scripts />
      </body>
    </html>
  );
}
