import { Plus, Xmark } from '@gravity-ui/icons';
import { Icon } from '@gravity-ui/uikit';

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

  return (
    <div className='bg-background flex items-center gap-1 px-1 py-1'>
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
      <button
        type='button'
        onClick={() => addSession()}
        className='text-muted hover:bg-surface-hover hover:text-foreground rounded-md p-2 text-sm'
      >
        <Icon data={Plus} size={14} />
      </button>
    </div>
  );
}
