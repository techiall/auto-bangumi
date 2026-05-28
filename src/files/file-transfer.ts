import type { TorrentFile } from '@ctrl/qbittorrent';
import fs from 'node:fs';
import path from 'node:path';
import { pipeline } from 'node:stream/promises';
import { Readable } from 'node:stream';
import { ReadableStream } from 'node:stream/web';
import type { QbittorrentConfig, FileServerConfig } from '../config/app-config.js';
import { fetchWithRetry } from '../utils/fetch-with-retry.js';

const videoExtensions = new Set(['.mkv', '.mp4', '.avi', '.mov', '.m4v', '.ts']);

export interface DownloadedFile {
  remotePath: string;
  extension: string;
}

export function pickDownloadedFile(contentPath: string, files: TorrentFile[]): DownloadedFile {
  const completedFiles = files.filter((file) => file.progress >= 1 && file.priority > 0);
  const candidates = completedFiles.length ? completedFiles : files.filter((file) => file.priority > 0);
  const selected = [...candidates].sort((a, b) => scoreTorrentFile(b) - scoreTorrentFile(a))[0];

  if (!selected) {
    return {
      remotePath: normalizeRemotePath(contentPath),
      extension: path.extname(contentPath),
    };
  }

  const normalizedContentPath = normalizeRemotePath(contentPath);
  const contentPathLooksLikeFile = path.posix.extname(normalizedContentPath).length > 0;
  const remotePath = contentPathLooksLikeFile
    ? normalizedContentPath
    : resolveTorrentFilePath(normalizedContentPath, selected.name);

  return {
    remotePath,
    extension: path.posix.extname(selected.name) || path.posix.extname(normalizedContentPath),
  };
}

export function buildFileServerUrl(config: QbittorrentConfig, remotePath: string): string {
  if (!config.fileServer) {
    throw new Error('qbittorrent.fileServer is not configured');
  }

  const fileServer = config.fileServer;
  const root = normalizeRemotePath(fileServer.root ?? config.downloadPath);
  const normalizedRemotePath = normalizeRemotePath(remotePath);
  const relativePath = toRelativeRemotePath(normalizedRemotePath, root);
  const protocol = fileServer.ssl ? 'https' : 'http';
  const basePath = normalizeUrlBasePath(fileServer.basePath);
  const encodedPath = relativePath.split('/').map(encodeURIComponent).join('/');

  return `${protocol}://${fileServer.host}:${fileServer.port}${basePath}/${encodedPath}`;
}

export async function copyFromFileServer(fileServer: FileServerConfig, url: string, targetPath: string) {
  const headers = authorizationHeaders(fileServer);
  const response = await fetchWithRetry(url, { headers }).catch((error: unknown) => {
    throw new Error(`Failed to copy ${url} to ${targetPath}: ${(error as Error).message}`);
  });

  if (!response.body) {
    throw new Error(`File server returned an empty response body: ${url}`);
  }

  await pipeline(Readable.fromWeb(response.body as ReadableStream), fs.createWriteStream(targetPath));
}

function scoreTorrentFile(file: TorrentFile) {
  const extname = path.posix.extname(file.name).toLowerCase();
  const videoBonus = videoExtensions.has(extname) ? Number.MAX_SAFE_INTEGER / 2 : 0;
  return videoBonus + file.size;
}

function normalizeRemotePath(value: string) {
  return value.replaceAll('\\', '/').replace(/\/+$/, '');
}

function joinRemotePath(root: string, relativePath: string) {
  return `${root}/${normalizeRemotePath(relativePath).replace(/^\/+/, '')}`;
}

function resolveTorrentFilePath(contentPath: string, fileName: string) {
  const normalizedFileName = normalizeRemotePath(fileName).replace(/^\/+/, '');
  const contentFolderName = path.posix.basename(contentPath);

  if (normalizedFileName === contentFolderName || normalizedFileName.startsWith(`${contentFolderName}/`)) {
    return joinRemotePath(path.posix.dirname(contentPath), normalizedFileName);
  }

  return joinRemotePath(contentPath, normalizedFileName);
}

function toRelativeRemotePath(remotePath: string, root: string) {
  if (remotePath === root) {
    return path.posix.basename(remotePath);
  }

  if (!remotePath.startsWith(`${root}/`)) {
    throw new Error(`Torrent path "${remotePath}" is outside file server root "${root}"`);
  }

  return remotePath.slice(root.length + 1);
}

function normalizeUrlBasePath(basePath: string | undefined) {
  if (!basePath) {
    return '';
  }

  return `/${basePath.replace(/^\/+|\/+$/g, '')}`;
}

function authorizationHeaders(fileServer: FileServerConfig): Record<string, string> {
  if (!fileServer.username || !fileServer.password) {
    return {};
  }

  return {
    Authorization: `Basic ${Buffer.from(`${fileServer.username}:${fileServer.password}`).toString('base64')}`,
  };
}
