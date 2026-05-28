import type { Config } from '../config/app-config.js';
import type { ActiveEpisode, ActiveEpisodeRecord, CompletedEpisode, CompletedEpisodeRecord } from './db.js';

export function resolveActiveEpisodeMetadata(
  config: Config,
  torrent: string,
  episode: ActiveEpisodeRecord,
): ActiveEpisode {
  const subscription = episode.subscriptionRss
    ? config.subscriptions.find((current) => current.rss === episode.subscriptionRss)
    : undefined;

  if (!subscription) {
    const title = episode.title ?? 'Unknown';
    return {
      torrent,
      number: episode.number,
      enclosureUrl: episode.enclosureUrl,
      title,
      folder: episode.folder ?? title,
      season: episode.season ?? 1,
      subscriptionRss: episode.subscriptionRss,
    };
  }

  return {
    torrent,
    number: episode.number,
    enclosureUrl: episode.enclosureUrl,
    subscriptionRss: episode.subscriptionRss,
    title: subscription.title,
    folder: subscription.folder,
    season: subscription.season,
  };
}

export function resolveCompletedEpisodeMetadata(config: Config, episode: CompletedEpisodeRecord): CompletedEpisode {
  const subscription = episode.subscriptionRss
    ? config.subscriptions.find((current) => current.rss === episode.subscriptionRss)
    : undefined;

  if (!subscription) {
    const title = episode.title ?? 'Unknown';
    return {
      ...episode,
      title,
      folder: episode.folder ?? title,
      season: episode.season ?? 1,
    };
  }

  return {
    ...episode,
    title: subscription.title,
    folder: subscription.folder,
    season: subscription.season,
  };
}
