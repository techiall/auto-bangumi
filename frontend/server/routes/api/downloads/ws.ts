import { createWebSocketProxy } from 'crossws';
import { defineWebSocketHandler } from 'nitro';

const backendBaseUrl = process.env.API_BASE_URL ?? 'http://localhost:3000';
const backendWebSocketUrl = new URL('/api/downloads/ws', backendBaseUrl);
backendWebSocketUrl.protocol = backendWebSocketUrl.protocol === 'https:' ? 'wss:' : 'ws:';

export default defineWebSocketHandler(createWebSocketProxy(backendWebSocketUrl));
