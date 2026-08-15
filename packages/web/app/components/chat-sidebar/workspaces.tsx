import { memo } from 'react';

import {
  cn,
  ListLayout,
  Sidebar,
  Skeleton,
  Spinner,
  Virtualizer,
} from '@aero/ui';

import { WorkspacesToggleEditModeButton } from '@/app/components/chat-sidebar/workspace-actions';
import { ChatSidebarWorkspaceItem } from '@/app/components/chat-sidebar/workspace-item';
import { useWorkspaces } from '@/app/hooks/api/workspaces';
import { useInfiniteScroll } from '@/app/hooks/useInfiniteScroll';
import { AeroWorkspaceSummary } from '@/server/services/harness/types';

interface WorkspacesProps {
  pathname: string;
  idPrefix?: string;
  workspacesQuery: ReturnType<typeof useWorkspaces>;
  rowHeight?: number;
}

function WorkspacesLoader({ enabled }: { enabled: boolean }) {
  if (!enabled) return null;

  return (
    <ul className='space-y-1'>
      {Array.from({ length: 20 }, (_, i) => {
        return (
          <li key={i}>
            <Skeleton className='h-[38px] w-full rounded-2xl' />
          </li>
        );
      })}
    </ul>
  );
}

export const Workspaces = memo(function Workspaces({
  pathname,
  workspacesQuery,
  rowHeight = 38,
}: WorkspacesProps) {
  const {
    items: workspaces,
    loadMoreRef,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
  } = useInfiniteScroll<AeroWorkspaceSummary>(workspacesQuery);

  return (
    <>
      <div className='px-2 pt-2'>
        <Sidebar.GroupLabel className='flex items-center justify-between'>
          Workspaces
          <WorkspacesToggleEditModeButton />
        </Sidebar.GroupLabel>
      </div>

      <Sidebar.Content offset={2} className='py-2'>
        <Sidebar.Group>
          <WorkspacesLoader enabled={isLoading} />

          <Virtualizer
            layout={ListLayout}
            layoutOptions={{ rowSize: rowHeight }}
          >
            <Sidebar.Menu<AeroWorkspaceSummary>
              aria-label='Recent workspaces'
              items={workspaces}
              selectionMode='single'
              dependencies={[pathname]}
            >
              {(workspace) => (
                <ChatSidebarWorkspaceItem
                  key={workspace.id}
                  idPrefix='workspaces'
                  pathname={pathname}
                  workspace={workspace}
                />
              )}
            </Sidebar.Menu>
          </Virtualizer>

          {/* Sentinel element for infinite scroll */}
          {hasNextPage && (
            <div ref={loadMoreRef} className='h-9'>
              <div
                aria-hidden={!hasNextPage}
                className={cn(
                  'flex items-center justify-center py-2 text-sm',
                  isFetchingNextPage && 'opacity-100',
                  !hasNextPage && 'h-0 py-0 opacity-0',
                )}
              >
                <Spinner className='text-muted size-4' />
              </div>
            </div>
          )}
        </Sidebar.Group>
      </Sidebar.Content>
    </>
  );
});
