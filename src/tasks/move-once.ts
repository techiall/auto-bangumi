import { logger } from '../config/logger.js';
import { reconcileDownloads } from './move-task.js';

async function main() {
  await reconcileDownloads();
}

main().catch(logger.error);
