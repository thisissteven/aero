import { useMemo } from 'react';

import { useChatStore } from '@/app/features/chat-page/chat-feed/chat-store';
import { formatElapsed, useElapsedTime } from '@/app/hooks/useElapsedTime';
import type {
  AeroConversationTurn,
  AeroSessionStatus,
} from '@/server/services/harness/types';

function getActivityLabel(
  turns: AeroConversationTurn[],
  status: AeroSessionStatus,
) {
  if (status.type === 'idle') {
    return null;
  }

  if (status.type === 'retry') {
    return `Retrying (attempt ${status.attempt})…`;
  }

  const lastAssistant = [...turns]
    .reverse()
    .find((turn) => turn.role === 'assistant');

  if (!lastAssistant) {
    return 'Assistant is thinking…';
  }

  const activeTool = [...lastAssistant.parts]
    .reverse()
    .find(
      (part) =>
        part.type === 'tool' &&
        (part.status === 'pending' || part.status === 'running'),
    );

  if (activeTool) {
    return 'Assistant is calling a tool…';
  }

  const hasReasoning = lastAssistant.parts.some(
    (part) => part.type === 'reasoning' && part.text.length > 0,
  );

  if (hasReasoning) {
    return 'Assistant is thinking…';
  }

  const hasText = lastAssistant.parts.some(
    (part) => part.type === 'text' && part.text.length > 0,
  );

  if (hasText) {
    return 'Assistant is responding…';
  }

  return 'Assistant is thinking…';
}

export function ChatActivityIndicator() {
  const turns = useChatStore((state) => state.turns);

  const status = useChatStore((state) => state.status);

  const startedAt = useChatStore((state) => state.streamStartedAt);

  const elapsed = useElapsedTime(startedAt, status.type !== 'idle');

  const label = useMemo(() => getActivityLabel(turns, status), [turns, status]);

  if (!label) {
    return null;
  }

  return (
    <div className='text-default-500 flex items-center gap-2 px-1 pb-2 text-xs'>
      <span className='bg-default-400 h-1.5 w-1.5 animate-pulse rounded-full' />

      <span>{label}</span>

      {startedAt !== null && <span>· {formatElapsed(elapsed)}</span>}
    </div>
  );
}
