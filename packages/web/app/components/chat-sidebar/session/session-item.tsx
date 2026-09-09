import { CircleTree } from '@gravity-ui/icons';
import { Icon } from '@gravity-ui/uikit';
import { useNavigate } from '@tanstack/react-router';
import { memo, useRef, useTransition } from 'react';
import { useShallow } from 'zustand/react/shallow';

import { Sidebar, useSidebar } from '@aero/ui';

import { SelectSession } from '@/app/components/chat-sidebar/session/session-actions';
import { SessionItemSummary } from '@/app/components/chat-sidebar/session/session-item-summary';
import {
  useRecentsSidebarStore,
  useWorkspacesSidebarStore,
} from '@/app/components/chat-sidebar/sidebar-store';
import { SelectWorkspaceSession } from '@/app/components/chat-sidebar/workspace/workspace-actions';
import { useWorkspacesKeys } from '@/app/hooks/api/workspaces';
import { formatCompactRelativeTime } from '@/app/lib';
import { getLastPathName } from '@/app/lib/file';
import { useTooltipStore } from '@/app/providers/GlobalTooltipProvider';
import { useActiveSessionStore } from '@/app/stores/active-session-id';
import {
  useRecentsSessionRenameStore,
  useWorkspacesSessionRenameStore,
} from '@/app/stores/session-rename';
import { AeroSessionSummary } from '@/server/services/harness/types';
import { isWorktree } from '@/server/shared';

interface ChatSidebarSessionItemProps {
  idPrefix: string;
  session: AeroSessionSummary;
  from: 'recents' | 'navbar' | 'workspaces';
  isWorktreeItem?: boolean;
}

export const ChatSidebarSessionItem = memo(
  function ChatSidebarSessionItem({
    idPrefix,
    session,
    isWorktreeItem,
    from,
    ...props
  }: ChatSidebarSessionItemProps) {
    const navigate = useNavigate();
    const [, startTransition] = useTransition();

    const fullHref = `/sessions/${session.id}`;
    const isCurrent = useActiveSessionStore(
      useShallow((state) => state.activeId === session.id),
    );

    const renameRecents = useRecentsSessionRenameStore((state) => state.rename);
    const renameWorkspaces = useWorkspacesSessionRenameStore(
      (state) => state.rename,
    );
    const lastPressTimeRef = useRef<number>(0);

    const { setMobileOpen } = useSidebar();

    const handlePress = () => {
      const now = Date.now();
      const DOUBLE_PRESS_THRESHOLD = 300; // ms window for double click

      if (now - lastPressTimeRef.current < DOUBLE_PRESS_THRESHOLD) {
        // DOUBLE PRESS DETECTED
        lastPressTimeRef.current = 0; // Reset timer
        if (from === 'recents') renameRecents(session.id);
        else renameWorkspaces(session.id);
      } else {
        // SINGLE PRESS
        lastPressTimeRef.current = now;

        if (!isCurrent) {
          setMobileOpen(false);
          startTransition(() => {
            navigate({ to: fullHref });
          });
        }
      }
    };

    const isEditModeRecents = useRecentsSidebarStore(
      (state) => state.isEditMode,
    );
    const isEditModeWorkspaces = useWorkspacesSidebarStore(
      (state) => state.isEditMode,
    );

    const itemRef = useRef<HTMLDivElement>(null);
    const showTooltip = useTooltipStore((s) => s.showTooltip);
    const hideTooltip = useTooltipStore((s) => s.hideTooltip);

    const { data: keys } = useWorkspacesKeys();

    const handleMouseEnter = () => {
      if (itemRef.current && keys) {
        const rect = itemRef.current.getBoundingClientRect();
        const isStandaloneSession =
          session.workspace.includes('.aero/workspaces');
        const workspaceTitle =
          keys[session.workspace] ??
          getLastPathName(session.workspaceTitle ?? session.workspace);
        showTooltip({
          content: (
            <div className='bg-surface border-separator rounded-lg border p-2 shadow-lg'>
              <p className='text-sm'>{session.title}</p>
              <div className='text-muted flex gap-1 text-xs'>
                <span className='shrink-0'>
                  {formatCompactRelativeTime(session.updatedAt, true)}
                  {!isStandaloneSession && ` at `}
                </span>
                {isStandaloneSession && (
                  <span className='truncate font-bold'>
                    (Standalone session) {session.readOnly && ' (read only)'}
                  </span>
                )}
                {!isStandaloneSession && !isWorktree(session.workspace) && (
                  <span className='truncate font-bold'>
                    {workspaceTitle}
                    {session.readOnly && ' (read only)'}
                  </span>
                )}
                {!isStandaloneSession && isWorktree(session.workspace) && (
                  <div className='flex items-center gap-1'>
                    <Icon data={CircleTree} size={12} />
                    <span className='truncate font-bold'>
                      {getLastPathName(
                        session.workspaceTitle ?? session.workspace,
                      )}
                      {session.readOnly && ' (read only)'}
                    </span>
                  </div>
                )}
              </div>
            </div>
          ),
          rect,
          isInteractive: true,
        });
      }
    };

    return (
      <Sidebar.MenuItem
        {...props}
        id={`${idPrefix}${session.id}`}
        isCurrent={isCurrent}
        textValue={`${idPrefix}${session.title}`}
        onPress={handlePress}
        className='group relative'
        ref={itemRef}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={hideTooltip}
      >
        {isEditModeRecents && from === 'recents' && (
          <SelectSession sessionId={session.id} />
        )}
        {isEditModeWorkspaces && from === 'workspaces' && (
          <SelectWorkspaceSession sessionId={session.id} />
        )}
        <SessionItemSummary
          session={session}
          isWorktreeItem={isWorktreeItem}
          isCurrent={isCurrent}
          from={from}
        />
      </Sidebar.MenuItem>
    );
  },
  (prev, next) => {
    return (
      prev.session.id === next.session.id &&
      prev.session.title === next.session.title
    );
  },
);

export const WorkspaceSessionItem = memo(
  function ChatSidebarSessionItem({
    idPrefix,
    session,
    ...props
  }: ChatSidebarSessionItemProps) {
    const navigate = useNavigate();
    const [, startTransition] = useTransition();

    const fullHref = `/sessions/${session.id}`;
    const isCurrent = useActiveSessionStore(
      useShallow((state) => state.activeId === session.id),
    );

    const renameWorkspaces = useWorkspacesSessionRenameStore(
      (state) => state.rename,
    );
    const lastPressTimeRef = useRef<number>(0);

    const { setMobileOpen } = useSidebar();

    const handlePress = () => {
      const now = Date.now();
      const DOUBLE_PRESS_THRESHOLD = 300; // ms window for double click

      if (now - lastPressTimeRef.current < DOUBLE_PRESS_THRESHOLD) {
        // DOUBLE PRESS DETECTED
        lastPressTimeRef.current = 0; // Reset timer
        renameWorkspaces(session.id);
      } else {
        // SINGLE PRESS
        lastPressTimeRef.current = now;

        if (!isCurrent) {
          setMobileOpen(false);
          startTransition(() => {
            navigate({ to: fullHref });
          });
        }
      }
    };

    const isEditMode = useWorkspacesSidebarStore((state) => state.isEditMode);

    const itemRef = useRef<HTMLDivElement>(null);
    const showTooltip = useTooltipStore((s) => s.showTooltip);
    const hideTooltip = useTooltipStore((s) => s.hideTooltip);

    const { data: keys } = useWorkspacesKeys();

    const handleMouseEnter = () => {
      if (itemRef.current && keys) {
        const rect = itemRef.current.getBoundingClientRect();
        const isStandaloneSession =
          session.workspace.includes('.aero/workspaces');
        const workspaceTitle =
          keys[session.workspace] ??
          getLastPathName(session.workspaceTitle ?? session.workspace);
        showTooltip({
          content: (
            <div className='bg-surface border-separator rounded-lg border p-2 shadow-lg'>
              <p className='text-sm'>{session.title}</p>
              <div className='text-muted flex gap-1 text-xs'>
                <span className='shrink-0'>
                  {formatCompactRelativeTime(session.updatedAt, true)}
                  {!isStandaloneSession && ` at `}
                </span>
                {isStandaloneSession && (
                  <span className='truncate font-bold'>
                    (Standalone session) {session.readOnly && ' (read only)'}
                  </span>
                )}
                {!isStandaloneSession && !isWorktree(session.workspace) && (
                  <span className='truncate font-bold'>
                    {workspaceTitle}
                    {session.readOnly && ' (read only)'}
                  </span>
                )}
                {!isStandaloneSession && isWorktree(session.workspace) && (
                  <div className='flex items-center gap-1'>
                    <Icon data={CircleTree} size={12} />
                    <span className='truncate font-bold'>
                      {getLastPathName(
                        session.workspaceTitle ?? session.workspace,
                      )}
                      {session.readOnly && ' (read only)'}
                    </span>
                  </div>
                )}
              </div>
            </div>
          ),
          rect,
          isInteractive: true,
        });
      }
    };

    return (
      <Sidebar.MenuItem
        {...props}
        id={`${idPrefix}${session.id}`}
        isCurrent={isCurrent}
        textValue={`${idPrefix}${session.title}`}
        onPress={handlePress}
        className='group relative [--sidebar-menu-guide-count:1] [--sidebar-menu-item-offset:16px]'
        ref={itemRef}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={hideTooltip}
      >
        {isEditMode && <SelectWorkspaceSession sessionId={session.id} />}
        <SessionItemSummary
          session={session}
          isCurrent={isCurrent}
          isWorktreeItem
          from='workspaces'
        />
      </Sidebar.MenuItem>
    );
  },
  (prev, next) => {
    return (
      prev.session.id === next.session.id &&
      prev.session.title === next.session.title
    );
  },
);
