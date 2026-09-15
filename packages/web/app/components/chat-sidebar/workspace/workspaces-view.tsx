import { IsolatedWorkspace } from '@/app/components/chat-sidebar/workspace/isolated-workspace';
import { Workspaces } from '@/app/components/chat-sidebar/workspace/workspaces';
import { useWorkspaceStore } from '@/app/components/chat-sidebar/workspace/workspaces-store';

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
