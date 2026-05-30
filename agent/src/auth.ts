import type { ServerCredentials } from './types.js';

export function basicAuthorizationHeader(credentials: ServerCredentials) {
  return {
    Authorization: `Basic ${Buffer.from(`${credentials.username}:${credentials.password}`).toString('base64')}`,
  };
}
