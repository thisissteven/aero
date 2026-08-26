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
          queryClient.invalidateQueries({
            queryKey: sessionKeys.messages(harnessId, sessionId),
          });

          queryClient.invalidateQueries({
            queryKey: sessionKeys.toc(harnessId, sessionId),
          });

          queryClient.invalidateQueries({
            queryKey: sessionKeys.todos(harnessId, sessionId),
          });

          onCompleteRef.current?.();

          // DO NOT close the EventSource here.
          // This stream is session-scoped and should stay alive.
        }
      } catch (error) {
        console.error('Failed to parse SSE event:', error);
      }
    };

    eventSource.onmessage = handleEvent;

    const knownEvents = [
      'message.updated',
      'message.part.updated',
      'session.updated',
      'session.idle',
      'session.error',
    ];

    for (const type of knownEvents) {
      eventSource.addEventListener(type, handleEvent);
    }

    eventSource.onerror = () => {
      onErrorRef.current?.(new Error('Stream disconnected'));
    };

    return () => {
      eventSource.close();
    };
  }, [sessionId, harnessId, enabled, queryClient]);
}
