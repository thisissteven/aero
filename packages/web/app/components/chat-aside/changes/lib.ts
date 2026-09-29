// app/components/chat-aside/changes/lib.ts
//
// Pure helpers for deriving change entries and rendering new-file patches.

import { GIT_DIFF_FILE_BREAK_REGEX } from '@pierre/diffs';

import type {
  ChangeEntry,
  ChipColor,
  DiffStatEntry,
  GitStatusShape,
} from './types';

const GIT_DIFF_HEADER =
  /^diff --git (?:"a\/(.+?)"|a\/(.+?)) (?:"b\/(.+?)"|b\/(.+?))$/;

export type PatchFileStatus = 'added' | 'modified' | 'deleted' | 'renamed';

export interface PatchFile {
  path: string;
  patch: string;
  status: PatchFileStatus;
  additions: number;
  deletions: number;
  /** Total line count, used to size lazy-loading placeholders. */
  lines: number;
}

function readStatus(chunk: string): PatchFileStatus {
  if (/^new file mode /m.test(chunk) || /^--- \/dev\/null$/m.test(chunk)) {
    return 'added';
  }
  if (
    /^deleted file mode /m.test(chunk) ||
    /^\+\+\+ \/dev\/null$/m.test(chunk)
  ) {
    return 'deleted';
  }
  if (/^rename (from|to) /m.test(chunk)) return 'renamed';
  return 'modified';
}

function readStats(chunk: string): {
  additions: number;
  deletions: number;
  lines: number;
} {
  const lines = chunk.split('\n');
  let additions = 0;
  let deletions = 0;
  for (const line of lines) {
    if (line.startsWith('+') && !line.startsWith('+++')) additions += 1;
    else if (line.startsWith('-') && !line.startsWith('---')) deletions += 1;
  }
  return { additions, deletions, lines: lines.length };
}

/**
 * Splits a multi-file git patch (e.g. `git show` or a range diff) into one
 * entry per file so each can be rendered with the same block used by the
 * changes panel. Uses Pierre's own file-boundary matcher to stay consistent
 * with how the diffs are parsed downstream.
 */
export function splitPatchByFile(patch: string): PatchFile[] {
  if (!patch.trim()) return [];

  return patch
    .split(GIT_DIFF_FILE_BREAK_REGEX)
    .map((chunk) => chunk.replace(/^\n+/, ''))
    .filter((chunk) => chunk.startsWith('diff --git '))
    .map((chunk) => {
      const header = chunk.slice(0, chunk.indexOf('\n'));
      const match = GIT_DIFF_HEADER.exec(header);
      const filePath =
        match?.[3] ?? match?.[4] ?? match?.[1] ?? match?.[2] ?? '';
      return {
        path: filePath,
        patch: chunk,
        status: readStatus(chunk),
        ...readStats(chunk),
      };
    })
    .filter((file) => file.path);
}

export interface PatchTreeNode {
  /** Display name of the file or directory. */
  name: string;
  /** Full path for files, directory path for directories. */
  path: string;
  type: 'dir' | 'file';
  children: PatchTreeNode[];
  file?: PatchFile;
}

/**
 * Builds a directory tree from a flat patch file list so the sidebar can show
 * nested folders, mirroring the shape of the repository.
 */
export function buildFileTree(files: PatchFile[]): PatchTreeNode[] {
  const root: PatchTreeNode = {
    name: '',
    path: '',
    type: 'dir',
    children: [],
  };

  for (const file of files) {
    const segments = file.path.split('/').filter(Boolean);
    let cursor = root;
    segments.forEach((segment, index) => {
      const isFile = index === segments.length - 1;
      const path = segments.slice(0, index + 1).join('/');
      let node = cursor.children.find(
        (child) =>
          child.name === segment && child.type === (isFile ? 'file' : 'dir'),
      );
      if (!node) {
        node = {
          name: segment,
          path,
          type: isFile ? 'file' : 'dir',
          children: [],
          ...(isFile ? { file } : {}),
        };
        cursor.children.push(node);
      }
      cursor = node;
    });
  }

  // Deliberately keep insertion order: git emits patches in path order, so the
  // flattened tree stays in the same order as the diff sections. Sorting here
  // (directories first) desyncs the two and makes the tree jump around when the
  // active file changes.
  return root.children;
}

export function changeBadge(
  entry: ChangeEntry,
  variant: 'staged' | 'working',
): { letter: string; color: ChipColor } {
  const code = (variant === 'staged' ? entry.index : entry.working) ?? ' ';
  const letter =
    entry.untracked || code === '?'
      ? 'A'
      : code.trim()
        ? code[0].toUpperCase()
        : 'M';
  const color: ChipColor =
    letter === 'A'
      ? 'accent'
      : letter === 'D'
        ? 'danger'
        : letter === 'M'
          ? 'warning'
          : 'default';
  return { letter, color };
}

export function mergeStats(status: GitStatusShape | null | undefined) {
  const merged = new Map<string, { additions: number; deletions: number }>();
  for (const bucketKey of ['staged', 'working'] as const) {
    const bucket = status?.diffStats?.[bucketKey];
    if (!bucket) continue;
    for (const entry of Object.values(bucket)) {
      const prev = merged.get(entry.path) ?? { additions: 0, deletions: 0 };
      merged.set(entry.path, {
        additions: prev.additions + entry.additions,
        deletions: prev.deletions + entry.deletions,
      });
    }
  }
  return merged;
}

export function buildEntries(
  status: GitStatusShape | null | undefined,
  summary: DiffStatEntry[],
): ChangeEntry[] {
  if (!status) return [];

  const stats =
    summary.length > 0
      ? new Map(summary.map((entry) => [entry.path, entry]))
      : mergeStats(status);

  const entries: ChangeEntry[] = (status.files ?? []).map((file) => {
    const index = file.index ?? ' ';
    const working = file.working_dir ?? ' ';
    const untracked = index === '?' && working === '?';
    const staged = index !== ' ' && index !== '?';
    const stat = stats.get(file.path) ?? { additions: 0, deletions: 0 };
    return {
      path: file.path,
      index,
      working,
      staged,
      untracked,
      additions: stat.additions,
      deletions: stat.deletions,
    };
  });

  for (const untracked of status.not_added ?? []) {
    if (!entries.some((e) => e.path === untracked)) {
      entries.push({
        path: untracked,
        index: '?',
        working: '?',
        staged: false,
        untracked: true,
        additions: 0,
        deletions: 0,
      });
    }
  }

  return entries;
}

export function buildNewFilePatch(filePath: string, contents: string): string {
  const body = contents.endsWith('\n') ? contents.slice(0, -1) : contents;
  const header = [
    `diff --git a/${filePath} b/${filePath}`,
    'new file mode 100644',
    '--- /dev/null',
    `+++ b/${filePath}`,
  ];

  if (!body.length) return header.join('\n');

  const lines = body.split('\n');
  return [
    ...header,
    `@@ -0,0 +1,${lines.length} @@`,
    lines.map((line) => `+${line}`).join('\n'),
  ].join('\n');
}

export const CHANGE_DIFF_UNSAFE_CSS = `
:host {
  --diffs-bg-separator-override: var(--default) !important;
  --diffs-bg-context-override: transparent !important;
  --diffs-fg-number-override: var(--muted) !important;
}
`;
