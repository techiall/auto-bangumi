import type { Server } from 'node:http';
import { WebSocket, WebSocketServer } from 'ws';
import { logger } from './config/logger.js';
import { DownloadService } from './downloads.js';

export interface DownloadWebSocketOptions {
  dbPath: string;
  path?: string;
  intervalMs?: number;
}

export function attachDownloadWebSocket(server: Server, options: DownloadWebSocketOptions) {
  const path = options.path ?? '/api/downloads/ws';
  const intervalMs = options.intervalMs ?? Number(process.env.DOWNLOADS_WS_INTERVAL_MS ?? 2000);
  const service = new DownloadService(options.dbPath);
  const wss = new WebSocketServer({ noServer: true });

  server.on('upgrade', (request, socket, head) => {
    if (!request.url || new URL(request.url, 'http://localhost').pathname !== path) return;

    wss.handleUpgrade(request, socket, head, (client) => {
      wss.emit('connection', client, request);
    });
  });

  wss.on('connection', (client) => {
    let closed = false;
    let inFlight = false;

    const publish = async () => {
      if (closed || inFlight || client.readyState !== WebSocket.OPEN) return;
      inFlight = true;
      try {
        client.send(JSON.stringify({ type: 'state', data: await service.state() }));
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
      if (message.toString() === 'refresh') void publish();
    });

    client.on('close', () => {
      closed = true;
      clearInterval(timer);
    });

    void publish();
  });
}

function sendIfOpen(client: WebSocket, message: string) {
  if (client.readyState === WebSocket.OPEN) client.send(message);
}
