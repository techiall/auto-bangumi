import { QBittorrent } from '@ctrl/qbittorrent';
import type { TorrentFile } from '@ctrl/qbittorrent';
import type { QbittorrentConfig } from '../config/app-config.js';
import { TorrentState } from '@ctrl/shared-torrent';
import type { NormalizedTorrent } from '@ctrl/shared-torrent';
import type { Episode } from '../mikan/episode.js';
import { fetchWithRetry } from '../utils/fetch-with-retry.js';
import { logger } from '../config/logger.js';

const loggedApiConnections = new Set<string>();

export interface QBittorrentTorrent {
  torrentHash: string;
  state: TorrentState;
  rawState: string;
  downloadPath: string;

  canMove(): boolean;
  canCleanupDownloadedFiles(): boolean;
}

export interface QBittorrentTorrentStatus {
  progress: number;
  ratio: number;
  downloadSpeed: number;
  uploadSpeed: number;
  eta: number;
  seedingTime: number;
  state: string;
  stateMessage: string;
  connectedSeeds: number;
  connectedPeers: number;
  totalSeeds: number;
  totalPeers: number;
  totalSize: number;
  totalUploaded: number;
}

export class QBittorrentApi {
  private readonly client: QBittorrent;
  private readonly config: QbittorrentConfig;
  private readonly trackers: string[];
  private readonly trackerUrls: string[];
  private fetchedTrackers?: Promise<string[]>;

  constructor(config: QbittorrentConfig) {
    this.config = config;
    this.client = this.createApiClient(config);
    this.trackers = normalizeTrackers(config.trackers);
    this.trackerUrls = normalizeTrackers(config.trackerUrls);
  }

  private createApiClient(config: QbittorrentConfig) {
    const baseUrl = `${config.ssl ? 'https' : 'http'}://${config.host}:${config.port}`;
    const client = new QBittorrent({
      baseUrl,
      username: config.username,
      password: config.password,
    });

    if (!loggedApiConnections.has(baseUrl)) {
      loggedApiConnections.add(baseUrl);
      client.getApiVersion().then(
        (version) => logger.info(`Connected to qBittorrent ${version}`),
        (error) => {
          loggedApiConnections.delete(baseUrl);
          logger.warn(`Failed to connect to qBittorrent: ${(error as Error).message}`);
        },
      );
    }

    return client;
  }

  async findByTorrent(hash: string) {
    try {
      const torrent = await this.client.getTorrent(hash);
      return this.toTorrent(torrent);
    } catch (e) {
      if ((e as Error).message == 'Torrent not found') return undefined;

      throw e;
    }
  }

  async torrentsByHash() {
    const data = await this.client.getAllData();
    return new Map(data.torrents.map((torrent) => [torrent.id, this.toTorrent(torrent)]));
  }

  getTorrent(hash: string) {
    return this.client.getTorrent(hash);
  }

  async torrentStatus(hash: string): Promise<QBittorrentTorrentStatus | undefined> {
    try {
      const torrent = await this.client.getTorrent(hash);
      return this.toTorrentStatus(torrent);
    } catch (error) {
      if ((error as Error).message === 'Torrent not found') return undefined;
      throw error;
    }
  }

  async torrentStatusesByHash() {
    const data = await this.client.getAllData();
    return new Map(data.torrents.map((torrent) => [torrent.id, this.toTorrentStatus(torrent)]));
  }

  torrentFiles(hash: string): Promise<TorrentFile[]> {
    return this.client.torrentFiles(hash);
  }

  removeTorrent(hash: string, deleteFiles = false): Promise<boolean> {
    return this.client.removeTorrent(hash, deleteFiles);
  }

  async addTrackers(hash: string) {
    const trackers = await this.getTrackers();
    if (!trackers.length) return;
    await this.client.addTrackers(hash, trackers.join('\n'));
  }

  private async getTrackers() {
    this.fetchedTrackers ??= this.fetchConfiguredTrackers();
    return this.fetchedTrackers;
  }

  private async fetchConfiguredTrackers() {
    const remoteTrackers = await Promise.all(
      this.trackerUrls.map(async (url) => {
        try {
          return await fetchTrackerList(url);
        } catch (error) {
          logger.warn(`Failed to fetch tracker list ${url}: ${(error as Error).message}`);
          return [];
        }
      }),
    );

    return normalizeTrackers([...this.trackers, ...remoteTrackers.flat()]);
  }

  private async fetchEnclosure(torrentUrl: string) {
    const buffer = await fetchWithRetry(torrentUrl).then((response) => response.arrayBuffer());
    return new Uint8Array(buffer);
  }

  async download(episode: Episode) {
    try {
      await this.client.getTorrent(episode.torrent);
    } catch (e) {
      if ((e as Error).message === 'Torrent not found') {
        await this.client.addTorrent(await this.fetchEnclosure(episode.enclosureUrl), {
          savepath: this.config.downloadPath,
          useAutoTMM: 'false',
        });
      }
    }
    await this.addTrackers(episode.torrent);
  }

  private toTorrent(torrent: NormalizedTorrent): QBittorrentTorrent {
    const rawState = String(torrent.raw.state ?? torrent.state);

    return {
      torrentHash: torrent.id,
      state: torrent.state,
      rawState,
      downloadPath: torrent.raw.content_path,
      canMove(): boolean {
        return this.state === TorrentState.seeding;
      },
      canCleanupDownloadedFiles(): boolean {
        return ['pausedUP', 'stoppedUP'].includes(rawState);
      },
    };
  }

  private toTorrentStatus(torrent: NormalizedTorrent): QBittorrentTorrentStatus {
    return {
      progress: torrent.progress,
      ratio: torrent.ratio,
      downloadSpeed: torrent.downloadSpeed,
      uploadSpeed: torrent.uploadSpeed,
      eta: torrent.eta,
      seedingTime: Number(torrent.raw.seeding_time ?? 0),
      state: torrent.state,
      stateMessage: torrent.stateMessage,
      connectedSeeds: torrent.connectedSeeds,
      connectedPeers: torrent.connectedPeers,
      totalSeeds: torrent.totalSeeds,
      totalPeers: torrent.totalPeers,
      totalSize: torrent.totalSize,
      totalUploaded: torrent.totalUploaded,
    };
  }
}

function normalizeTrackers(trackers: string[]) {
  return [...new Set(trackers.map((tracker) => tracker.trim()).filter((tracker) => tracker.length > 0))];
}

async function fetchTrackerList(url: string) {
  const text = await fetchWithRetry(url).then((response) => response.text());
  return normalizeTrackers(text.split(/\r?\n/));
}
