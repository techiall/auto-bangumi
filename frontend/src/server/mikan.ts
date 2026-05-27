import * as cheerio from 'cheerio';

const MIKAN_BASE_URL = 'https://mikanani.me';

export interface MikanSearchResult {
  id: number;
  title: string;
  url: string;
  imageUrl?: string;
}

export interface MikanBangumiGroup {
  id: number;
  name: string;
  rss: string;
}

export interface MikanBangumiDetail {
  id: number;
  title: string;
  url: string;
  rss: string;
  groups: MikanBangumiGroup[];
}

export async function searchBangumi(query: string): Promise<MikanSearchResult[]> {
  const keyword = query.trim();
  const html = keyword
    ? await fetchHtml(`/Home/Search?searchstr=${encodeURIComponent(keyword)}`)
    : await fetchHtml('/');
  const $ = cheerio.load(html);
  const results = new Map<number, MikanSearchResult>();

  for (const selector of ['.sk-bangumi', '.an-ul']) {
    $(selector).each((_, container) => {
      $(container)
        .find('a[href^="/Home/Bangumi/"]')
        .each((__, element) => {
          const href = $(element).attr('href');
          const id = parseBangumiId(href);
          if (!id || results.has(id)) return;

          const title = $(element).find('.an-text').text().trim() || $(element).text().trim();
          const imageUrl = $(element).find('[data-src]').attr('data-src');

          if (!title) return;

          results.set(id, {
            id,
            title,
            url: absoluteUrl(href),
            imageUrl: imageUrl ? absoluteUrl(imageUrl) : undefined,
          });
        });
    });
  }

  return Array.from(results.values());
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
    url: `${MIKAN_BASE_URL}/Home/Bangumi/${id}`,
    rss,
    groups,
  };
}

async function fetchHtml(path: string) {
  const response = await fetch(`${MIKAN_BASE_URL}${path}`);
  if (!response.ok) {
    throw new Error(`Mikan request failed: ${response.status}`);
  }
  return response.text();
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
