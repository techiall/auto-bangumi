import { useState, type FormEvent } from 'react';
import { AppMark } from '~/components/dashboard/app-mark';
import { LanguageSwitcher } from '~/components/dashboard/language-switcher';
import { ThemeSwitcher } from '~/components/dashboard/theme-switcher';
import { Button } from '~/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card';
import { Input } from '~/components/ui/input';
import { Label } from '~/components/ui/label';
import { login } from '~/lib/api';
import { useI18n } from '~/lib/i18n';
import { asMessage } from '~/lib/subscription';

interface LoginPageProps {
  onAuthenticated: () => void;
}

export function LoginPage({ onAuthenticated }: LoginPageProps) {
  const { t } = useI18n();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      await login(username, password);
      onAuthenticated();
    } catch (caught) {
      setError(asMessage(caught));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="login-page-bg relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-10">
      <div className="absolute right-4 top-4 flex items-center gap-2">
        <LanguageSwitcher />
        <ThemeSwitcher />
      </div>
      <Card className="relative w-full max-w-md overflow-hidden border-slate-700/80 bg-slate-950/84 p-1 shadow-[0_32px_90px_rgba(0,0,0,0.45)]">
        <div className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-cyan-300/70 to-transparent" />
        <CardHeader className="flex-col gap-4 p-6 pb-3">
          <div className="flex min-w-0 items-center gap-3">
            <AppMark className="size-11 drop-shadow-[0_0_28px_rgba(34,211,238,0.28)]" />
            <div className="min-w-0">
              <CardTitle className="truncate font-serif text-3xl">Auto Bangumi</CardTitle>
              <CardDescription className="mt-1 truncate">{t('app.taglineShort')}</CardDescription>
            </div>
          </div>
          <div>
            <div className="text-xl font-semibold tracking-tight text-slate-50">{t('auth.signIn')}</div>
            <CardDescription>{t('auth.subtitle')}</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="p-6 pt-3">
          <form className="grid gap-4" onSubmit={submit}>
            <div className="grid gap-2">
              <Label htmlFor="username">{t('auth.username')}</Label>
              <Input
                id="username"
                autoComplete="username"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password">{t('auth.password')}</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                autoFocus
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </div>
            {error ? (
              <div className="rounded-2xl border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-100">
                {error}
              </div>
            ) : null}
            <Button className="mt-1 w-full" size="lg" type="submit" disabled={submitting}>
              {submitting ? t('auth.signingIn') : t('auth.signIn')}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
