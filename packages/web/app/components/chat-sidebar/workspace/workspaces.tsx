import {
  cn,
  ListLayout,
  Sidebar,
  Skeleton,
  Spinner,
  Virtualizer,
} from '@aero/ui';
import { memo, useCallback, useMemo, useRef, useState } from 'react';
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
const ROW_HEIGHT = 38;

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

interface ResolvedTarget {
  id: string;
  nested: boolean;
}

function resolveTargetWorkspace(
  workspaces: AeroWorkspaceSummary[],
  key: Key | undefined,
): ResolvedTarget | null {
  if (key === undefined) return null;

  const value = String(key);
  const prefix = `${WORKSPACE_ITEM_PREFIX}-`;

  for (const workspace of workspaces) {
    const workspaceKey = `${prefix}${workspace.id}`;
    if (value === workspaceKey) return { id: workspace.id, nested: false };
    if (value.startsWith(`${workspaceKey}-`)) {
      return { id: workspace.id, nested: true };
    }
  }

  return null;
}

function reorderWorkspaceIds(
  workspaces: AeroWorkspaceSummary[],
  keys: Set<Key>,
  targetKey: Key,
  dropPosition: string,
): string[] | null {
  const workspaceIds = new Set(workspaces.map((workspace) => workspace.id));

  const movingIds = new Set<string>();
  for (const key of keys) {
    const id = getWorkspaceIdFromKey(key, workspaceIds);
    if (id) movingIds.add(id);
  }

  const resolved = resolveTargetWorkspace(workspaces, targetKey);
  if (movingIds.size === 0 || !resolved || movingIds.has(resolved.id)) {
    return null;
  }

  const moving = workspaces.filter((workspace) => movingIds.has(workspace.id));
  const remaining = workspaces.filter(
    (workspace) => !movingIds.has(workspace.id),
  );
  const targetIndex = remaining.findIndex(
    (workspace) => workspace.id === resolved.id,
  );
  if (targetIndex === -1) return null;

  // React Aria's tree delegate may turn a top-level target into one of its
  // descendants (e.g. "after" an expanded workspace becomes "before" its first
  // child). For flat workspace ordering, resolve such targets by drag direction.
  if (resolved.nested) {
    const firstMovingIndex = workspaces.findIndex((workspace) =>
      movingIds.has(workspace.id),
    );
    const targetOriginalIndex = workspaces.findIndex(
      (workspace) => workspace.id === resolved.id,
    );

    remaining.splice(
      firstMovingIndex < targetOriginalIndex ? targetIndex + 1 : targetIndex,
      0,
      ...moving,
    );

    return remaining.map((workspace) => workspace.id);
  }

  if (dropPosition !== 'before' && dropPosition !== 'after') return null;

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
  const menuRef = useRef<HTMLDivElement | null>(null);

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
    // The list scrolls inside Sidebar.Content, but React Aria's layout-based
    // drop target delegate assumes the collection element itself scrolls and
    // therefore double-counts the scroll offset. Resolve targets from the
    // rendered row rects instead: the pointer is always over a rendered row,
    // so this stays accurate regardless of virtualization or scroll position.
    dropTargetDelegate: {
      getDropTargetFromPoint(_x, y, isValidDropTarget) {
        const container = menuRef.current;
        if (!container) return null;

        const containerTop = container.getBoundingClientRect().top;
        const pointerY = y + containerTop;

        const rows = Array.from(
          container.querySelectorAll<HTMLElement>('[data-key]'),
        )
          .map((element) => ({
            key: element.dataset.key as string,
            rect: element.getBoundingClientRect(),
          }))
          .sort((a, b) => a.rect.top - b.rect.top);

        if (rows.length === 0) return { type: 'root' };

        const first = rows[0];
        const last = rows[rows.length - 1];

        let key: string;
        let dropPosition: 'before' | 'after';

        if (pointerY <= first.rect.top) {
          key = first.key;
          dropPosition = 'before';
        } else if (pointerY >= last.rect.bottom) {
          key = last.key;
          dropPosition = 'after';
        } else {
          const row =
            rows.find((candidate) => pointerY <= candidate.rect.bottom) ?? last;
          key = row.key;
          dropPosition =
            pointerY < row.rect.top + row.rect.height / 2 ? 'before' : 'after';
        }

        const target = { type: 'item' as const, key, dropPosition };
        return isValidDropTarget(target) ? target : null;
      },
    },
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

  const layoutOptions = useMemo(() => ({ rowSize: ROW_HEIGHT }), []);

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
            <Virtualizer layout={ListLayout} layoutOptions={layoutOptions}>
              <Sidebar.Menu<AeroWorkspaceSummary>
                ref={menuRef}
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
            </Virtualizer>
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
