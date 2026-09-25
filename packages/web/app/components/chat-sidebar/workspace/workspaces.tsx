import { cn, Sidebar, Skeleton, Spinner } from '@aero/ui';
import { memo, useCallback, useState } from 'react';
import type { Key } from 'react-aria-components';
import { useDragAndDrop } from 'react-aria-components';

import { WorkspacesToggleEditModeButton } from '@/app/components/chat-sidebar/workspace/workspace-actions';
import { ChatSidebarWorkspaceItem } from '@/app/components/chat-sidebar/workspace/workspace-item';
import {
  useReorderWorkspaces,
  useWorkspaces,
} from '@/app/hooks/api/workspaces';
import { useI18n } from '@/app/hooks/i18n';
import { useInfiniteScroll } from '@/app/hooks/useInfiniteScroll';
import { AeroWorkspaceSummary } from '@/server/services/harness/types';

const WORKSPACE_ITEM_PREFIX = 'workspaces';

function getWorkspaceIdFromKey(
  key: Key | undefined,
  workspaceIds: Set<string>,
): string | null {
  if (key === undefined) return null;

  const prefix = `${WORKSPACE_ITEM_PREFIX}-`;
  const value = String(key);

  if (!value.startsWith(prefix)) return null;

  const id = value.slice(prefix.length);
  return workspaceIds.has(id) ? id : null;
}

function reorderWorkspaceIds(
  workspaces: AeroWorkspaceSummary[],
  keys: Set<Key>,
  targetKey: Key,
  dropPosition: string,
): string[] | null {
  if (dropPosition !== 'before' && dropPosition !== 'after') return null;

  const workspaceIds = new Set(workspaces.map((workspace) => workspace.id));

  const movingIds = new Set<string>();
  for (const key of keys) {
    const id = getWorkspaceIdFromKey(key, workspaceIds);
    if (id) movingIds.add(id);
  }

  const targetId = getWorkspaceIdFromKey(targetKey, workspaceIds);
  if (movingIds.size === 0 || !targetId || movingIds.has(targetId)) return null;

  const moving = workspaces.filter((workspace) => movingIds.has(workspace.id));
  const remaining = workspaces.filter(
    (workspace) => !movingIds.has(workspace.id),
  );
  const targetIndex = remaining.findIndex(
    (workspace) => workspace.id === targetId,
  );
  if (targetIndex === -1) return null;

  remaining.splice(
    dropPosition === 'before' ? targetIndex : targetIndex + 1,
    0,
    ...moving,
  );

  return remaining.map((workspace) => workspace.id);
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

const STORAGE_KEY = 'aero-workspace-sidebar-expanded-keys';

const getInitialKeys = () => {
  if (typeof window === 'undefined') return [];
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
};

export const Workspaces = memo(function Workspaces() {
  const { t } = useI18n();

  const workspacesQuery = useWorkspaces();
  const {
    items: workspaces,
    loadMoreRef,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
  } = useInfiniteScroll<AeroWorkspaceSummary>(workspacesQuery);

  const reorderWorkspaces = useReorderWorkspaces();

  const [expandedKeys, setExpandedKeys] = useState<Set<Key>>(
    () => new Set<Key>(getInitialKeys()),
  );

  const toggleWorkspaceExpanded = useCallback((workspaceId: string) => {
    setExpandedKeys((current) => {
      const next = new Set(current);
      const key = `${WORKSPACE_ITEM_PREFIX}-${workspaceId}`;

      if (next.has(key)) next.delete(key);
      else next.add(key);

      localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(next)));
      return next;
    });
  }, []);

  const canReorder = !isLoading && workspaces.length > 1;

  const { dragAndDropHooks } = useDragAndDrop<AeroWorkspaceSummary>({
    isDisabled: !canReorder,
    getItems: (keys) => {
      if (!canReorder) return [];

      const workspaceIds = new Set(workspaces.map((workspace) => workspace.id));

      const items: Array<Record<string, string>> = [];
      for (const key of keys) {
        const id = getWorkspaceIdFromKey(key, workspaceIds);
        if (id) items.push({ 'text/plain': id });
      }

      return items;
    },
    onReorder: (event) => {
      if (!canReorder) return;

      const ids = reorderWorkspaceIds(
        workspaces,
        event.keys,
        event.target.key,
        event.target.dropPosition,
      );

      if (ids) reorderWorkspaces.mutate({ ids });
    },
  });

  return (
    <>
      <div className='px-2 pt-2'>
        <Sidebar.GroupLabel className='flex items-center justify-between'>
          {t.sidebar.workspaces}
          <WorkspacesToggleEditModeButton />
        </Sidebar.GroupLabel>
      </div>

      <Sidebar.Content offset={2} className='py-2'>
        <Sidebar.Group>
          <WorkspacesLoader enabled={isLoading} />

          {workspaces && (
            <Sidebar.Menu<AeroWorkspaceSummary>
              aria-label={t.workspace.recentWorkspacesAria}
              items={workspaces}
              selectionMode='single'
              expandedKeys={expandedKeys}
              onExpandedChange={(keys) => {
                const next = new Set<Key>(keys);

                setExpandedKeys(next);
                localStorage.setItem(
                  STORAGE_KEY,
                  JSON.stringify(Array.from(next)),
                );
              }}
              dragAndDropHooks={dragAndDropHooks}
            >
              {(workspace) => (
                <ChatSidebarWorkspaceItem
                  key={workspace.id}
                  idPrefix='workspaces'
                  workspace={workspace}
                  onToggleExpand={() => toggleWorkspaceExpanded(workspace.id)}
                />
              )}
            </Sidebar.Menu>
          )}

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
