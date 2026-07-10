import { readAuthHeader } from './auth';

const serverBaseUrl = process.env.API_BASE_URL ?? 'http://127.0.0.1:3001';

const FORWARDED_REQUEST_HEADERS = ['accept', 'accept-language', 'content-type', 'authorization'] as const;

export async function forwardApiRequest(request: Request) {
  const incoming = new URL(request.url);
  return forwardToServer(`${incoming.pathname}${incoming.search}`, request);
}

export async function forwardToServer(path: string, request?: Request) {
  const url = new URL(path, serverBaseUrl);
  const headers = new Headers();

  for (const name of FORWARDED_REQUEST_HEADERS) {
    const value = request?.headers.get(name);
    if (value) headers.set(name, value);
  }

  const authorization = readAuthHeader(request);
  if (authorization && !headers.has('authorization')) headers.set('authorization', authorization);

  const body = request && shouldForwardBody(request) ? await request.arrayBuffer() : undefined;

  const response = await fetch(url, {
    method: request?.method ?? 'GET',
    headers,
    body,
  });

  return new Response(response.body, {
    status: response.status,
    headers: response.headers,
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
