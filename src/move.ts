import { Season, SeasonParse } from "./season.js";
import { Episode } from "./episode.js";
import { QBittorrentApi } from "./download.js";
import path from "node:path";
import fs from "node:fs";
import { Config, loadConfig } from "./config.js";
import { logger } from "./config/winston.js";

export class Move {
    private readonly config: Config
    private readonly api: QBittorrentApi
    private readonly season: Season

    constructor(config: Config, api: QBittorrentApi, season: Season) {
        this.config = config;
        this.api = api;
        this.season = season;
    }

    async move() {
        for (const episode of this.season.episodes) {
            await this.moveEpisode(episode);
        }
    }

    private async moveEpisode(episode: Episode) {
        const torrent = await this.api.findByTorrent(episode.torrent);
        if (!torrent) {
            logger.warn(`${this.season.displayString()}E${episode.numberDisplayString()} not found in qBittorrent, skipping move`);
            return;
        }

        if (!torrent.canMove()) {
            logger.warn(`${this.season.displayString()}E${episode.numberDisplayString()} not finished downloading, skipping move`);
            return;
        }

        const target = path.join(this.config.move.root, this.season.title, `Season ${this.season.numberDisplayString()}`);
        fs.mkdirSync(target, {recursive: true});

        const src = await this.api.getTorrent(episode.torrent).then(torrent => torrent.raw.content_path);
        const extname = path.extname(src);
        const targetPath = path.join(target, `${episode.numberDisplayString()}${extname}`);

        logger.info(`Will move ${torrent.downloadPath} to ${targetPath}`);

        fs.copyFileSync(src, targetPath, fs.constants.COPYFILE_FICLONE);
    }
}

export async function moveTask() {
    const config = loadConfig();

    const api = new QBittorrentApi(config.download);

    const seasons = await Promise.all(
        config.seasons.map(season => new SeasonParse(season).parse())
    );

    for (const season of seasons) {
        await new Move(config, api, season).move()
    }
}


