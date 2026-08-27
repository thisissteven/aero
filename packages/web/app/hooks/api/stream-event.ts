import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';

import { sessionKeys } from '@/app/hooks/api/sessions';
import type { AeroEvent } from '@/server/services/harness/types';

interface UseSessionStreamOptions {
  harnessId?: string;
  sessionId: string;
  enabled?: boolean;
  onEvent?: (event: AeroEvent) => void;
  onComplete?: () => void;
  onError?: (error: Error) => void;
}

export function useSessionStream({
  harnessId,
  sessionId,
  enabled = true,
  onEvent,
  onComplete,
  onError,
}: UseSessionStreamOptions) {
  const queryClient = useQueryClient();

  const onEventRef = useRef(onEvent);
  const onCompleteRef = useRef(onComplete);
  const onErrorRef = useRef(onError);

  useEffect(() => {
    onEventRef.current = onEvent;
  }, [onEvent]);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    onErrorRef.current = onError;
  }, [onError]);

  useEffect(() => {
    if (!sessionId || !enabled) {
      return;
    }

    const queryParams = new URLSearchParams();

    if (harnessId) {
      queryParams.set('harnessId', harnessId);
    }

    const suffix = queryParams.toString();

    const streamUrl = suffix
      ? `/api/sessions/${sessionId}/stream?${suffix}`
      : `/api/sessions/${sessionId}/stream`;

    const eventSource = new EventSource(streamUrl);

    const handleEvent = (e: MessageEvent) => {
      try {
        const event = JSON.parse(e.data) as AeroEvent;

        onEventRef.current?.(event);

        if (event.type === 'session.idle') {
          void queryClient.invalidateQueries({
            queryKey: sessionKeys.messages(harnessId, sessionId),
          });

          void queryClient.invalidateQueries({
            queryKey: sessionKeys.toc(harnessId, sessionId),
          });

          void queryClient.invalidateQueries({
            queryKey: sessionKeys.todos(harnessId, sessionId),
          });

          onCompleteRef.current?.();
        }
      } catch (error) {
        console.error('Failed to parse SSE event:', error);
      }
    };

    /**
     * Keep this list in sync with AeroEvent.
     *
     * Events such as plugin.added/catalog.updated/etc.
     * never reach this layer because the server mapper drops them.
     */
    const knownEvents: AeroEvent['type'][] = [
      'message.updated',
      'message.part.updated',
      'message.part.delta',
      'message.part.removed',
      'message.removed',
      'session.updated',
      'session.status',
      'session.idle',
      'session.error',
      'session.diff',
    ];

    for (const type of knownEvents) {
      eventSource.addEventListener(type, handleEvent);
    }

    /**
     * Also support default SSE messages in case the server
     * emits an event without an explicit `event:` name.
     */
    eventSource.onmessage = handleEvent;

    eventSource.onerror = () => {
      /**
       * EventSource automatically attempts to reconnect.
       *
       * Do NOT mark the session idle here: a transport error
       * does not mean the model stopped working.
       */
      onErrorRef.current?.(new Error('Session event stream disconnected'));
    };

    return () => {
      for (const type of knownEvents) {
        eventSource.removeEventListener(type, handleEvent);
      }

      eventSource.onmessage = null;
      eventSource.onerror = null;
      eventSource.close();
    };
  }, [sessionId, harnessId, enabled, queryClient]);
}
