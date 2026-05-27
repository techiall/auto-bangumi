import { logger } from '../config/logger.js';
import { createApp } from './app.js';

const port = Number(process.env.API_PORT ?? 3000);
const configPath = process.env.CONFIG_PATH ?? 'config/config.yaml';

createApp({ configPath }).listen(port, () => {
  logger.info(`Dev server is running on http://localhost:${port}`);
});
