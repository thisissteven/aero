/** Standardize path separators to forward slashes and remove trailing slashes */
export function normalizePath(path: string): string {
  if (!path) return path;

  const normalized = path.replace(/\\/g, '/');
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
