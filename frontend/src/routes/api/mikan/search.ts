import { createFileRoute } from '@tanstack/react-router';
import { forwardToBackend } from '~/server/backend-api';

export const Route = createFileRoute('/api/mikan/search')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const { searchParams } = new URL(request.url);
        const query = searchParams.get('q') ?? '';
        return forwardToBackend(`/api/mikan/search?q=${encodeURIComponent(query)}`, request);
      },
    },
  },
});
