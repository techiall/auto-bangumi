import { logger } from '../config/logger.js';

export function runRecurringTask(taskName: string, task: () => Promise<void>, intervalMs: number) {
  let running = false;

  const run = async () => {
    if (running) {
      logger.warn(`${taskName} is still running, skipping this tick`);
      return;
    }

    running = true;
    try {
      await task();
    } catch (error) {
      logger.error(`${taskName} failed: ${(error as Error).message}`);
    } finally {
      running = false;
    }
  };

  void run();
  return setInterval(run, intervalMs);
}
