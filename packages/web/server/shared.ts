import { AeroWorktreeSummary } from '@/server/services/harness/types';

/** Standardize path separators to forward slashes and remove trailing slashes */
export function normalizePath(path: string): string {
  if (!path) return path;

  const normalized = path.replace(/\\+/g, '/');
  return normalized.endsWith('/') && normalized.length > 1
    ? normalized.slice(0, -1)
    : normalized;
}

/** Extract the last folder name from a path */
export function getBasename(path: string): string {
  const normalized = normalizePath(path);
  return normalized.split('/').filter(Boolean).pop() || '';
}

export const WORKTREE_PATH = {
  opencode: '.local/share/opencode/worktree',
  codex: '.local/share/codex/worktree',
  claude: '.local/share/claude/worktree',
};

export function isWorktree(path: string) {
  const normalized = normalizePath(path);
  return (
    normalized.includes(WORKTREE_PATH.opencode) ||
    normalized.includes(WORKTREE_PATH.codex) ||
    normalized.includes(WORKTREE_PATH.claude)
  );
}

export function capitalizeFirstLetter(str: string) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export function toPascalCase(str: string) {
  return str
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

export const NEW_SESSION_PAGE_SESSION_ID = 'new-session-page';

// Dedupe by id, keeping the first occurrence. This guards against upstream
// pagination ("show more sessions") returning a page that overlaps with
// sessions already loaded — duplicate ids inside the same Sidebar collection
// cause its internal collection state to thrash on every render, which shows
// up as "Maximum update depth exceeded" the moment that node expands.
export function dedupeById<T extends { id: string | number }>(items: T[]): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const item of items) {
    const key = String(item.id);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  return out;
}

// Dedupe worktrees by *directory*, not just id. The original code picked
// `root` by matching `directory`, but filtered non-root worktrees by `id` —
// two different keys for the same concept. If the backend ever emits two
// worktree records pointing at the same directory (stale entry, race on
// worktree add/remove, etc.) the old logic would silently render both:
// once folded into "root" sessions, once again as a full worktree branch,
// with colliding derived ids. Keying everything off directory make both the
// root pick and the exclusion filter agree.
export function dedupeWorktreesByDirectory(
  worktrees: AeroWorktreeSummary[],
): AeroWorktreeSummary[] {
  const seen = new Set<string>();
  const out: AeroWorktreeSummary[] = [];
  for (const worktree of worktrees) {
    if (seen.has(worktree.directory)) continue;
    seen.add(worktree.directory);
    out.push(worktree);
  }
  return out;
}
