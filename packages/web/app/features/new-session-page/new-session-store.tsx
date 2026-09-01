import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { AeroWorkspaceSummary } from '@/server/services/harness/types';

interface NewSessionState {
  state: 'chat' | 'work';
  selectedWorkspace?: AeroWorkspaceSummary;
  selectedWorktree?: string;

  setState: (state: 'chat' | 'work') => void;
  setSelectedWorkspace: (workspace?: AeroWorkspaceSummary) => void;
  setSelectedWorktree: (worktree?: string) => void;
}

export const useNewSessionStore = create<NewSessionState>()(
  persist(
    (set) => ({
      state: 'chat',

      setState: (state) => set(() => ({ state })),

      setSelectedWorkspace: (workspace) =>
        set(() => ({
          selectedWorkspace: workspace,
          selectedWorktree: undefined,
        })),

      setSelectedWorktree: (worktree) =>
        set(() => ({ selectedWorktree: worktree })),
    }),
    {
      name: 'aero-new-session-storage',
    },
  ),
);
