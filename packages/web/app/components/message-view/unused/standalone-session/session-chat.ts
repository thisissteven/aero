import { useMutation, useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';

import type {
  AeroEvent,
  AeroMessage,
  AeroPartRequest,
  AeroSessionStatus,
} from '@/server/services/harness/types';

import type { SessionChatStore } from './session-chat-store';

interface Params {
  sessionId: string;
  directory: string;
  harnessId?: string;
}

function qs(params: Record<string, string | undefined>) {
  const s = new URLSearchParams();

  for (const [k, v] of Object.entries(params)) {
    if (v) s.set(k, v);
  }

  const str = s.toString();
  return str ? `?${str}` : '';
}

export function useSessionMessagesQuery(
  { sessionId, harnessId }: Params,
  store: SessionChatStore,
) {
  const hydrate = store((s) => s.hydrate);

  const query = useQuery({
    queryKey: ['session-messages', sessionId, harnessId],
    queryFn: async (): Promise<AeroMessage[]> => {
      const res = await fetch(
        `/api/sessions/${sessionId}/messages${qs({ harnessId })}`,
      );

      if (!res.ok) {
        throw new Error('Failed to load messages');
      }

      return res.json();
    },
  });

  useEffect(() => {
    if (query.data) {
      hydrate(query.data);
    }
  }, [query.data, hydrate]);

  return query;
}

export function useSessionStatusQuery(
  { sessionId, directory, harnessId }: Params,
  store: SessionChatStore,
) {
  const setStatus = store((s) => s.setStatus);

  const query = useQuery({
    queryKey: ['session-status', directory, harnessId],
    queryFn: async (): Promise<Record<string, AeroSessionStatus>> => {
      const res = await fetch(
        `/api/sessions/status${qs({ directory, harnessId })}`,
      );

      if (!res.ok) {
        throw new Error('Failed to load session status');
      }

      return res.json();
    },
  });

  useEffect(() => {
    const status = query.data?.[sessionId];

    if (status) {
      setStatus(status);
    }
  }, [query.data, sessionId, setStatus]);

  return query;
}

export function useSendMessage({ sessionId, harnessId }: Params) {
  return useMutation({
    mutationFn: async (input: {
      parts: AeroPartRequest[];
      model?: {
        providerId: string;
        modelId: string;
      };
      system?: string;
      agent?: string;
    }) => {
      const res = await fetch(
        `/api/sessions/${sessionId}/message${qs({ harnessId })}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(input),
        },
      );

      if (!res.ok) {
        throw new Error('Failed to send message');
      }

      return res.json();
    },
  });
}

export function useAbortSession({ sessionId, harnessId }: Params) {
  return useMutation({
    mutationFn: async () => {
      const res = await fetch(
        `/api/sessions/${sessionId}/abort${qs({ harnessId })}`,
        {
          method: 'POST',
        },
      );

      if (!res.ok) {
        throw new Error('Failed to abort session');
      }

      return res.json();
    },
  });
}

export function useSessionStream(
  { sessionId, harnessId }: Params,
  store: SessionChatStore,
) {
  const upsertMessage = store((s) => s.upsertMessage);
  const upsertPart = store((s) => s.upsertPart);
  const applyPartDelta = store((s) => s.applyPartDelta);
  const removePart = store((s) => s.removePart);
  const removeMessage = store((s) => s.removeMessage);
  const setStatus = store((s) => s.setStatus);

  useEffect(() => {
    const source = new EventSource(
      `/api/sessions/${sessionId}/stream${qs({ harnessId })}`,
    );

    const onMessageUpdated = (e: MessageEvent) => {
      const data: Extract<AeroEvent, { type: 'message.updated' }> = JSON.parse(
        e.data,
      );

      upsertMessage(data.message);
    };

    const onPartUpdated = (e: MessageEvent) => {
      const data: Extract<AeroEvent, { type: 'message.part.updated' }> =
        JSON.parse(e.data);

      upsertPart(sessionId, data.messageId, data.part);
    };

    const onPartDelta = (e: MessageEvent) => {
      const data: Extract<AeroEvent, { type: 'message.part.delta' }> =
        JSON.parse(e.data);

      applyPartDelta(
        sessionId,
        data.messageId,
        data.partId,
        data.field,
        data.delta,
      );
    };

    const onPartRemoved = (e: MessageEvent) => {
      const data: Extract<AeroEvent, { type: 'message.part.removed' }> =
        JSON.parse(e.data);

      removePart(data.messageId, data.partId);
    };

    const onMessageRemoved = (e: MessageEvent) => {
      const data: Extract<AeroEvent, { type: 'message.removed' }> = JSON.parse(
        e.data,
      );

      removeMessage(data.messageId);
    };

    const onStatus = (e: MessageEvent) => {
      const data: Extract<AeroEvent, { type: 'session.status' }> = JSON.parse(
        e.data,
      );

      setStatus(data.status);
    };

    const onIdle = () => {
      setStatus({ type: 'idle' });
    };

    const onError = () => {
      setStatus({ type: 'idle' });
    };

    source.addEventListener('message.updated', onMessageUpdated);
    source.addEventListener('message.part.updated', onPartUpdated);
    source.addEventListener('message.part.delta', onPartDelta);
    source.addEventListener('message.part.removed', onPartRemoved);
    source.addEventListener('message.removed', onMessageRemoved);
    source.addEventListener('session.status', onStatus);
    source.addEventListener('session.idle', onIdle);
    source.addEventListener('session.error', onError);

    return () => {
      source.removeEventListener('message.updated', onMessageUpdated);
      source.removeEventListener('message.part.updated', onPartUpdated);
      source.removeEventListener('message.part.delta', onPartDelta);
      source.removeEventListener('message.part.removed', onPartRemoved);
      source.removeEventListener('message.removed', onMessageRemoved);
      source.removeEventListener('session.status', onStatus);
      source.removeEventListener('session.idle', onIdle);
      source.removeEventListener('session.error', onError);
      source.close();
    };
  }, [
    sessionId,
    harnessId,
    upsertMessage,
    upsertPart,
    applyPartDelta,
    removePart,
    removeMessage,
    setStatus,
  ]);
}
