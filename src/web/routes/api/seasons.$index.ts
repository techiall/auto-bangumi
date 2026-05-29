import { createFileRoute } from '@tanstack/react-router';
import { forwardToServer } from '~/server/server-api';

export const Route = createFileRoute('/api/seasons/$index')({
  server: {
    handlers: {
      PATCH: async ({ params, request }) => forwardToServer(`/api/seasons/${params.index}`, request),
      DELETE: async ({ params, request }) => forwardToServer(`/api/seasons/${params.index}`, request),
    },
  },
});
