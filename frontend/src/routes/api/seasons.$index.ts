import { createFileRoute } from '@tanstack/react-router';
import { forwardToBackend } from '~/server/backend-api';

export const Route = createFileRoute('/api/seasons/$index')({
  server: {
    handlers: {
      PATCH: async ({ params, request }) => forwardToBackend(`/api/seasons/${params.index}`, request),
      DELETE: async ({ params, request }) => forwardToBackend(`/api/seasons/${params.index}`, request),
    },
  },
});
