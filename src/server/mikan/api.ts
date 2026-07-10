import * as cheerio from 'cheerio';
import { fetchWithRetry } from '../utils/fetch-with-retry.js';
import { suggestFolderName } from './anime-title.js';
import type {
  MikanBangumiDetail,
  MikanBangumiGroup,
  MikanDayOfWeek,
  MikanSearchResult,
  MikanSeasonBrowse,
  MikanSeasonDayGroup,
} from './types.js';

const MIKAN_BASE_URL = 'https://mikanani.me';

export async function searchBangumi(query: string): Promise<MikanSearchResult[]> {
  const keyword = query.trim();
  if (!keyword) return [];

  const html = await fetchHtml(`/Home/Search?searchstr=${encodeURIComponent(keyword)}`);
  const $ = cheerio.load(html);
  const results = new Map<number, MikanSearchResult>();

  for (const selector of ['.sk-bangumi', '.an-ul']) {
    $(selector).each((_, container) => {
      collectBangumiFromContainer($, container, results);
    });
  }

  return Array.from(results.values());
}

export async function browseCurrentSeason(now = new Date()): Promise<MikanSeasonBrowse> {
  const html = await fetchHtml('/');
  const $ = cheerio.load(html);
  const groupsByDay = new Map<MikanDayOfWeek, MikanSearchResult[]>();

  $('.sk-bangumi[data-dayofweek]').each((_, container) => {
    const dayOfWeek = parseDayOfWeek($(container).attr('data-dayofweek'));
    if (dayOfWeek === undefined) return;

    const items = new Map<number, MikanSearchResult>();
    collectBangumiFromContainer($, container, items);
    if (!items.size) return;

    const existing = groupsByDay.get(dayOfWeek) ?? [];
    for (const item of items.values()) {
      if (!existing.some((entry) => entry.id === item.id)) existing.push(item);
    }
    groupsByDay.set(dayOfWeek, existing);
  });

  const today = now.getDay() as MikanDayOfWeek;
  const weekdayOrder = Array.from({ length: 7 }, (_, offset) => ((today + offset) % 7) as MikanDayOfWeek);
  const groups: MikanSeasonDayGroup[] = [];

  for (const dayOfWeek of [...weekdayOrder, 7, 8] as MikanDayOfWeek[]) {
    const items = groupsByDay.get(dayOfWeek);
    if (!items?.length) continue;
    groups.push({ dayOfWeek, items });
  }

  return {
    seasonLabel: parseSeasonLabel($),
    groups,
  };
}

export async function getBangumiDetail(id: number): Promise<MikanBangumiDetail> {
  const html = await fetchHtml(`/Home/Bangumi/${id}`);
  const $ = cheerio.load(html);

  const title = $('.bangumi-title').clone().children().remove().end().text().trim();
  const rss = absoluteUrl($('.bangumi-title a.mikan-rss').attr('href'));
  const groups = $('.subgroup-text')
    .map((_, element) => {
      const groupId = Number($(element).attr('id'));
      const name = $(element).find('a[href^="/Home/PublishGroup/"]').first().text().trim();
      const groupRss = absoluteUrl($(element).find('a.mikan-rss').first().attr('href'));

      if (!groupId || !name || !groupRss) return undefined;

      return {
        id: groupId,
        name,
        rss: groupRss,
      } satisfies MikanBangumiGroup;
    })
    .get()
    .filter((group): group is MikanBangumiGroup => group !== undefined);

  if (!title || !rss) {
    throw new Error(`Failed to parse bangumi detail for ${id}`);
  }

  return {
    id,
    title,
    folder: await suggestFolderName(title, `Bangumi-${id}`),
    url: `${MIKAN_BASE_URL}/Home/Bangumi/${id}`,
    rss,
    groups,
  };
}

async function fetchHtml(path: string) {
  return fetchWithRetry(`${MIKAN_BASE_URL}${path}`).then((response) => response.text());
}

function collectBangumiFromContainer(
  $: cheerio.CheerioAPI,
  container: unknown,
  results: Map<number, MikanSearchResult>,
) {
  $(container as never)
    .find('a[href^="/Home/Bangumi/"]')
    .each((_, element) => {
      const href = $(element).attr('href');
      const id = parseBangumiId(href);
      if (!id || results.has(id)) return;

      const title =
        $(element).attr('title')?.trim() || $(element).find('.an-text').text().trim() || $(element).text().trim();
      if (!title) return;

      const imageUrl =
        $(element).find('[data-src]').attr('data-src') || $(element).closest('li').find('[data-src]').attr('data-src');

      results.set(id, {
        id,
        title,
        url: absoluteUrl(href),
        imageUrl: imageUrl ? absoluteUrl(imageUrl) : undefined,
      });
    });
}

function parseDayOfWeek(value: string | undefined): MikanDayOfWeek | undefined {
  if (value === undefined) return undefined;
  const day = Number(value);
  if (!Number.isInteger(day) || day < 0 || day > 8) return undefined;
  return day as MikanDayOfWeek;
}

function parseSeasonLabel($: cheerio.CheerioAPI) {
  const label = $('.m-home-tool-left .date-text, #sk-data-nav .date-text')
    .first()
    .clone()
    .children()
    .remove()
    .end()
    .text()
    .replace(/\s+/g, ' ')
    .trim();
  return label || undefined;
}

function parseBangumiId(href: string | undefined) {
  if (!href) return undefined;
  const matched = href.match(/\/Home\/Bangumi\/(\d+)/);
  if (!matched) return undefined;
  return Number(matched[1]);
}

function absoluteUrl(value: string | undefined) {
  if (!value) return '';
  return new URL(value, MIKAN_BASE_URL).toString();
}
