import { createWebSocketProxy } from 'crossws';
import { defineWebSocketHandler } from 'nitro';
import { WebSocket } from 'ws';
import { readAuthHeader } from '~/server/auth';

const serverBaseUrl = process.env.API_BASE_URL ?? 'http://127.0.0.1:3001';
const serverWebSocketUrl = new URL('/api/downloads/ws', serverBaseUrl);
serverWebSocketUrl.protocol = serverWebSocketUrl.protocol === 'https:' ? 'wss:' : 'ws:';
const websocketConstructor = WebSocket as unknown as typeof globalThis.WebSocket;

export default defineWebSocketHandler(
  createWebSocketProxy({
    target: serverWebSocketUrl,
    // crossws needs the ws implementation here so proxied Basic Auth headers are preserved.
    WebSocket: websocketConstructor,
    headers: (peer) => {
      const authorization = peer.request.headers.get('authorization') ?? readAuthHeader(peer.request);
      return authorization ? { authorization } : undefined;
    },
  }),
);
