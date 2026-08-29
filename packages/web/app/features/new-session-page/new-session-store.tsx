import { create } from 'zustand';

import { AeroWorkspaceSummary } from '@/server/services/harness/types';

interface NewSessionState {
  selectedWorkspace?: AeroWorkspaceSummary;
  selectedWorktree?: string;

  setSelectedWorkspace: (workspace?: AeroWorkspaceSummary) => void;
  setSelectedWorktree: (worktree?: string) => void;
}

export const useNewSessionStore = create<NewSessionState>((set) => ({
  setSelectedWorkspace: (workspace) =>
    set(() => ({ selectedWorkspace: workspace, selectedWorktree: undefined })),

  setSelectedWorktree: (worktree) =>
    set(() => ({ selectedWorktree: worktree })),
}));
