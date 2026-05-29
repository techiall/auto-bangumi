import { logger } from '../config/logger.js';
import { startDownloadTask } from '../tasks/download-task.js';
import { startDownloadReconciliation } from '../tasks/move-task.js';
import { createApp } from './app.js';
import { attachDownloadWebSocket } from './downloads-ws.js';

const port = Number(process.env.API_PORT ?? 3000);
const configPath = process.env.CONFIG_PATH ?? 'config/config.yaml';
const dbPath = process.env.DB_PATH ?? 'db/db.json';

const server = createApp({ configPath, dbPath }).listen(port, () => {
  logger.info(`Backend server is running on http://localhost:${port}`);
});

attachDownloadWebSocket(server, { configPath, dbPath });
startDownloadTask({ configPath, dbPath });
startDownloadReconciliation();
