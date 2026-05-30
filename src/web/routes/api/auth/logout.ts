import { createFileRoute } from '@tanstack/react-router';
import { clearAuthCookieHeader } from '~/server/auth';

export const Route = createFileRoute('/api/auth/logout')({
  server: {
    handlers: {
      POST: async () =>
        Response.json(
          { ok: true },
          {
            headers: {
              'Set-Cookie': clearAuthCookieHeader(),
            },
          },
        ),
    },
  },
});
