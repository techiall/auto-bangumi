const backendBaseUrl = process.env.API_BASE_URL ?? 'http://localhost:3000';

export async function forwardToBackend(path: string, request?: Request) {
  const url = new URL(path, backendBaseUrl);
  const headers = new Headers(request?.headers);
  headers.delete('host');
  const body = request && shouldForwardBody(request) ? await request.arrayBuffer() : undefined;

  const response = await fetch(url, {
    method: request?.method ?? 'GET',
    headers,
    body,
  });

  return new Response(await response.text(), {
    status: response.status,
    headers: {
      'Content-Type': response.headers.get('Content-Type') ?? 'application/json',
    },
  });
}

function shouldForwardBody(request: Request | undefined) {
  return request && request.method !== 'GET' && request.method !== 'HEAD';
}
