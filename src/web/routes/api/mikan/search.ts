import { createFileRoute } from '@tanstack/react-router';
import { forwardToServer } from '~/server/server-api';

export const Route = createFileRoute('/api/mikan/search')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const { searchParams } = new URL(request.url);
        const query = searchParams.get('q') ?? '';
        return forwardToServer(`/api/mikan/search?q=${encodeURIComponent(query)}`, request);
      },
    },
  },
});
