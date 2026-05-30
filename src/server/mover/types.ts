export interface MoverJobPayload {
  id: string;
  title: string;
  folder: string;
  season: number;
  episode: number;
  sourceUrl: string;
  sourceHeaders: Record<string, string>;
  targetRelativePath: string;
  attempts: number;
}
