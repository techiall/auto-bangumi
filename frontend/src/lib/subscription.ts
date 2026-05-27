export function splitCommaList(input: string) {
  return input
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

export function asMessage(error: unknown) {
  return error instanceof Error ? error.message : '发生了未知错误。';
}

export function inferMikanBangumiUrl(rss: string) {
  try {
    const bangumiId = new URL(rss).searchParams.get('bangumiId');
    return bangumiId ? `https://mikanani.me/Home/Bangumi/${bangumiId}` : null;
  } catch {
    return null;
  }
}
