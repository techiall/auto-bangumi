import { logger } from '../config/logger.js';
import { createApp } from './app.js';

const port = Number(process.env.API_PORT ?? 3000);
const configPath = process.env.CONFIG_PATH ?? 'config/config.yaml';
const dbPath = process.env.DB_PATH ?? 'db/db.json';

createApp({ configPath, dbPath }).listen(port, () => {
  logger.info(`API server is running on http://localhost:${port}`);
});
