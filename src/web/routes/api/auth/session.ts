import { createFileRoute } from '@tanstack/react-router';
import { forwardToServer } from '~/server/server-api';

export const Route = createFileRoute('/api/auth/session')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const response = await forwardToServer('/api/config', request);
        return Response.json({ authenticated: response.ok }, { status: response.ok ? 200 : 401 });
      },
    },
  },
});
