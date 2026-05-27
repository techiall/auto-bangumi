import { QBittorrent } from '@ctrl/qbittorrent';
import type { TorrentFile } from '@ctrl/qbittorrent';
import type { QbittorrentConfig } from '../config/app-config.js';
import { TorrentState } from '@ctrl/shared-torrent';
import type { Episode } from '../mikan/episode.js';
import { fetchWithRetry } from '../utils/fetch-with-retry.js';
import { logger } from '../config/logger.js';

export interface QBittorrentTorrent {
  torrentHash: string;
  state: TorrentState;
  downloadPath: string;

  canMove(): boolean;
}

export class QBittorrentApi {
  private readonly client: QBittorrent;

  constructor(config: QbittorrentConfig) {
    this.client = this.createApiClient(config);
  }

  private createApiClient(config: QbittorrentConfig) {
    const client = new QBittorrent({
      baseUrl: `${config.ssl ? 'https' : 'http'}://${config.host}:${config.port}`,
      username: config.username,
      password: config.password,
    });
    client.getApiVersion().then((version) => {
      logger.info(`Connected to qBittorrent ${version}`);
    });
    return client;
  }

  async findByTorrent(hash: string) {
    try {
      const torrent = await this.client.getTorrent(hash);
      return {
        torrentHash: hash,
        state: torrent.state,
        downloadPath: torrent.raw.content_path,
        canMove(): boolean {
          return this.state === TorrentState.seeding || this.state === TorrentState.unknown;
        },
      } as QBittorrentTorrent;
    } catch (e) {
      if ((e as Error).message == 'Torrent not found') return undefined;

      throw e;
    }
  }

  getTorrent(hash: string) {
    return this.client.getTorrent(hash);
  }

  torrentFiles(hash: string): Promise<TorrentFile[]> {
    return this.client.torrentFiles(hash);
  }

  removeTorrent(hash: string, deleteFiles = false): Promise<boolean> {
    return this.client.removeTorrent(hash, deleteFiles);
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
        await this.client.addTorrent(await this.fetchEnclosure(episode.enclosureUrl));
      }
    }
  }
}
