import { spawn, type ChildProcess } from 'node:child_process';
import { logger } from './config/logger.js';

interface ChildProcessConfig {
  name: string;
  command: string;
  args: string[];
  env?: NodeJS.ProcessEnv;
}

const children: ChildProcess[] = [
  startChild({
    name: 'server',
    command: 'node',
    args: ['dist/server/server.js'],
    env: {
      API_PORT: process.env.API_PORT ?? '3001',
    },
  }),
  startChild({
    name: 'web',
    command: 'node',
    args: ['.output/server/index.mjs'],
    env: {
      HOST: process.env.HOST ?? '0.0.0.0',
      PORT: process.env.PORT ?? '3000',
      API_BASE_URL: process.env.API_BASE_URL ?? 'http://127.0.0.1:3001',
    },
  }),
];

let shuttingDown = false;
let shutdownTimer: NodeJS.Timeout | undefined;

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, () => {
    shutdown(signal, 0);
  });
}

function startChild(config: ChildProcessConfig) {
  const child = spawn(config.command, config.args, {
    env: {
      ...process.env,
      ...config.env,
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  child.stdout?.on('data', (data: Buffer) => writeChildOutput(config.name, data));
  child.stderr?.on('data', (data: Buffer) => writeChildOutput(config.name, data));
  child.on('exit', (code, signal) => {
    if (shuttingDown) {
      exitWhenChildrenStopped();
      return;
    }

    logger.error(`${config.name} exited unexpectedly${formatExit(code, signal)}`);
    shutdown('SIGTERM', code ?? 1);
  });

  child.on('error', (error) => {
    logger.error(`${config.name} failed to start: ${error.message}`);
    shutdown('SIGTERM', 1);
  });

  return child;
}

function shutdown(signal: NodeJS.Signals, exitCode: number) {
  process.exitCode = exitCode;
  if (shuttingDown) return;

  shuttingDown = true;
  for (const child of children) {
    if (isRunning(child)) child.kill(signal);
  }

  shutdownTimer = setTimeout(() => {
    process.exit(process.exitCode ?? exitCode);
  }, 5_000);
  shutdownTimer.unref();
  exitWhenChildrenStopped();
}

function exitWhenChildrenStopped() {
  if (!children.every((child) => !isRunning(child))) return;

  if (shutdownTimer) clearTimeout(shutdownTimer);
  process.exit(process.exitCode ?? 0);
}

function isRunning(child: ChildProcess) {
  return child.exitCode === null && child.signalCode === null && !child.killed;
}

function writeChildOutput(name: string, data: Buffer) {
  for (const line of data.toString().split(/\r?\n/)) {
    if (line.trim()) process.stdout.write(`[${name}] ${line}\n`);
  }
}

function formatExit(code: number | null, signal: NodeJS.Signals | null) {
  if (signal) return ` after ${signal}`;
  if (code !== null) return ` with code ${code}`;
  return '';
}
