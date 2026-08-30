import { create } from 'zustand';

import { AeroWorkspaceSummary } from '@/server/services/harness/types';

interface NewSessionState {
  state: 'chat' | 'work';
  selectedWorkspace?: AeroWorkspaceSummary;
  selectedWorktree?: string;

  setState: (state: 'chat' | 'work') => void;
  setSelectedWorkspace: (workspace?: AeroWorkspaceSummary) => void;
  setSelectedWorktree: (worktree?: string) => void;
}

export const useNewSessionStore = create<NewSessionState>((set) => ({
  state: 'chat',

  setState: (state) => set(() => ({ state })),

  setSelectedWorkspace: (workspace) =>
    set(() => ({ selectedWorkspace: workspace, selectedWorktree: undefined })),

  setSelectedWorktree: (worktree) =>
    set(() => ({ selectedWorktree: worktree })),
}));
