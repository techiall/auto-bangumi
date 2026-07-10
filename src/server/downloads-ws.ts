import type { Server } from 'node:http';
import { WebSocket, WebSocketServer } from 'ws';
import { basicAuthChallengeHeader, isAuthorizedBasicAuthHeader, readServerCredentials } from './auth/basic-auth.js';
import { logger } from './config/logger.js';
import { DownloadService } from './downloads.js';
import type { DownloadWebSocketOptions } from './downloads/types.js';

export function attachDownloadWebSocket(server: Server, options: DownloadWebSocketOptions) {
  const path = options.path ?? '/api/downloads/ws';
  const intervalMs = options.intervalMs ?? Number(process.env.DOWNLOADS_WS_INTERVAL_MS ?? 2000);
  const service = new DownloadService(options.dbPath);
  const credentials = readServerCredentials();
  const wss = new WebSocketServer({ noServer: true });

  server.on('upgrade', (request, socket, head) => {
    if (!request.url || new URL(request.url, 'http://localhost').pathname !== path) return;
    if (!isAuthorizedBasicAuthHeader(request.headers.authorization, credentials)) {
      socket.write(`HTTP/1.1 401 Unauthorized\r\nWWW-Authenticate: ${basicAuthChallengeHeader()}\r\n\r\n`);
      socket.destroy();
      return;
    }

    wss.handleUpgrade(request, socket, head, (client) => {
      wss.emit('connection', client, request);
    });
  });

  wss.on('connection', (client) => {
    let closed = false;
    let inFlight = false;
    let lastPayload: string | undefined;

    const publish = async (force = false) => {
      if (closed || inFlight || client.readyState !== WebSocket.OPEN) return;
      inFlight = true;
      try {
        const payload = JSON.stringify({ type: 'state', data: await service.state() });
        if (!force && payload === lastPayload) return;
        lastPayload = payload;
        client.send(payload);
      } catch (error) {
        const message = (error as Error).message;
        logger.warn(`Failed to publish download state over WebSocket: ${message}`);
        sendIfOpen(client, JSON.stringify({ type: 'error', message }));
      } finally {
        inFlight = false;
      }
    };

    const timer = setInterval(() => {
      void publish();
    }, intervalMs);

    client.on('message', (message) => {
      if (message.toString() === 'refresh') void publish(true);
    });

    client.on('close', () => {
      closed = true;
      clearInterval(timer);
    });

    void publish(true);
  });
}

function sendIfOpen(client: WebSocket, message: string) {
  if (client.readyState === WebSocket.OPEN) client.send(message);
}
