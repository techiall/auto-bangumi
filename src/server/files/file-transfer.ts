import type { TorrentFile } from '@ctrl/qbittorrent';
import path from 'node:path';
import type { QbittorrentConfig, FileServerConfig } from '../config/app-config.js';

export interface DownloadedFile {
  remotePath: string;
  extension: string;
}

export function pickDownloadedFile(contentPath: string, files: TorrentFile[]): DownloadedFile {
  const completedFiles = files.filter((file) => file.progress >= 1 && file.priority > 0);
  const candidates = completedFiles.length ? completedFiles : files.filter((file) => file.priority > 0);
  const selected = [...candidates].sort((a, b) => b.size - a.size)[0];

  if (!selected) {
    return {
      remotePath: normalizeRemotePath(contentPath),
      extension: path.extname(contentPath),
    };
  }

  const normalizedContentPath = normalizeRemotePath(contentPath);
  const remotePath = resolveTorrentFilePath(normalizedContentPath, selected.name);

  return {
    remotePath,
    extension: path.posix.extname(selected.name) || path.posix.extname(normalizedContentPath),
  };
}

export function buildFileServerUrl(config: QbittorrentConfig, remotePath: string): string {
  const fileServer = config.fileServer;
  const root = normalizeRemotePath(fileServer.root ?? config.downloadPath);
  const normalizedRemotePath = normalizeRemotePath(remotePath);
  const relativePath = toRelativeRemotePath(normalizedRemotePath, root);
  const protocol = fileServer.ssl ? 'https' : 'http';
  const basePath = normalizeUrlBasePath(fileServer.basePath);
  const encodedPath = relativePath.split('/').map(encodeURIComponent).join('/');

  return `${protocol}://${fileServer.host}:${fileServer.port}${basePath}/${encodedPath}`;
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

  if (normalizedFileName === contentFolderName) {
    return contentPath;
  }

  if (normalizedFileName.startsWith(`${contentFolderName}/`)) {
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

export function fileServerAuthorizationHeaders(fileServer: FileServerConfig): Record<string, string> {
  if (!fileServer.username || !fileServer.password) {
    return {};
  }

  return {
    Authorization: `Basic ${Buffer.from(`${fileServer.username}:${fileServer.password}`).toString('base64')}`,
  };
}
