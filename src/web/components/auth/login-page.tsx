import { useState, type FormEvent } from 'react';
import { Button } from '~/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card';
import { Input } from '~/components/ui/input';
import { Label } from '~/components/ui/label';
import { login } from '~/lib/api';
import { asMessage } from '~/lib/subscription';

interface LoginPageProps {
  onAuthenticated: () => void;
}

export function LoginPage({ onAuthenticated }: LoginPageProps) {
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
    <div className="flex min-h-screen items-center justify-center overflow-hidden bg-[radial-gradient(circle_at_20%_0%,rgba(34,211,238,0.20),transparent_32rem),radial-gradient(circle_at_80%_20%,rgba(15,23,42,0.8),transparent_28rem),linear-gradient(135deg,#020617,#0f172a_54%,#111827)] px-4 py-10">
      <Card className="relative w-full max-w-md overflow-hidden border-slate-700/80 bg-slate-950/84 p-1 shadow-[0_32px_90px_rgba(0,0,0,0.45)]">
        <div className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-cyan-300/70 to-transparent" />
        <CardHeader className="flex-col gap-2 p-6 pb-3">
          <div className="mb-2 inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-cyan-300/30 bg-cyan-300/10 text-lg font-semibold text-cyan-100">
            AB
          </div>
          <CardTitle className="text-2xl">Sign in</CardTitle>
          <CardDescription>Use the server credentials from your local environment.</CardDescription>
        </CardHeader>
        <CardContent className="p-6 pt-3">
          <form className="grid gap-4" onSubmit={submit}>
            <div className="grid gap-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                autoComplete="username"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password">Password</Label>
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
              {submitting ? 'Signing in...' : 'Sign in'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
