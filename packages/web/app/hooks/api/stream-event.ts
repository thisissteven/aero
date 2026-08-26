import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

import { sessionKeys } from '@/app/hooks/api/sessions';

export interface StreamEvent {
  type: string;
  properties: Record<string, unknown>;
  [key: string]: unknown;
}

interface UseSessionStreamOptions {
  harnessId?: string;
  sessionId: string;
  enabled?: boolean;
  onEvent?: (event: StreamEvent) => void;
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

  useEffect(() => {
    if (!sessionId || !enabled) return;

    const queryParams = new URLSearchParams();
    if (harnessId) queryParams.set('harnessId', harnessId);

    const streamUrl = `/api/sessions/${sessionId}/stream?${queryParams.toString()}`;
    const eventSource = new EventSource(streamUrl);

    const handleMessage = (e: MessageEvent) => {
      try {
        const parsedEvent: StreamEvent = JSON.parse(e.data);
        onEvent?.(parsedEvent);

        // Auto-refresh messages and TOC when turn finishes
        if (
          parsedEvent.type === 'turn-complete' ||
          parsedEvent.type === 'finish'
        ) {
          queryClient.invalidateQueries({
            queryKey: sessionKeys.messages(harnessId, sessionId),
          });
          queryClient.invalidateQueries({
            queryKey: sessionKeys.toc(harnessId, sessionId),
          });
          queryClient.invalidateQueries({
            queryKey: sessionKeys.todos(harnessId, sessionId),
          });
          onComplete?.();
          eventSource.close();
        }
      } catch (err) {
        console.error('Failed to parse SSE event:', err);
      }
    };

    eventSource.onmessage = handleMessage;

    // Listen to custom SSE event names emitted by streamSSE
    const knownEvents = [
      'message.updated',
      'message.part.updated',
      'message.part.removed',
      'session.status',
      'session.idle',
      'session.error',
      'todo.updated',
    ];
    knownEvents.forEach((type) => {
      eventSource.addEventListener(type, handleMessage);
    });

    eventSource.onerror = (err) => {
      console.error('SSE Stream Connection Error:', err);
      onError?.(new Error('Stream disconnected'));
      eventSource.close();
    };

    return () => {
      eventSource.close();
    };
  }, [
    sessionId,
    harnessId,
    enabled,
    queryClient,
    onEvent,
    onComplete,
    onError,
  ]);
}
