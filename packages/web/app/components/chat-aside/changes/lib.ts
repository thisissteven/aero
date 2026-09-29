// app/components/chat-aside/changes/lib.ts
//
// Pure helpers for deriving change entries and rendering new-file patches.

import type {
  ChangeEntry,
  ChipColor,
  DiffStatEntry,
  GitStatusShape,
} from './types';

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
