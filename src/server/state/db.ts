import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import type { Episode } from '../mikan/episode.js';
import type { SubscriptionConfig } from '../config/app-config.js';

interface EpisodeMetadataFallback {
  title?: string;
  folder?: string;
  season?: number;
}

// Runtime state is stored in SQLite. The in-memory shape intentionally stays
// map-based so callers can update state in small batches before write().
export interface ActiveEpisodeRecord extends Omit<Episode, 'torrent'>, EpisodeMetadataFallback {
  subscriptionRss?: string;
}

export interface ActiveEpisode extends Episode {
  title: string;
  folder: string;
  season: number;
  subscriptionRss?: string;
}

export interface CompletedEpisodeRecord extends EpisodeMetadataFallback {
  number: number;
  movedAt: string;
  qbitRemovedAt?: string;
  targetPath?: string;
  subscriptionRss?: string;
}

export interface CompletedEpisode extends CompletedEpisodeRecord {
  title: string;
  folder: string;
  season: number;
}

export type MoveJobStatus = 'ready' | 'moving' | 'failed';

export interface MoveJobRecord {
  status: MoveJobStatus;
  number: number;
  targetRelativePath: string;
  sourceRemotePath: string;
  subscriptionRss?: string;
  title?: string;
  folder?: string;
  season?: number;
  createdAt: string;
  updatedAt: string;
  attempts: number;
  error?: string;
  leaseExpiresAt?: string;
}

export interface MoveJob extends MoveJobRecord {
  title: string;
  folder: string;
  season: number;
}

export interface Data {
  subscriptions: SubscriptionConfig[];
  active: Record<string, ActiveEpisodeRecord>;
  moveJobs: Record<string, MoveJobRecord>;
  completed: Record<string, CompletedEpisodeRecord>;
}

export interface AppDb {
  data: Data;
  write(): Promise<void>;
  close(): void;
}

export function createDefaultData(): Data {
  return {
    subscriptions: [],
    active: {},
    moveJobs: {},
    completed: {},
  };
}

export async function createDb(dbPath = 'db/state.sqlite'): Promise<AppDb> {
  await fs.promises.mkdir(path.dirname(dbPath), { recursive: true });

  const sqlite = new DatabaseSync(dbPath);
  sqlite.exec('PRAGMA journal_mode = WAL');
  sqlite.exec('PRAGMA foreign_keys = ON');
  ensureSchema(sqlite);

  return new SQLiteStateDb(sqlite);
}

export async function withDb<T>(dbPath: string | undefined, task: (db: AppDb) => T | Promise<T>): Promise<T> {
  const db = await createDb(dbPath);
  try {
    return await task(db);
  } finally {
    db.close();
  }
}

export function isTracked(data: Data, torrent: string) {
  return torrent in data.active || torrent in data.moveJobs || torrent in data.completed;
}

export function completeEpisode(data: Data, torrent: string, targetPath?: string, movedAt = new Date()) {
  const episode = data.active[torrent];
  if (!episode) return;

  data.completed[torrent] = {
    number: episode.number,
    movedAt: movedAt.toISOString(),
    ...(episode.subscriptionRss ? { subscriptionRss: episode.subscriptionRss } : fallbackMetadata(episode)),
    ...(targetPath ? { targetPath } : {}),
  };
  delete data.active[torrent];
  delete data.moveJobs[torrent];
}

export function markQbittorrentRemoved(data: Data, torrent: string, removedAt = new Date()) {
  const episode = data.completed[torrent];
  if (!episode) return;

  episode.qbitRemovedAt = removedAt.toISOString();
}

class SQLiteStateDb implements AppDb {
  data: Data;

  constructor(private readonly sqlite: DatabaseSync) {
    this.data = readState(sqlite);
  }

  async write() {
    writeState(this.sqlite, this.data);
  }

  close() {
    this.sqlite.close();
  }
}

function ensureSchema(db: DatabaseSync) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS active_episodes (
      torrent TEXT PRIMARY KEY,
      number INTEGER NOT NULL,
      enclosure_url TEXT NOT NULL,
      subscription_rss TEXT,
      title TEXT,
      folder TEXT,
      season INTEGER
    );

    CREATE TABLE IF NOT EXISTS move_jobs (
      torrent TEXT PRIMARY KEY,
      status TEXT NOT NULL,
      number INTEGER NOT NULL,
      target_relative_path TEXT NOT NULL,
      source_remote_path TEXT NOT NULL,
      subscription_rss TEXT,
      title TEXT,
      folder TEXT,
      season INTEGER,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      attempts INTEGER NOT NULL,
      error TEXT,
      lease_expires_at TEXT
    );

    CREATE TABLE IF NOT EXISTS completed_episodes (
      torrent TEXT PRIMARY KEY,
      number INTEGER NOT NULL,
      moved_at TEXT NOT NULL,
      qbit_removed_at TEXT,
      target_path TEXT,
      subscription_rss TEXT,
      title TEXT,
      folder TEXT,
      season INTEGER
    );

    CREATE TABLE IF NOT EXISTS subscriptions (
      title TEXT NOT NULL,
      folder TEXT NOT NULL,
      season INTEGER NOT NULL,
      rss TEXT NOT NULL UNIQUE,
      filters_json TEXT,
      archived INTEGER NOT NULL DEFAULT 0
    );
  `);

  migrateSchema(db);
}

function readState(db: DatabaseSync): Data {
  return {
    subscriptions: db
      .prepare('SELECT * FROM subscriptions ORDER BY rowid ASC')
      .all()
      .map((row) => subscriptionFromRow(row as unknown as SubscriptionRow)),
    active: Object.fromEntries(
      db
        .prepare('SELECT * FROM active_episodes ORDER BY rowid ASC')
        .all()
        .map((row) => activeEpisodeFromRow(row as unknown as ActiveEpisodeRow)),
    ),
    moveJobs: Object.fromEntries(
      db
        .prepare('SELECT * FROM move_jobs ORDER BY updated_at DESC, rowid ASC')
        .all()
        .map((row) => moveJobFromRow(row as unknown as MoveJobRow)),
    ),
    completed: Object.fromEntries(
      db
        .prepare('SELECT * FROM completed_episodes ORDER BY moved_at DESC, rowid ASC')
        .all()
        .map((row) => completedEpisodeFromRow(row as unknown as CompletedEpisodeRow)),
    ),
  };
}

function writeState(db: DatabaseSync, data: Data) {
  const normalized = normalizeData(data);

  db.exec('BEGIN IMMEDIATE');
  try {
    db.exec(
      'DELETE FROM subscriptions; DELETE FROM active_episodes; DELETE FROM move_jobs; DELETE FROM completed_episodes;',
    );

    const insertSubscription = db.prepare(`
      INSERT INTO subscriptions (
        title, folder, season, rss, filters_json, archived
      ) VALUES (?, ?, ?, ?, ?, ?)
    `);
    for (const subscription of normalized.subscriptions) {
      insertSubscription.run(
        subscription.title,
        subscription.folder,
        subscription.season,
        subscription.rss,
        subscription.filters?.length ? JSON.stringify(subscription.filters) : null,
        subscription.archived ? 1 : 0,
      );
    }

    const insertActive = db.prepare(`
      INSERT INTO active_episodes (
        torrent, number, enclosure_url, subscription_rss, title, folder, season
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    for (const [torrent, episode] of Object.entries(normalized.active)) {
      insertActive.run(
        torrent,
        episode.number,
        episode.enclosureUrl,
        episode.subscriptionRss ?? null,
        episode.title ?? null,
        episode.folder ?? null,
        episode.season ?? null,
      );
    }

    const insertMoveJob = db.prepare(`
      INSERT INTO move_jobs (
        torrent, status, number, target_relative_path, source_remote_path,
        subscription_rss, title, folder, season, created_at, updated_at, attempts,
        error, lease_expires_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    for (const [torrent, job] of Object.entries(normalized.moveJobs)) {
      insertMoveJob.run(
        torrent,
        job.status,
        job.number,
        job.targetRelativePath,
        job.sourceRemotePath,
        job.subscriptionRss ?? null,
        job.title ?? null,
        job.folder ?? null,
        job.season ?? null,
        job.createdAt,
        job.updatedAt,
        job.attempts,
        job.error ?? null,
        job.leaseExpiresAt ?? null,
      );
    }

    const insertCompleted = db.prepare(`
      INSERT INTO completed_episodes (
        torrent, number, moved_at, qbit_removed_at, target_path,
        subscription_rss, title, folder, season
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    for (const [torrent, episode] of Object.entries(normalized.completed)) {
      insertCompleted.run(
        torrent,
        episode.number,
        episode.movedAt,
        episode.qbitRemovedAt ?? null,
        episode.targetPath ?? null,
        episode.subscriptionRss ?? null,
        episode.title ?? null,
        episode.folder ?? null,
        episode.season ?? null,
      );
    }

    db.exec('COMMIT');
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
}

interface ActiveEpisodeRow {
  torrent: string;
  number: number;
  enclosure_url: string;
  subscription_rss: string | null;
  title: string | null;
  folder: string | null;
  season: number | null;
}

interface SubscriptionRow {
  title: string;
  folder: string;
  season: number;
  rss: string;
  filters_json: string | null;
  archived: number;
}

interface MoveJobRow {
  torrent: string;
  status: string;
  number: number;
  target_relative_path: string;
  source_remote_path: string;
  subscription_rss: string | null;
  title: string | null;
  folder: string | null;
  season: number | null;
  created_at: string;
  updated_at: string;
  attempts: number;
  error: string | null;
  lease_expires_at: string | null;
}

interface CompletedEpisodeRow {
  torrent: string;
  number: number;
  moved_at: string;
  qbit_removed_at: string | null;
  target_path: string | null;
  subscription_rss: string | null;
  title: string | null;
  folder: string | null;
  season: number | null;
}

function activeEpisodeFromRow(row: ActiveEpisodeRow): [string, ActiveEpisodeRecord] {
  return [
    row.torrent,
    normalizeActiveEpisode({
      number: row.number,
      enclosureUrl: row.enclosure_url,
      ...(row.subscription_rss ? { subscriptionRss: row.subscription_rss } : {}),
      ...(row.title ? { title: row.title } : {}),
      ...(row.folder ? { folder: row.folder } : {}),
      ...(row.season ? { season: row.season } : {}),
    }),
  ];
}

function subscriptionFromRow(row: SubscriptionRow): SubscriptionConfig {
  return normalizeSubscription({
    title: row.title,
    folder: row.folder,
    season: row.season,
    rss: row.rss,
    filters: row.filters_json ? (JSON.parse(row.filters_json) as string[]) : undefined,
    archived: row.archived === 1,
  });
}

function moveJobFromRow(row: MoveJobRow): [string, MoveJobRecord] {
  return [
    row.torrent,
    normalizeMoveJob({
      status: row.status as MoveJobStatus,
      number: row.number,
      targetRelativePath: row.target_relative_path,
      sourceRemotePath: row.source_remote_path,
      ...(row.subscription_rss ? { subscriptionRss: row.subscription_rss } : {}),
      ...(row.title ? { title: row.title } : {}),
      ...(row.folder ? { folder: row.folder } : {}),
      ...(row.season ? { season: row.season } : {}),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      attempts: row.attempts,
      ...(row.error ? { error: row.error } : {}),
      ...(row.lease_expires_at ? { leaseExpiresAt: row.lease_expires_at } : {}),
    }),
  ];
}

function completedEpisodeFromRow(row: CompletedEpisodeRow): [string, CompletedEpisodeRecord] {
  return [
    row.torrent,
    normalizeCompletedEpisode({
      number: row.number,
      movedAt: row.moved_at,
      ...(row.qbit_removed_at ? { qbitRemovedAt: row.qbit_removed_at } : {}),
      ...(row.target_path ? { targetPath: row.target_path } : {}),
      ...(row.subscription_rss ? { subscriptionRss: row.subscription_rss } : {}),
      ...(row.title ? { title: row.title } : {}),
      ...(row.folder ? { folder: row.folder } : {}),
      ...(row.season ? { season: row.season } : {}),
    }),
  ];
}

function normalizeData(data: Partial<Data>): Data {
  return {
    subscriptions: (data.subscriptions ?? []).map(normalizeSubscription),
    active: Object.fromEntries(
      Object.entries(data.active ?? {}).map(([torrent, episode]) => [torrent, normalizeActiveEpisode(episode)]),
    ),
    moveJobs: Object.fromEntries(
      Object.entries(data.moveJobs ?? {}).map(([torrent, job]) => [torrent, normalizeMoveJob(job)]),
    ),
    completed: Object.fromEntries(
      Object.entries(data.completed ?? {}).map(([torrent, episode]) => [torrent, normalizeCompletedEpisode(episode)]),
    ),
  };
}

function normalizeSubscription(subscription: SubscriptionConfig): SubscriptionConfig {
  return {
    title: subscription.title,
    folder: subscription.folder?.trim() || subscription.title,
    season: subscription.season ?? 1,
    rss: subscription.rss,
    filters: subscription.filters?.filter((filter) => filter.length > 0) || undefined,
    archived: subscription.archived === true,
  };
}

function normalizeActiveEpisode(episode: ActiveEpisodeRecord | ActiveEpisode): ActiveEpisodeRecord {
  return {
    number: episode.number,
    enclosureUrl: episode.enclosureUrl,
    ...(episode.subscriptionRss ? { subscriptionRss: episode.subscriptionRss } : fallbackMetadata(episode)),
  };
}

function normalizeCompletedEpisode(episode: CompletedEpisodeRecord | CompletedEpisode): CompletedEpisodeRecord {
  const targetPath = normalizeDisplayTargetPath(episode.targetPath);

  return {
    number: episode.number,
    movedAt: episode.movedAt,
    ...(episode.qbitRemovedAt ? { qbitRemovedAt: episode.qbitRemovedAt } : {}),
    ...(targetPath ? { targetPath } : {}),
    ...(episode.subscriptionRss ? { subscriptionRss: episode.subscriptionRss } : fallbackMetadata(episode)),
  };
}

function normalizeMoveJob(job: MoveJobRecord): MoveJobRecord {
  return {
    status: ['ready', 'moving', 'failed'].includes(job.status) ? job.status : 'ready',
    number: job.number,
    targetRelativePath: job.targetRelativePath,
    sourceRemotePath: job.sourceRemotePath,
    ...(job.subscriptionRss ? { subscriptionRss: job.subscriptionRss } : fallbackMetadata(job)),
    createdAt: job.createdAt ?? new Date(0).toISOString(),
    updatedAt: job.updatedAt ?? new Date(0).toISOString(),
    attempts: Number.isInteger(job.attempts) ? job.attempts : 0,
    ...(job.error ? { error: job.error } : {}),
    ...(job.leaseExpiresAt ? { leaseExpiresAt: job.leaseExpiresAt } : {}),
  };
}

function migrateSchema(db: DatabaseSync) {
  db.exec(`
    DROP TABLE IF EXISTS metadata;
    DROP INDEX IF EXISTS idx_active_subscription_rss;
    DROP INDEX IF EXISTS idx_move_jobs_status;
    DROP INDEX IF EXISTS idx_completed_subscription_rss;
    DROP INDEX IF EXISTS idx_subscriptions_archived;
  `);

  if (hasColumn(db, 'move_jobs', 'extension')) {
    db.exec(`
      DROP TABLE IF EXISTS move_jobs_next;

      CREATE TABLE move_jobs_next (
        torrent TEXT PRIMARY KEY,
        status TEXT NOT NULL,
        number INTEGER NOT NULL,
        target_relative_path TEXT NOT NULL,
        source_remote_path TEXT NOT NULL,
        subscription_rss TEXT,
        title TEXT,
        folder TEXT,
        season INTEGER,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        attempts INTEGER NOT NULL,
        error TEXT,
        lease_expires_at TEXT
      );

      INSERT INTO move_jobs_next (
        torrent, status, number, target_relative_path, source_remote_path,
        subscription_rss, title, folder, season, created_at, updated_at,
        attempts, error, lease_expires_at
      )
      SELECT
        torrent, status, number, target_relative_path, source_remote_path,
        subscription_rss, title, folder, season, created_at, updated_at,
        attempts, error, lease_expires_at
      FROM move_jobs;

      DROP TABLE move_jobs;
      ALTER TABLE move_jobs_next RENAME TO move_jobs;
    `);
  }

  if (hasColumn(db, 'subscriptions', 'created_at') || hasColumn(db, 'subscriptions', 'id')) {
    db.exec(`
      DROP TABLE IF EXISTS subscriptions_next;

      CREATE TABLE subscriptions_next (
        title TEXT NOT NULL,
        folder TEXT NOT NULL,
        season INTEGER NOT NULL,
        rss TEXT NOT NULL UNIQUE,
        filters_json TEXT,
        archived INTEGER NOT NULL DEFAULT 0
      );

      INSERT INTO subscriptions_next (title, folder, season, rss, filters_json, archived)
      SELECT title, folder, season, rss, filters_json, archived
      FROM subscriptions
      ORDER BY rowid ASC;

      DROP TABLE subscriptions;
      ALTER TABLE subscriptions_next RENAME TO subscriptions;
    `);
  }
}

function hasColumn(db: DatabaseSync, table: string, column: string) {
  return db
    .prepare(`PRAGMA table_info(${table})`)
    .all()
    .some((row) => {
      return (row as { name?: string }).name === column;
    });
}

function normalizeDisplayTargetPath(targetPath: string | undefined) {
  if (!targetPath?.startsWith('/library/')) return targetPath;

  const displayRoot = process.env.LIBRARY_DISPLAY_ROOT?.trim();
  if (!displayRoot) return targetPath;

  const relativePath = targetPath.slice('/library/'.length);
  if (/^[a-z]:[\\/]/i.test(displayRoot) || displayRoot.includes('\\')) {
    return path.win32.join(displayRoot, relativePath);
  }

  return path.posix.join(displayRoot, relativePath);
}

function fallbackMetadata(episode: EpisodeMetadataFallback): Required<EpisodeMetadataFallback> {
  const title = episode.title ?? 'Unknown';
  return {
    title,
    folder: episode.folder ?? title,
    season: episode.season ?? 1,
  };
}
