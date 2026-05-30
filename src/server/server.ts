import './config/env.js';
import { logger } from './config/logger.js';
import { startDownloadTask } from './tasks/download-task.js';
import { createApp, createMoverApp } from './app.js';
import { attachDownloadWebSocket } from './downloads-ws.js';
import { startMoveJobSync } from './move-job-sync.js';

const port = Number(process.env.API_PORT ?? 3000);
const moverPort = Number(process.env.MOVER_API_PORT ?? 0);
const dbPath = process.env.DB_PATH ?? 'db/state.sqlite';

const server = createApp({ dbPath }).listen(port, () => {
  logger.info(`Download server is running on http://localhost:${port}`);
});

attachDownloadWebSocket(server, { dbPath });
startDownloadTask({ dbPath });
startMoveJobSync({ dbPath });

if (moverPort > 0) {
  createMoverApp({ dbPath }).listen(moverPort, () => {
    logger.info(`Mover API is running on http://localhost:${moverPort}`);
  });
}
