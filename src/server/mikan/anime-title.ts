import { sanitizePathSegment } from '../utils/path.js';

interface AniListResponse {
  data?: {
    Media?: {
      title?: {
        romaji?: string | null;
        english?: string | null;
      } | null;
    } | null;
  };
}

interface BangumiTvResponse {
  list?: Array<{
    name?: string;
  }>;
}

export async function suggestFolderName(title: string, fallback: string) {
  const aniListTitle = await searchAniListTitleCandidates(title).catch(() => undefined);
  return normalizeFolderName(aniListTitle ?? fallback);
}

async function searchAniListTitleCandidates(title: string) {
  for (const candidate of buildSearchCandidates(title)) {
    const matched = await searchAniListTitle(candidate);
    if (matched) return matched;
  }

  return undefined;
}

function buildSearchCandidates(title: string) {
  const candidates = Array.from(
    new Set([
      title,
      title.replace(/\s*第[一二三四五六七八九十0-9]+季\s*$/u, '').trim(),
      title.replace(/\s+[一二三四五六七八九十0-9]+\s*$/u, '').trim(),
    ]),
  ).filter((candidate) => candidate.length > 0);

  return candidates;
}

async function searchAniListTitle(title: string) {
  const searchTitle = (await searchBangumiTvTitle(title)) ?? title;
  const response = await fetch('https://graphql.anilist.co', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      query: `
        query ($search: String) {
          Media(search: $search, type: ANIME) {
            title {
              romaji
              english
            }
          }
        }
      `,
      variables: { search: searchTitle },
    }),
  });

  if (!response.ok) return undefined;

  const data = (await response.json()) as AniListResponse;
  const mediaTitle = data.data?.Media?.title;
  return mediaTitle?.romaji ?? mediaTitle?.english ?? searchTitle;
}

async function searchBangumiTvTitle(title: string) {
  const params = new URLSearchParams({
    type: '2',
    responseGroup: 'small',
    max_results: '1',
  });
  const response = await fetch(`https://api.bgm.tv/search/subject/${encodeURIComponent(title)}?${params}`, {
    headers: {
      'User-Agent': 'auto-bangumi/1.0',
    },
  });

  if (!response.ok) return undefined;

  const data = (await response.json()) as BangumiTvResponse;
  return data.list?.[0]?.name;
}

function normalizeFolderName(value: string) {
  return (
    sanitizePathSegment(value, ' ')
      .replace(/\s+/g, ' ')
      .replace(/[. ]+$/g, '')
      .trim() || 'Unknown'
  );
}
