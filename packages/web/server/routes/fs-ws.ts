import type { Dirent } from 'node:fs';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import type { WebSocket, WebSocketServer } from 'ws';

import {
  ClientMessage,
  DEFAULT_IGNORED_DIRS,
  FsEntry,
  LIST_PAGE_SIZE,
  MEDIA_MAX_BYTES,
  READ_MAX_BYTES,
  ServerMessage,
} from '../../server/lib/fs-ws/fs-protocol';

interface FsSession {
  root: string;
}

async function resolveRoot(rawRoot: string): Promise<string> {
  const abs = path.resolve(rawRoot);
  const real = await fs.realpath(abs);
  const stat = await fs.stat(real);

  if (!stat.isDirectory()) {
    throw new Error('root is not a directory');
  }

  return real;
}

async function resolveSafe(
  session: FsSession,
  relativePath: string,
): Promise<string> {
  const candidate = path.resolve(session.root, relativePath || '.');

  if (
    candidate !== session.root &&
    !candidate.startsWith(session.root + path.sep)
  ) {
    throw new Error('path escapes root');
  }

  try {
    const real = await fs.realpath(candidate);

    if (real !== session.root && !real.startsWith(session.root + path.sep)) {
      throw new Error('path escapes root (symlink)');
    }

    return real;
  } catch (err) {
    if (err instanceof Error && err.message.includes('escapes root')) {
      throw err;
    }

    return candidate;
  }
}

function toRelative(session: FsSession, absolute: string): string {
  return path.relative(session.root, absolute).split(path.sep).join('/');
}

function shouldSkip(name: string): boolean {
  if (DEFAULT_IGNORED_DIRS.has(name)) return true;

  if (name.startsWith('.') && name !== '.env' && name !== '.gitignore') {
    return true;
  }

  return false;
}

async function handleList(
  session: FsSession,
  msg: Extract<ClientMessage, { type: 'list' }>,
): Promise<ServerMessage> {
  const dirAbs = await resolveSafe(session, msg.path);
  const dirents = await fs.readdir(dirAbs, { withFileTypes: true });

  const entries: FsEntry[] = dirents
    .filter((d) => !shouldSkip(d.name))
    .map((d) => ({
      name: d.name,
      path: msg.path ? `${msg.path}/${d.name}` : d.name,
      kind: d.isDirectory() ? ('dir' as const) : ('file' as const),
    }))
    .sort((a, b) => {
      if (a.kind !== b.kind) return a.kind === 'dir' ? -1 : 1;
      return a.name.localeCompare(b.name);
    });

  const startIndex = msg.cursor ? Number.parseInt(msg.cursor, 10) : 0;

  const page = entries.slice(startIndex, startIndex + LIST_PAGE_SIZE);

  const nextCursor =
    startIndex + LIST_PAGE_SIZE < entries.length
      ? String(startIndex + LIST_PAGE_SIZE)
      : null;

  return {
    id: msg.id,
    type: 'list:result',
    path: msg.path,
    entries: page,
    cursor: nextCursor,
  };
}

function looksBinary(buffer: Buffer): boolean {
  const len = Math.min(buffer.length, 8000);

  for (let i = 0; i < len; i += 1) {
    if (buffer[i] === 0) return true;
  }

  return false;
}

const MEDIA_MIME_TYPES: Record<string, string> = {
  // Images
  '.apng': 'image/apng',
  '.avif': 'image/avif',
  '.bmp': 'image/bmp',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.jpeg': 'image/jpeg',
  '.jpg': 'image/jpeg',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',

  // PDF
  '.pdf': 'application/pdf',

  // Audio
  '.aac': 'audio/aac',
  '.flac': 'audio/flac',
  '.m4a': 'audio/mp4',
  '.mp3': 'audio/mpeg',
  '.oga': 'audio/ogg',
  '.ogg': 'audio/ogg',
  '.opus': 'audio/ogg',
  '.wav': 'audio/wav',
  '.weba': 'audio/webm',

  // Video
  '.m4v': 'video/x-m4v',
  '.mov': 'video/quicktime',
  '.mp4': 'video/mp4',
  '.mpeg': 'video/mpeg',
  '.mpg': 'video/mpeg',
  '.ogv': 'video/ogg',
  '.webm': 'video/webm',
};

function getMediaMimeType(filePath: string): string | null {
  return MEDIA_MIME_TYPES[path.extname(filePath).toLowerCase()] ?? null;
}

async function handleRead(
  session: FsSession,
  msg: Extract<ClientMessage, { type: 'read' }>,
): Promise<ServerMessage> {
  const fileAbs = await resolveSafe(session, msg.path);
  const stat = await fs.stat(fileAbs);

  if (!stat.isFile()) {
    throw new Error('not a file');
  }

  const mimeType = getMediaMimeType(fileAbs);
  const isMedia = mimeType !== null;

  const maxBytes = isMedia ? MEDIA_MAX_BYTES : READ_MAX_BYTES;
  const truncated = stat.size > maxBytes;
  const bytesToRead = Math.min(stat.size, maxBytes);

  const fh = await fs.open(fileAbs, 'r');

  try {
    const buffer = Buffer.alloc(bytesToRead);

    await fh.read(buffer, 0, bytesToRead, 0);

    if (isMedia) {
      return {
        id: msg.id,
        type: 'read:result',
        path: msg.path,
        content: truncated ? null : buffer.toString('base64'),
        size: stat.size,
        truncated,
        binary: true,
        mtimeMs: stat.mtimeMs,
        mimeType,
      };
    }

    const binary = looksBinary(buffer);

    return {
      id: msg.id,
      type: 'read:result',
      path: msg.path,
      content: binary ? null : buffer.toString('utf8'),
      size: stat.size,
      truncated,
      binary,
      mtimeMs: stat.mtimeMs,
      mimeType: null,
    };
  } finally {
    await fh.close();
  }
}

async function handleSearch(
  session: FsSession,
  msg: Extract<ClientMessage, { type: 'search' }>,
  onBatch: (matches: string[], done: boolean) => void,
): Promise<void> {
  const query = msg.query.toLowerCase();
  let buffer: string[] = [];
  let total = 0;

  async function walk(dirAbs: string): Promise<void> {
    if (total >= msg.maxResults) return;

    let dirents: Dirent[];

    try {
      dirents = await fs.readdir(dirAbs, { withFileTypes: true });
    } catch {
      return;
    }

    for (const d of dirents) {
      if (total >= msg.maxResults) return;
      if (shouldSkip(d.name)) continue;

      const abs = path.join(dirAbs, d.name);

      if (d.isDirectory()) {
        await walk(abs);
      } else if (d.name.toLowerCase().includes(query)) {
        buffer.push(toRelative(session, abs));
        total += 1;

        if (buffer.length >= 50) {
          onBatch(buffer, false);
          buffer = [];
        }
      }
    }
  }

  await walk(session.root);
  onBatch(buffer, true);
}

function send(ws: WebSocket, message: ServerMessage): void {
  if (ws.readyState === ws.OPEN) {
    ws.send(JSON.stringify(message));
  }
}

export function setupFsWebSocket(wss: WebSocketServer): void {
  wss.on('connection', async (ws, req) => {
    let session: FsSession | null = null;

    const url = new URL(req.url || '', `http://${req.headers.host}`);

    const rawRoot = url.searchParams.get('root');

    if (!rawRoot) {
      send(ws, {
        id: '',
        type: 'error',
        message: 'missing root',
        code: 'EINVAL',
      });

      ws.close();
      return;
    }

    try {
      session = {
        root: await resolveRoot(rawRoot),
      };
    } catch {
      send(ws, {
        id: '',
        type: 'error',
        message: 'invalid root directory',
        code: 'EINVAL',
      });

      ws.close();
      return;
    }

    ws.on('message', async (data) => {
      if (!session) return;

      let parsed: ClientMessage;

      try {
        parsed = ClientMessage.parse(JSON.parse(String(data)));
      } catch {
        return;
      }

      try {
        if (parsed.type === 'list') {
          send(ws, await handleList(session, parsed));
        } else if (parsed.type === 'read') {
          send(ws, await handleRead(session, parsed));
        } else if (parsed.type === 'search') {
          await handleSearch(session, parsed, (matches, done) => {
            send(ws, {
              id: parsed.id,
              type: 'search:result',
              matches,
              done,
            });
          });
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'unknown error';

        const code = message.includes('ENOENT')
          ? ('ENOENT' as const)
          : message.includes('EACCES')
            ? ('EACCES' as const)
            : ('UNKNOWN' as const);

        send(ws, {
          id: parsed.id,
          type: 'error',
          message,
          code,
        });
      }
    });

    ws.on('close', () => {
      session = null;
    });
  });
}
