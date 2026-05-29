import { createFileRoute } from '@tanstack/react-router';
import { forwardToServer } from '~/server/server-api';

export const Route = createFileRoute('/api/seasons/$rss')({
  server: {
    handlers: {
      PATCH: async ({ params, request }) => forwardToServer(`/api/seasons/${encodeURIComponent(params.rss)}`, request),
      DELETE: async ({ params, request }) => forwardToServer(`/api/seasons/${encodeURIComponent(params.rss)}`, request),
    },
  },
});
