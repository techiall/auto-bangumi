import { numberDisplayString } from '../utils/number.js';
import { sanitizePathSegment } from '../utils/path.js';

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
    .map((segment) => sanitizePathSegment(segment) || '_')
    .join('/');
}
