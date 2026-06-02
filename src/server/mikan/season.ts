import { EpisodeParse } from './episode.js';
import type { SubscriptionConfig } from '../config/app-config.js';
import Parser from 'rss-parser';
import type { Item } from 'rss-parser';
import { fetchWithRetry } from '../utils/fetch-with-retry.js';
import type { Episode, Season } from './types.js';

const rssParser = new Parser();

export class SeasonParse {
  private readonly subscription: SubscriptionConfig;

  constructor(subscription: SubscriptionConfig) {
    this.subscription = subscription;
  }

  async parse(): Promise<Season> {
    const response = await fetchWithRetry(toCacheBustedRssUrl(this.subscription.rss));
    const feed = await rssParser.parseString(await response.text());

    const episodes = await Promise.all(
      feed.items.filter((episode) => this.matchEpisode(episode)).map((episode) => new EpisodeParse(episode).parse()),
    );
    return {
      title: this.subscription.title,
      folder: this.subscription.folder,
      number: this.subscription.season,
      subscriptionRss: this.subscription.rss,
      episodes: episodes.filter((episode): episode is Episode => episode !== undefined),
    };
  }

  private matchEpisode(episode: Item): boolean {
    if (!this.subscription.filters?.length) return true;
    return this.subscription.filters.every((match) => (episode.title ?? '').includes(match));
  }
}

function toCacheBustedRssUrl(rssUrl: string, timestamp = Date.now()) {
  const url = new URL(rssUrl);
  url.searchParams.set('t', timestamp.toString());
  return url.toString();
}
