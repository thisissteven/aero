import { ArrowsRotateRight, Paperclip } from '@gravity-ui/icons';
import { Icon } from '@gravity-ui/uikit';
import { useCallback, useRef } from 'react';

import { IconButton } from '@/app/components/ui/icon-button';

import {
  TerminalInstance,
  type TerminalInstanceHandle,
} from './terminal-instance';
import { useActiveSessionId, useTerminalSessions } from './terminal-store';
import { TerminalTabs } from './terminal-tabs';

interface TerminalPanelProps {
  onAttachToChat?: (text: string) => void;
}

export function TerminalPanel({ onAttachToChat }: TerminalPanelProps) {
  const sessions = useTerminalSessions();
  const activeSessionId = useActiveSessionId();
  const instanceRefs = useRef(new Map<string, TerminalInstanceHandle>());
  const refCallbacks = useRef(
    new Map<string, (handle: TerminalInstanceHandle | null) => void>(),
  );

  function getRefCallback(sessionId: string) {
    if (!refCallbacks.current.has(sessionId)) {
      refCallbacks.current.set(sessionId, (handle) => {
        if (handle) instanceRefs.current.set(sessionId, handle);
        else instanceRefs.current.delete(sessionId);
      });
    }
    return refCallbacks.current.get(sessionId)!;
  }

  const activeHandle = activeSessionId
    ? instanceRefs.current.get(activeSessionId)
    : undefined;

  const handleRefresh = useCallback(
    () => activeHandle?.reconnect(),
    [activeHandle],
  );

  const handleAttach = useCallback(() => {
    const text = activeHandle?.getSelection();
    if (text) onAttachToChat?.(text);
  }, [activeHandle, onAttachToChat]);

  return (
    <div className='border-border bg-background flex h-full flex-col overflow-hidden'>
      <div className='border-border flex scrollbar-thin items-center justify-between overflow-x-auto border-b'>
        <TerminalTabs />
        <div className='flex shrink-0 items-center gap-1 pr-1'>
          <IconButton onPress={handleRefresh} isDisabled={!activeSessionId}>
            <Icon data={ArrowsRotateRight} />
          </IconButton>
          <IconButton onPress={handleAttach} isDisabled={!activeSessionId}>
            <Icon data={Paperclip} />
          </IconButton>
        </div>
      </div>
      <div className='relative min-h-0 flex-1 overflow-hidden p-2'>
        {sessions.length === 0 ? (
          <div className='text-muted flex h-full items-center justify-center text-sm'>
            No terminals open
          </div>
        ) : (
          sessions.map((session) => (
            <TerminalInstance
              key={session.id}
              ref={getRefCallback(session.id)}
              sessionId={session.id}
              active={session.id === activeSessionId}
              cwd={session.cwd}
            />
          ))
        )}
      </div>
    </div>
  );
}
