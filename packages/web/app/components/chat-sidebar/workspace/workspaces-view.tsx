import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { IsolatedWorkspace } from '@/app/components/chat-sidebar/workspace/isolated-workspace';
import { Workspaces } from '@/app/components/chat-sidebar/workspace/workspaces';

type WorkspaceState = {
  state: 'isolated' | 'all';
  isolatedWorkspaceDirectory: string | null;
  isWorkspacesOpen: boolean;

  setState: (state: 'isolated' | 'all') => void;
  setIsolatedWorkspaceDirectory: (
    isolatedWorkspaceDirectory: string | null,
  ) => void;
  setIsWorkspacesOpen: (isWorkspacesOpen: boolean) => void;
};

export const useWorkspaceStore = create<WorkspaceState>()(
  persist(
    (set) => ({
      state: 'all',
      isolatedWorkspaceDirectory: null,
      isWorkspacesOpen: false,

      setState: (state) =>
        set(() => {
          return {
            state,
          };
        }),

      setIsolatedWorkspaceDirectory: (isolatedWorkspaceDirectory) =>
        set(() => {
          return {
            isolatedWorkspaceDirectory,
          };
        }),

      setIsWorkspacesOpen: (isWorkspacesOpen) =>
        set(() => {
          return {
            isWorkspacesOpen,
          };
        }),
    }),
    {
      name: 'aero-workspace-store',
    },
  ),
);

export function WorkspacesView() {
  const state = useWorkspaceStore((state) => state.state);
  const isolatedWorkspaceDirectory = useWorkspaceStore(
    (state) => state.isolatedWorkspaceDirectory,
  );

  if (state === 'isolated' && isolatedWorkspaceDirectory) {
    return <IsolatedWorkspace directory={isolatedWorkspaceDirectory} />;
  }

  return <Workspaces />;
}
