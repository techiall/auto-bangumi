import { createFileRoute } from '@tanstack/react-router';
import { clearSessionCookie } from '~/server/auth';

export const Route = createFileRoute('/api/auth/logout')({
  server: {
    handlers: {
      POST: async ({ request }) =>
        Response.json(
          { ok: true },
          {
            headers: {
              'Set-Cookie': clearSessionCookie(request),
            },
          },
        ),
    },
  },
});
