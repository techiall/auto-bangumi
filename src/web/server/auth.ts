const AUTH_COOKIE = 'auto_bangumi_auth';
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30;

export function readAuthHeader(request: Request | undefined) {
  const cookie = request?.headers.get('cookie');
  if (!cookie) return undefined;

  const value = parseCookie(cookie)[AUTH_COOKIE];
  return value ? `Basic ${value}` : undefined;
}

export function authCookieHeader(username: string, password: string) {
  const value = Buffer.from(`${username}:${password}`).toString('base64');
  return `${AUTH_COOKIE}=${encodeURIComponent(value)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${COOKIE_MAX_AGE}`;
}

export function clearAuthCookieHeader() {
  return `${AUTH_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
}

function parseCookie(cookie: string) {
  return Object.fromEntries(
    cookie
      .split(';')
      .map((part) => part.trim().split('='))
      .filter((part): part is [string, string] => part.length === 2)
      .map(([key, value]) => [key, decodeURIComponent(value)]),
  );
}
