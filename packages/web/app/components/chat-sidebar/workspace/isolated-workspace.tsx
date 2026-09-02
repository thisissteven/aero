import { memo } from 'react';

import { Sidebar } from '@aero/ui';

import { ChatSidebarWorkspaceItem } from '@/app/components/chat-sidebar/workspace/workspace-item';
import { useWorkspace } from '@/app/hooks/api/workspaces';
import { AeroWorkspaceSummary } from '@/server/services/harness/types';

interface IsolatedWorkspaceProp {
  idPrefix?: string;
  directory: string;
}

const STORAGE_KEY = 'aero-isolated-workspace-sidebar-expanded-keys';

const getInitialKeys = () => {
  if (typeof window === 'undefined') return [];
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
};

export const IsolatedWorkspace = memo(function IsolatedWorkspace({
  directory,
}: IsolatedWorkspaceProp) {
  const { data: workspace, isLoading } = useWorkspace(directory);

  if (isLoading) return null;

  return (
    <Sidebar.Content offset={2} className='py-2'>
      <Sidebar.Group>
        {workspace && (
          <Sidebar.Menu<AeroWorkspaceSummary>
            aria-label='Recent workspaces'
            items={[workspace]}
            selectionMode='single'
            defaultExpandedKeys={[
              `workspaces-${workspace.id}`,
              ...getInitialKeys(),
            ]}
            onExpandedChange={(keys) => {
              localStorage.setItem(
                STORAGE_KEY,
                JSON.stringify(Array.from(keys)),
              );
            }}
          >
            {(workspace) => (
              <ChatSidebarWorkspaceItem
                key={workspace.id}
                idPrefix='workspaces'
                workspace={workspace}
              />
            )}
          </Sidebar.Menu>
        )}
      </Sidebar.Group>
    </Sidebar.Content>
  );
});
