import { spawn } from 'node:child_process';
import { logger } from './config/logger.js';

interface ChildProcessConfig {
  name: string;
  command: string;
  args: string[];
  env?: NodeJS.ProcessEnv;
}

const children = [
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

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, () => {
    shutdown(signal);
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
    if (shuttingDown) return;

    logger.error(`${config.name} exited unexpectedly${formatExit(code, signal)}`);
    shutdown('SIGTERM');
    process.exitCode = code ?? 1;
  });

  return child;
}

function shutdown(signal: NodeJS.Signals) {
  shuttingDown = true;
  for (const child of children) {
    if (!child.killed) child.kill(signal);
  }
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
