import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AeroWorkspaceSummary } from '@/server/services/harness/types';

interface NewSessionState {
  state: 'chat' | 'work';
  selectedWorkspace?: AeroWorkspaceSummary;
  selectedWorktree?: string;

  /**
   * Set to `true` when the user explicitly picks a model while a workspace is
   * selected. Resets to `false` whenever the workspace changes, so the new
   * workspace's `defaultModel` takes effect again.
   */
  modelOverridden: boolean;

  setState: (state: 'chat' | 'work') => void;
  setSelectedWorkspace: (workspace?: AeroWorkspaceSummary) => void;
  setSelectedWorktree: (worktree?: string) => void;
  setModelOverridden: (overridden: boolean) => void;
}

export const useNewSessionStore = create<NewSessionState>()(
  persist(
    (set) => ({
      state: 'chat',
      modelOverridden: false,

      setState: (state) => set(() => ({ state })),

      // NOTE: no longer reaches into chat-settings-store. The resolver in
      // `useSelectedModel` reads `workspace.defaultModel` dynamically, so
      // writing it here would just fight the persisted user choice.
      setSelectedWorkspace: (workspace) =>
        set(() => ({
          selectedWorkspace: workspace,
          selectedWorktree: undefined,
          modelOverridden: false,
        })),

      setSelectedWorktree: (worktree) =>
        set(() => ({ selectedWorktree: worktree })),

      setModelOverridden: (modelOverridden) => set({ modelOverridden }),
    }),
    {
      name: 'aero-new-session-storage',

      // `modelOverridden` is editing-session state, not durable preference —
      // a page reload should give the workspace default another chance.
      partialize: (s) => ({
        state: s.state,
        selectedWorkspace: s.selectedWorkspace,
        selectedWorktree: s.selectedWorktree,
      }),
    },
  ),
);
