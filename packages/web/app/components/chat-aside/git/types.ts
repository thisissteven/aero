// app/components/chat-aside/git/types.ts
//
// Shared shapes for the git panel tabs. The API responses are loosely typed at
// the hook boundary, so these mirror the fields each tab actually reads.

export type Operation = 'merge' | 'rebase';

export type GitSection =
  | 'branches'
  | 'history'
  | 'stashes'
  | 'worktrees'
  | 'remotes';

export interface GitBranch {
  name: string;
  current: boolean;
  commit: string;
  label: string;
}

export interface Worktree {
  path?: string;
  directory?: string;
  branch?: string;
  head?: string;
  isMain?: boolean;
}

export interface Remote {
  name: string;
  refs?: { fetch?: string; push?: string };
}

export interface Stash {
  ref: string;
  message: string;
  relativeTime: string;
}

export interface CommitHistoryEntry {
  sha: string;
  subject: string;
  body: string;
  author: string;
  date: string;
}
