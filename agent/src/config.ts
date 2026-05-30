import type { AgentConfig, ServerCredentials } from './types.js';

const DEFAULT_LIBRARY_ROOT = '/library';

export function loadAgentConfig(): AgentConfig {
  const libraryRoot = process.env.LIBRARY_ROOT?.trim() || DEFAULT_LIBRARY_ROOT;

  return {
    apiTimeoutMs: envNumber('MOVE_AGENT_API_TIMEOUT_MS', 15_000),
    downloadServerUrl: normalizeBaseUrl(process.env.DOWNLOAD_SERVER_URL ?? 'http://server:3000'),
    jobAttempts: envNumber('MOVE_AGENT_JOB_ATTEMPTS', 2),
    jobLimit: envNumber('MOVE_AGENT_LIMIT', 1),
    libraryDisplayRoot: process.env.LIBRARY_DISPLAY_ROOT?.trim() || libraryRoot,
    libraryRoot,
    pollIntervalMs: envNumber('MOVE_AGENT_INTERVAL_MS', 10_000),
    serverCredentials: readServerCredentials(),
    transferTimeoutMs: envNumber('MOVE_AGENT_TRANSFER_TIMEOUT_MS', 30 * 60_000),
  };
}

function normalizeBaseUrl(value: string | undefined) {
  if (!value?.trim()) throw new Error('DOWNLOAD_SERVER_URL is required for mover agent');
  return value.endsWith('/') ? value : `${value}/`;
}

function readServerCredentials(): ServerCredentials {
  const username = process.env.SERVER_USERNAME?.trim();
  const password = process.env.SERVER_PASSWORD?.trim();

  if (!username || !password) {
    throw new Error('SERVER_USERNAME and SERVER_PASSWORD are required for mover agent.');
  }

  return { username, password };
}

function envNumber(name: string, fallback: number) {
  const value = Number(process.env[name]);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}
