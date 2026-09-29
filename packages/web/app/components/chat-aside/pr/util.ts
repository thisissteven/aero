// app/components/chat-aside/pr/util.ts
//
// Non-component helpers for the GitHub panel, kept out of `shared.tsx` so that
// file can satisfy the "components-only exports" fast-refresh rule.

import type { GitHubAuthor, GitHubUserSummary } from './types';

export function displayName(
  user?: GitHubAuthor | GitHubUserSummary | null,
): string {
  return user?.login ?? 'unknown';
}
