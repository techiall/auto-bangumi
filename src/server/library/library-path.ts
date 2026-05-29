import { numberDisplayString } from '../utils/number.js';

export interface LibraryTargetInput {
  folder: string;
  season: number;
  episode: number;
  extension: string;
}

export function createLibraryTargetRelativePath(input: LibraryTargetInput): string {
  return [
    input.folder,
    `Season ${numberDisplayString(input.season)}`,
    `${numberDisplayString(input.episode)}${input.extension}`,
  ]
    .map((segment) => segment.replace(/[<>:"/\\|?*\u0000-\u001F]/g, '_').trim() || '_')
    .join('/');
}
