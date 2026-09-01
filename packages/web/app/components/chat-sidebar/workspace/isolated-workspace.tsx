import { memo } from 'react';

import { Sidebar, Skeleton } from '@aero/ui';

import { ChatSidebarWorkspaceItem } from '@/app/components/chat-sidebar/workspace/workspace-item';
import { useWorkspace } from '@/app/hooks/api/workspaces';
import { AeroWorkspaceSummary } from '@/server/services/harness/types';

interface IsolatedWorkspaceProp {
  idPrefix?: string;
  directory: string;
}

function WorkspacesLoader({ enabled }: { enabled: boolean }) {
  if (!enabled) return null;

  return (
    <ul className='space-y-1'>
      {Array.from({ length: 20 }, (_, i) => {
        return (
          <li key={i}>
            <Skeleton className='h-[38px] w-full rounded-xl' />
          </li>
        );
      })}
    </ul>
  );
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

  return (
    <Sidebar.Content offset={2} className='py-2'>
      <Sidebar.Group>
        <WorkspacesLoader enabled={isLoading} />

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
