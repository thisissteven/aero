import { z } from 'zod';

/**
 * Shared client/server protocol for the lazy file-tree WebSocket.
 * Import this from both the Hono route and the browser client so the
 * message shapes can never drift.
 */

export const FsEntryKind = z.enum(['file', 'dir']);
export type FsEntryKind = z.infer<typeof FsEntryKind>;

export const FsEntry = z.object({
  name: z.string(),
  /** Path relative to the connection's root, posix-style, no leading slash. */
  path: z.string(),
  kind: FsEntryKind,
});
export type FsEntry = z.infer<typeof FsEntry>;

// ---------------------------------------------------------------------------
// Client -> Server
// ---------------------------------------------------------------------------

export const ListRequest = z.object({
  id: z.string(),
  type: z.literal('list'),
  /** '' means the connection's root directory. Non-recursive: immediate
   * children only. */
  path: z.string(),
  /** Opaque pagination cursor returned by a previous list:result. */
  cursor: z.string().optional(),
});
export type ListRequest = z.infer<typeof ListRequest>;

export const ReadRequest = z.object({
  id: z.string(),
  type: z.literal('read'),
  path: z.string(),
});
export type ReadRequest = z.infer<typeof ReadRequest>;

export const SearchRequest = z.object({
  id: z.string(),
  type: z.literal('search'),
  query: z.string().min(1),
  maxResults: z.number().int().positive().max(2000).default(500),
});
export type SearchRequest = z.infer<typeof SearchRequest>;

export const ClientMessage = z.discriminatedUnion('type', [
  ListRequest,
  ReadRequest,
  SearchRequest,
]);
export type ClientMessage = z.infer<typeof ClientMessage>;

// ---------------------------------------------------------------------------
// Server -> Client
// ---------------------------------------------------------------------------

export const ListResult = z.object({
  id: z.string(),
  type: z.literal('list:result'),
  path: z.string(),
  entries: z.array(FsEntry),
  /** Non-null means there are more entries; pass back as `cursor` to page. */
  cursor: z.string().nullable(),
});
export type ListResult = z.infer<typeof ListResult>;

export const ReadResult = z.object({
  id: z.string(),
  type: z.literal('read:result'),
  path: z.string(),
  /** null when the file was detected as binary. */
  content: z.string().nullable(),
  size: z.number(),
  truncated: z.boolean(),
  binary: z.boolean(),
  mtimeMs: z.number(),
});
export type ReadResult = z.infer<typeof ReadResult>;

export const SearchResultMessage = z.object({
  id: z.string(),
  type: z.literal('search:result'),
  matches: z.array(z.string()),
  /** false for incremental batches, true on the final message. */
  done: z.boolean(),
});
export type SearchResultMessage = z.infer<typeof SearchResultMessage>;

export const ErrorResult = z.object({
  id: z.string(),
  type: z.literal('error'),
  message: z.string(),
  code: z.enum(['ENOENT', 'EACCES', 'EINVAL', 'UNKNOWN']).default('UNKNOWN'),
});
export type ErrorResult = z.infer<typeof ErrorResult>;

export const ServerMessage = z.discriminatedUnion('type', [
  ListResult,
  ReadResult,
  SearchResultMessage,
  ErrorResult,
]);
export type ServerMessage = z.infer<typeof ServerMessage>;

// ---------------------------------------------------------------------------
// Shared constants
// ---------------------------------------------------------------------------

export const READ_MAX_BYTES = 2 * 1024 * 1024; // 2MB
export const LIST_PAGE_SIZE = 500;

export const DEFAULT_IGNORED_DIRS = new Set([
  'node_modules',
  '.git',
  'dist',
  'build',
  'out',
  '.next',
  '.turbo',
  '.cache',
  'coverage',
]);
