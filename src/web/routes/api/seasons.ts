import { createFileRoute } from '@tanstack/react-router';
import { forwardToServer } from '~/server/server-api';

export const Route = createFileRoute('/api/seasons')({
  server: {
    handlers: {
      POST: async ({ request }) => forwardToServer('/api/seasons', request),
      PATCH: async ({ request }) => forwardToServer(`/api/seasons${new URL(request.url).search}`, request),
      DELETE: async ({ request }) => forwardToServer(`/api/seasons${new URL(request.url).search}`, request),
    },
  },
});
