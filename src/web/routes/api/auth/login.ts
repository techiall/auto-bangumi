import { createFileRoute } from '@tanstack/react-router';
import { createSessionCookie } from '~/server/auth';
import { verifyServerCredentials } from '~/server/server-api';

export const Route = createFileRoute('/api/auth/login')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const payload = await request.json().catch(() => ({}));
        const username = String(payload.username ?? '').trim();
        const password = String(payload.password ?? '');

        if (!username || !password || !(await verifyServerCredentials(username, password))) {
          return Response.json({ message: 'Invalid username or password.' }, { status: 401 });
        }

        return Response.json(
          { ok: true },
          {
            headers: {
              'Set-Cookie': createSessionCookie(request),
            },
          },
        );
      },
    },
  },
});
