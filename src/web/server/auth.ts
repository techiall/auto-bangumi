import { randomBytes } from 'node:crypto';

const AUTH_COOKIE = 'auto_bangumi_session';
const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;
const SESSION_TTL_MS = COOKIE_MAX_AGE_SECONDS * 1000;

interface SessionRecord {
  expiresAt: number;
}

const sessions = new Map<string, SessionRecord>();

export function readAuthHeader(request: Request | undefined) {
  const sessionId = readSessionId(request);
  if (!sessionId || !getValidSession(sessionId)) return undefined;

  const credentials = readUpstreamCredentials();
  if (!credentials) return undefined;

  return `Basic ${Buffer.from(`${credentials.username}:${credentials.password}`).toString('base64')}`;
}

export function createSessionCookie(request: Request) {
  pruneExpiredSessions();
  const sessionId = randomBytes(32).toString('base64url');
  sessions.set(sessionId, { expiresAt: Date.now() + SESSION_TTL_MS });
  return sessionCookieHeader(sessionId, COOKIE_MAX_AGE_SECONDS, isSecureRequest(request));
}

export function clearSessionCookie(request?: Request) {
  const sessionId = readSessionId(request);
  if (sessionId) sessions.delete(sessionId);
  return sessionCookieHeader('', 0, request ? isSecureRequest(request) : false);
}

function readSessionId(request: Request | undefined) {
  const cookie = request?.headers.get('cookie');
  if (!cookie) return undefined;
  return parseCookie(cookie)[AUTH_COOKIE];
}

function getValidSession(sessionId: string) {
  const session = sessions.get(sessionId);
  if (!session) return undefined;
  if (session.expiresAt <= Date.now()) {
    sessions.delete(sessionId);
    return undefined;
  }
  return session;
}

function pruneExpiredSessions() {
  const now = Date.now();
  for (const [sessionId, session] of sessions) {
    if (session.expiresAt <= now) sessions.delete(sessionId);
  }
}

function readUpstreamCredentials() {
  const username = process.env.SERVER_USERNAME?.trim();
  const password = process.env.SERVER_PASSWORD?.trim();
  if (!username || !password) return undefined;
  return { username, password };
}

function sessionCookieHeader(value: string, maxAge: number, secure: boolean) {
  const parts = [
    `${AUTH_COOKIE}=${encodeURIComponent(value)}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${maxAge}`,
  ];
  if (secure) parts.push('Secure');
  return parts.join('; ');
}

function isSecureRequest(request: Request) {
  const forwarded = request.headers.get('x-forwarded-proto')?.split(',')[0]?.trim();
  if (forwarded) return forwarded === 'https';
  return new URL(request.url).protocol === 'https:';
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
