import path from 'node:path';
import { numberDisplayString } from '../utils/number.js';

export interface LibraryTargetInput {
  folder: string;
  season: number;
  episode: number;
  extension: string;
}

export interface LibraryTargetPath {
  writeDirectory: string;
  writePath: string;
  displayPath: string;
}

export function createLibraryTargetPath(input: LibraryTargetInput): LibraryTargetPath {
  const segments = [input.folder, `Season ${numberDisplayString(input.season)}`];
  const fileName = `${numberDisplayString(input.episode)}${input.extension}`;
  const writeRoot = libraryWriteRoot();
  const displayRoot = libraryDisplayRoot();

  return {
    writeDirectory: path.join(writeRoot, ...segments),
    writePath: path.join(writeRoot, ...segments, fileName),
    displayPath: joinDisplayPath(displayRoot, ...segments, fileName),
  };
}

function libraryWriteRoot() {
  return process.env.LIBRARY_CONTAINER_ROOT?.trim() || process.env.HOST_LIBRARY_ROOT?.trim() || 'library';
}

function libraryDisplayRoot() {
  return process.env.HOST_LIBRARY_ROOT?.trim() || libraryWriteRoot();
}

function joinDisplayPath(root: string, ...segments: string[]) {
  return (isWindowsPath(root) ? path.win32 : path.posix).join(root, ...segments);
}

function isWindowsPath(value: string) {
  return /^[a-z]:[\\/]/i.test(value);
}
