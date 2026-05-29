import './config/env.js';
import { logger } from './config/logger.js';
import { createApp } from './app.js';
import { attachDownloadWebSocket } from './downloads-ws.js';

const port = Number(process.env.API_PORT ?? 3000);
const dbPath = process.env.DB_PATH ?? 'db/state.sqlite';

const server = createApp({ dbPath }).listen(port, () => {
  logger.info(`Dev server is running on http://localhost:${port}`);
});

attachDownloadWebSocket(server, { dbPath });
