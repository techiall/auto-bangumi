import { QBittorrentApi } from "./download.js";
import path from "node:path";
import fs from "node:fs";
import { Config, loadConfig } from "./config.js";
import { logger } from "./config/winston.js";
import { db, SeasonEpisodeManager, State } from "./db.js";
import { Season } from "./season.js";
import { numberDisplayString } from "./number.js";

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
            const manager = db.data.manager.find(e => e.episode.torrent === episode.torrent);
            if (!manager || manager.state === State.MOVED) {
                continue;
            }
            await this.moveEpisode(manager);
        }
    }

    private seasonDisplayString() {
        return `${this.season.title} S${numberDisplayString(this.season.number)}`;
    }

    private async moveEpisode(manager: SeasonEpisodeManager) {
        const episode = manager.episode;

        const torrent = await this.api.findByTorrent(episode.torrent);
        if (!torrent) {
            logger.warn(`${this.seasonDisplayString()}E${numberDisplayString(episode.number)} not found in qBittorrent, skipping move`);
            return;
        }

        if (!torrent.canMove()) {
            logger.warn(`${this.seasonDisplayString()}E${numberDisplayString(episode.number)} not finished downloading, skipping move`);
            return;
        }

        const target = path.join(this.config.move.root, this.season.title, `Season ${numberDisplayString(this.season.number)}`);
        fs.mkdirSync(target, {recursive: true});

        const src = await this.api.getTorrent(episode.torrent).then(torrent => torrent.raw.content_path) as string;
        if (fs.lstatSync(src).isDirectory()) {
            logger.warn(`${this.seasonDisplayString()}E${numberDisplayString(episode.number)} is a directory, skipping move`);
            return;
        }

        const extname = path.extname(src);
        const targetPath = path.join(target, `${numberDisplayString(episode.number)}${extname}`);

        fs.copyFileSync(src, targetPath, fs.constants.COPYFILE_FICLONE);

        manager.state = State.MOVED;
        await db.write()
    }
}

export async function moveTask() {
    const config = loadConfig();
    const api = new QBittorrentApi(config.download);

    for (const season of db.data.seasons) {
        await new Move(config, api, season).move();
    }
}
