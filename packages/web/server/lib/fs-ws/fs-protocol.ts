import { z } from 'zod';

export const FsEntryKind = z.enum(['file', 'dir']);
export type FsEntryKind = z.infer<typeof FsEntryKind>;

export const FsEntry = z.object({
  name: z.string(),
  path: z.string(),
  kind: FsEntryKind,
});
export type FsEntry = z.infer<typeof FsEntry>;

// ── Client → Server ────────────────────────────────────────────────────

export const ListRequest = z.object({
  id: z.string(),
  type: z.literal('list'),
  path: z.string(),
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

export const GitStatusRequest = z.object({
  id: z.string(),
  type: z.literal('git:status'),
});
export type GitStatusRequest = z.infer<typeof GitStatusRequest>;

export const WriteFileRequest = z.object({
  id: z.string(),
  type: z.literal('write'),
  path: z.string(),
  contents: z.string(),
});
export type WriteFileRequest = z.infer<typeof WriteFileRequest>;

export const MkdirRequest = z.object({
  id: z.string(),
  type: z.literal('mkdir'),
  path: z.string(),
});
export type MkdirRequest = z.infer<typeof MkdirRequest>;

export const RenameRequest = z.object({
  id: z.string(),
  type: z.literal('rename'),
  from: z.string(),
  to: z.string(),
});
export type RenameRequest = z.infer<typeof RenameRequest>;

export const DeleteRequest = z.object({
  id: z.string(),
  type: z.literal('delete'),
  path: z.string(),
  recursive: z.boolean().default(false),
});
export type DeleteRequest = z.infer<typeof DeleteRequest>;

export const ClientMessage = z.discriminatedUnion('type', [
  ListRequest,
  ReadRequest,
  SearchRequest,
  GitStatusRequest,
  WriteFileRequest,
  MkdirRequest,
  RenameRequest,
  DeleteRequest,
]);
export type ClientMessage = z.infer<typeof ClientMessage>;

// ── Server → Client ────────────────────────────────────────────────────

export const ListResult = z.object({
  id: z.string(),
  type: z.literal('list:result'),
  path: z.string(),
  entries: z.array(FsEntry),
  cursor: z.string().nullable(),
});
export type ListResult = z.infer<typeof ListResult>;

export const ReadResult = z.object({
  id: z.string(),
  type: z.literal('read:result'),
  path: z.string(),
  content: z.string().nullable(),
  size: z.number(),
  truncated: z.boolean(),
  binary: z.boolean(),
  mtimeMs: z.number(),
  mimeType: z.string().nullable(),
});
export type ReadResult = z.infer<typeof ReadResult>;

export const SearchResultMessage = z.object({
  id: z.string(),
  type: z.literal('search:result'),
  matches: z.array(z.string()),
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

export const GitStatusEntrySchema = z.object({
  path: z.string(),
  status: z.enum([
    'added',
    'modified',
    'deleted',
    'renamed',
    'untracked',
    'ignored',
  ]),
});
export type GitStatusEntry = z.infer<typeof GitStatusEntrySchema>;

export const GitStatusResult = z.object({
  id: z.string(),
  type: z.literal('git:status:result'),
  entries: z.array(GitStatusEntrySchema),
});
export type GitStatusResult = z.infer<typeof GitStatusResult>;

export const MutationResult = z.object({
  id: z.string(),
  type: z.literal('mutation:result'),
  path: z.string(),
});
export type MutationResult = z.infer<typeof MutationResult>;

export const ServerMessage = z.discriminatedUnion('type', [
  ListResult,
  ReadResult,
  SearchResultMessage,
  ErrorResult,
  GitStatusResult,
  MutationResult,
]);
export type ServerMessage = z.infer<typeof ServerMessage>;

// ── Shared constants ───────────────────────────────────────────────────

export const READ_MAX_BYTES = 2 * 1024 * 1024;
export const MEDIA_MAX_BYTES = 50 * 1024 * 1024;
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
