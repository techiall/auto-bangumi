import { createFileRoute } from '@tanstack/react-router';
import { forwardToServer } from '~/server/server-api';

export const Route = createFileRoute('/api/downloads')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const { search } = new URL(request.url);
        return forwardToServer(`/api/downloads${search}`, request);
      },
      POST: async ({ request }) => forwardToServer('/api/downloads', request),
    },
  },
});
