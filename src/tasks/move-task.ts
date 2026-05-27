import { QBittorrentApi } from '../qbittorrent/api.js';
import path from 'node:path';
import fs from 'node:fs';
import { loadConfig } from '../config/app-config.js';
import type { Config } from '../config/app-config.js';
import { logger } from '../config/logger.js';
import { completeEpisode, db } from '../state/db.js';
import type { ActiveEpisode } from '../state/db.js';
import { numberDisplayString } from '../utils/number.js';
import { buildFileServerUrl, copyFromFileServer, pickDownloadedFile } from '../files/file-transfer.js';

export class Move {
  private readonly config: Config;
  private readonly api: QBittorrentApi;

  constructor(config: Config, api: QBittorrentApi) {
    this.config = config;
    this.api = api;
  }

  async move() {
    for (const episode of Object.values(db.data.active)) {
      await this.moveEpisode(episode);
    }
  }

  private episodeDisplayString(episode: ActiveEpisode) {
    return `${episode.title} S${numberDisplayString(episode.season)}E${numberDisplayString(episode.number)}`;
  }

  private async moveEpisode(episode: ActiveEpisode) {
    const torrent = await this.api.findByTorrent(episode.torrent);
    if (!torrent) {
      logger.warn(`${this.episodeDisplayString(episode)} not found in qBittorrent, skipping move`);
      return;
    }

    if (!torrent.canMove()) {
      logger.warn(`${this.episodeDisplayString(episode)} not finished downloading, skipping move`);
      return;
    }

    const rawTorrent = await this.api.getTorrent(episode.torrent);
    const files = await this.api.torrentFiles(episode.torrent);
    const downloadedFile = pickDownloadedFile(rawTorrent.raw.content_path as string, files);
    const targetPath = this.createTargetPath(episode, downloadedFile.extension);

    if (this.config.qbittorrent.fileServer) {
      const url = buildFileServerUrl(this.config.qbittorrent, downloadedFile.remotePath);
      await copyFromFileServer(this.config.qbittorrent.fileServer, url, targetPath);
    } else {
      if (fs.lstatSync(downloadedFile.remotePath).isDirectory()) {
        logger.warn(`${this.episodeDisplayString(episode)} is a directory, skipping move`);
        return;
      }
      fs.copyFileSync(downloadedFile.remotePath, targetPath, fs.constants.COPYFILE_FICLONE);
    }

    await this.api.removeTorrent(episode.torrent, true);

    completeEpisode(db.data, episode.torrent);
    await db.write();
  }

  private createTargetPath(episode: ActiveEpisode, extension: string) {
    const target = path.join(this.config.library.root, episode.title, `Season ${numberDisplayString(episode.season)}`);
    fs.mkdirSync(target, { recursive: true });
    return path.join(target, `${numberDisplayString(episode.number)}${extension}`);
  }
}

export async function moveTask() {
  const config = loadConfig();
  const api = new QBittorrentApi(config.qbittorrent);
  await new Move(config, api).move();
}
