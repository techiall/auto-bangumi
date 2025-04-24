import { logger } from './config/winston.js';
import { moveTask } from './move.js';

async function main() {
  await moveTask();
}

main().catch(logger.error);
