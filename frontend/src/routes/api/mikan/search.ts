import { createFileRoute } from '@tanstack/react-router';
import { searchBangumi } from '~/server/mikan';

export const Route = createFileRoute('/api/mikan/search')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const { searchParams } = new URL(request.url);
        const query = searchParams.get('q') ?? '';
        return Response.json(await searchBangumi(query));
      },
    },
  },
});
