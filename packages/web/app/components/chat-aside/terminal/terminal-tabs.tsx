import { Plus, Xmark } from '@gravity-ui/icons';
import { Icon } from '@gravity-ui/uikit';
import { useParams } from '@tanstack/react-router';
import React from 'react';

import { cn } from '@aero/ui';

import { IconButton } from '@/app/components/ui/icon-button';
import { useSession } from '@/app/hooks/api/sessions';
import { useWorkspacesKeys } from '@/app/hooks/api/workspaces';
import { getLastPathName } from '@/app/lib/file';

import { SessionStatusDot } from './session-status-dot';
import {
  useActiveSessionId,
  useTerminalActions,
  useTerminalSessions,
} from './terminal-store';

export function TerminalTabs() {
  const sessions = useTerminalSessions();
  const activeSessionId = useActiveSessionId();
  const { addSession, removeSession, setActiveSession } = useTerminalActions();

  const { sessionId } = useParams({ strict: false });
  const { data: session } = useSession(undefined, sessionId);
  const { data: keys } = useWorkspacesKeys();

  React.useEffect(() => {
    if (
      session?.workspace &&
      !sessions.some((ts) => ts.cwd === session.workspace) &&
      keys
    ) {
      addSession({
        title:
          keys?.[session.workspace]?.name ?? getLastPathName(session.workspace),
        cwd: session.workspace,
      });
    }
  }, [session?.workspace, keys]);

  return (
    <div
      className={cn(
        'bg-background flex items-center gap-1 py-1',
        sessions.length > 0 ? 'px-1' : 'px-0',
      )}
    >
      <div className='flex flex-1 items-center gap-1'>
        {sessions.map((session) => {
          const isActive = session.id === activeSessionId;
          return (
            <button
              key={session.id}
              type='button'
              onClick={() => setActiveSession(session.id)}
              className={
                isActive
                  ? 'bg-default text-accent-soft-foreground flex items-center gap-2 rounded-md px-3 py-1.5 text-sm'
                  : 'text-muted hover:bg-default hover:text-foreground flex items-center gap-2 rounded-md px-3 py-1.5 text-sm'
              }
            >
              <SessionStatusDot sessionId={session.id} />
              <span className='max-w-[10rem] truncate'>{session.title}</span>
              <span
                role='button'
                tabIndex={-1}
                onClick={(e) => {
                  e.stopPropagation();
                  removeSession(session.id);
                }}
                className='text-muted ml-1'
              >
                <Icon data={Xmark} size={14} />
              </span>
            </button>
          );
        })}
      </div>
      <IconButton
        onPress={() =>
          addSession({
            title: session?.workspace
              ? (keys?.[session.workspace]?.name ??
                getLastPathName(session.workspace))
              : undefined,
            cwd: session?.workspace,
          })
        }
      >
        <Icon data={Plus} />
      </IconButton>
    </div>
  );
}
