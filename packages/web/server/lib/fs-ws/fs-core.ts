import { execFile } from 'node:child_process';
import type { Dirent } from 'node:fs';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { promisify } from 'node:util';

import {
  ClientMessage,
  DEFAULT_IGNORED_DIRS,
  FsEntry,
  LIST_PAGE_SIZE,
  MEDIA_MAX_BYTES,
  READ_MAX_BYTES,
  ServerMessage,
} from './fs-protocol';

const execFileAsync = promisify(execFile);

export interface FsSession {
  root: string;
}

export async function resolveRoot(rawRoot: string): Promise<string> {
  const abs = path.resolve(rawRoot);
  const real = await fs.realpath(abs);
  const stat = await fs.stat(real);
  if (!stat.isDirectory()) throw new Error('root is not a directory');
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
    if (err instanceof Error && err.message.includes('escapes root')) throw err;
    return candidate;
  }
}

/**
 * Same containment check as `resolveSafe`, but without the realpath round-trip.
 * Used for creation paths where the target does not yet exist on disk.
 */
function resolveSafeForWrite(session: FsSession, relativePath: string): string {
  const candidate = path.resolve(session.root, relativePath || '.');
  if (
    candidate !== session.root &&
    !candidate.startsWith(session.root + path.sep)
  ) {
    throw new Error('path escapes root');
  }
  return candidate;
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

// ── List / Read / Search (unchanged) ───────────────────────────────────

export async function handleList(
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
  '.pdf': 'application/pdf',
  '.aac': 'audio/aac',
  '.flac': 'audio/flac',
  '.m4a': 'audio/mp4',
  '.mp3': 'audio/mpeg',
  '.oga': 'audio/ogg',
  '.ogg': 'audio/ogg',
  '.opus': 'audio/ogg',
  '.wav': 'audio/wav',
  '.weba': 'audio/webm',
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

export async function handleRead(
  session: FsSession,
  msg: Extract<ClientMessage, { type: 'read' }>,
): Promise<ServerMessage> {
  const fileAbs = await resolveSafe(session, msg.path);
  const stat = await fs.stat(fileAbs);
  if (!stat.isFile()) throw new Error('not a file');

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

export async function handleSearch(
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

// ── Git status ─────────────────────────────────────────────────────────

export interface GitStatusEntry {
  path: string;
  status:
    | 'added'
    | 'modified'
    | 'deleted'
    | 'renamed'
    | 'untracked'
    | 'ignored';
}

export async function handleGitStatus(
  session: FsSession,
): Promise<GitStatusEntry[]> {
  try {
    // `--ignored=matching` lists top-level ignored entries (e.g. `node_modules/`)
    // without recursing into them, which is what the tree wants to display.
    const { stdout } = await execFileAsync(
      'git',
      [
        '-C',
        session.root,
        'status',
        '--porcelain=v1',
        '-z',
        '--ignored=matching',
      ],
      { maxBuffer: 32 * 1024 * 1024 },
    );
    return parseGitStatus(stdout);
  } catch {
    // Not a git repo, or git isn't installed, or the command timed out.
    return [];
  }
}

function parseGitStatus(stdout: string): GitStatusEntry[] {
  const out: GitStatusEntry[] = [];
  const parts = stdout.split('\0');
  let i = 0;
  while (i < parts.length) {
    const line = parts[i++];
    if (!line || line.length < 3) continue;
    const code = line.slice(0, 2);
    const filePath = line.slice(3);
    // Renames / copies put the original path in the following NUL-separated
    // slot. We only care about the destination path, so skip the origin.
    if (code[0] === 'R' || code[0] === 'C') i++;
    out.push({ path: filePath, status: mapGitCode(code) });
  }
  return out;
}

function mapGitCode(code: string): GitStatusEntry['status'] {
  if (code === '??') return 'untracked';
  if (code === '!!') return 'ignored';
  // Prefer the index status (first char) when present, otherwise the worktree
  // status (second char). This matches how VS Code's git extension maps them.
  const primary = code[0] !== ' ' ? code[0] : code[1];
  switch (primary) {
    case 'A':
      return 'added';
    case 'M':
      return 'modified';
    case 'D':
      return 'deleted';
    case 'R':
      return 'renamed';
    case 'C':
      return 'modified';
    default:
      return 'modified';
  }
}

// ── Mutations ──────────────────────────────────────────────────────────

export async function handleWriteFile(
  session: FsSession,
  msg: Extract<ClientMessage, { type: 'write' }>,
): Promise<string> {
  const abs = resolveSafeForWrite(session, msg.path);
  await fs.mkdir(path.dirname(abs), { recursive: true });
  await fs.writeFile(abs, msg.contents, 'utf8');
  return msg.path;
}

export async function handleMkdir(
  session: FsSession,
  msg: Extract<ClientMessage, { type: 'mkdir' }>,
): Promise<string> {
  const abs = resolveSafeForWrite(session, msg.path);
  await fs.mkdir(abs, { recursive: true });
  return msg.path;
}

export async function handleRename(
  session: FsSession,
  msg: Extract<ClientMessage, { type: 'rename' }>,
): Promise<string> {
  const fromAbs = await resolveSafe(session, msg.from);
  const toAbs = resolveSafeForWrite(session, msg.to);
  await fs.mkdir(path.dirname(toAbs), { recursive: true });
  await fs.rename(fromAbs, toAbs);
  return msg.to;
}

export async function handleDelete(
  session: FsSession,
  msg: Extract<ClientMessage, { type: 'delete' }>,
): Promise<string> {
  const abs = await resolveSafe(session, msg.path);
  await fs.rm(abs, { recursive: msg.recursive, force: false });
  return msg.path;
}

// ── Errors ─────────────────────────────────────────────────────────────

export function classifyError(err: unknown): 'ENOENT' | 'EACCES' | 'UNKNOWN' {
  const message = err instanceof Error ? err.message : 'unknown error';
  if (message.includes('ENOENT')) return 'ENOENT';
  if (message.includes('EACCES')) return 'EACCES';
  return 'UNKNOWN';
}

export function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : 'unknown error';
}
