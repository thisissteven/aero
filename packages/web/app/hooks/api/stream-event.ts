import { useEffect } from 'react';

import { useChatStore } from '@/app/features/chat-page/chat-feed/chat-store';
import { sessionStreamManager } from '@/app/services/session-stream-manager';

interface Params {
  sessionId: string;
  harnessId?: string;
}

export function useSessionStream({ sessionId, harnessId }: Params) {
  const isStreaming = useChatStore((state) =>
    sessionId ? (state.sessions[sessionId]?.isStreaming ?? false) : false,
  );

  useEffect(() => {
    if (!sessionId || !isStreaming) {
      return;
    }

    void sessionStreamManager.ensure({
      sessionId,
      harnessId,
    });
  }, [sessionId, harnessId, isStreaming]);
}
