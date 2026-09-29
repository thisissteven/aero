// app/components/chat-aside/changes/types.ts
//
// Shapes for the working-tree changes panel. The git status/summary responses
// are loosely typed at the hook boundary, so these mirror the fields the panel
// reads.

export interface DiffStatEntry {
  path: string;
  additions: number;
  deletions: number;
}

export interface GitStatusFile {
  path: string;
  index: string;
  working_dir: string;
}

export interface GitStatusShape {
  currentBranch?: string | null;
  files?: GitStatusFile[];
  diffStats?: {
    staged?: Record<string, DiffStatEntry>;
    working?: Record<string, DiffStatEntry>;
  };
  not_added?: string[];
}

export interface ChangeEntry {
  path: string;
  index: string;
  working: string;
  staged: boolean;
  untracked: boolean;
  additions: number;
  deletions: number;
}

export type ChipColor = 'accent' | 'danger' | 'default' | 'success' | 'warning';
