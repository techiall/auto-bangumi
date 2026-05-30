import { readAuthHeader } from './auth';

const serverBaseUrl = process.env.API_BASE_URL ?? 'http://127.0.0.1:3001';

export async function forwardToServer(path: string, request?: Request) {
  const url = new URL(path, serverBaseUrl);
  const headers = new Headers(request?.headers);
  headers.delete('host');
  const authorization = readAuthHeader(request);
  if (authorization && !headers.has('authorization')) headers.set('authorization', authorization);
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

export async function verifyServerCredentials(username: string, password: string) {
  const response = await fetch(new URL('/api/config', serverBaseUrl), {
    headers: {
      Authorization: `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`,
    },
  });

  return response.ok;
}

function shouldForwardBody(request: Request | undefined) {
  return request && request.method !== 'GET' && request.method !== 'HEAD';
}
