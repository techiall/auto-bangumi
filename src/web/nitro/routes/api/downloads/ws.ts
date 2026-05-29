import { createWebSocketProxy } from 'crossws';
import { defineWebSocketHandler } from 'nitro';

const serverBaseUrl = process.env.API_BASE_URL ?? 'http://127.0.0.1:3001';
const serverWebSocketUrl = new URL('/api/downloads/ws', serverBaseUrl);
serverWebSocketUrl.protocol = serverWebSocketUrl.protocol === 'https:' ? 'wss:' : 'ws:';

export default defineWebSocketHandler(createWebSocketProxy(serverWebSocketUrl));
