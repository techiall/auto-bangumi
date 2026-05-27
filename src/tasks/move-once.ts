import { logger } from '../config/logger.js';
import { moveTask } from './move-task.js';

async function main() {
  await moveTask();
}

main().catch(logger.error);
