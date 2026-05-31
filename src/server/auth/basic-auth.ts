import type express from 'express';
import { timingSafeEqual } from 'node:crypto';
import type { BasicAuthCredentials } from './types.js';

const AUTH_REALM = 'Auto Bangumi';

export function readServerCredentials(): BasicAuthCredentials {
  const username = process.env.SERVER_USERNAME?.trim();
  const password = process.env.SERVER_PASSWORD?.trim();

  if (!username || !password) {
    throw new Error('SERVER_USERNAME and SERVER_PASSWORD are required.');
  }

  return { username, password };
}

export function requireBasicAuth(credentials: BasicAuthCredentials): express.RequestHandler {
  return (request, response, next) => {
    if (isAuthorizedBasicAuthHeader(request.header('authorization'), credentials)) {
      next();
      return;
    }

    response.setHeader('WWW-Authenticate', basicAuthChallengeHeader());
    response.status(401).json({ message: 'Authentication required.' });
  };
}

export function basicAuthChallengeHeader() {
  return `Basic realm="${AUTH_REALM}", charset="UTF-8"`;
}

export function basicAuthorizationHeader(username: string, password: string) {
  return `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`;
}

export function isAuthorizedBasicAuthHeader(
  authorization: string | string[] | undefined,
  credentials: BasicAuthCredentials,
) {
  if (Array.isArray(authorization)) return false;
  if (!authorization?.startsWith('Basic ')) return false;

  const supplied = parseBasicAuth(authorization.slice('Basic '.length));
  if (!supplied) return false;

  return safeEqual(supplied.username, credentials.username) && safeEqual(supplied.password, credentials.password);
}

function parseBasicAuth(value: string) {
  const decoded = Buffer.from(value, 'base64').toString('utf8');
  const separatorIndex = decoded.indexOf(':');
  if (separatorIndex < 0) return undefined;

  return {
    username: decoded.slice(0, separatorIndex),
    password: decoded.slice(separatorIndex + 1),
  };
}

function safeEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}
