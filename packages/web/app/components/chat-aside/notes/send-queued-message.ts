'use client';

import { toast } from '@aero/ui';
import { useNavigate } from '@tanstack/react-router';
import { useCallback } from 'react';

import type { SendTodoTarget } from '@/app/components/chat-aside/notes/send-todo';
import type { ComposerSegment } from '@/app/components/smart-composer/smart-composer-helpers';
import { useChatStore } from '@/app/features/chat-page/chat-feed/chat-store';
import { useChatSettingsStore } from '@/app/features/chat-page/chat-input/chat-settings-store';
import { EMPTY_EXTERNAL_PARTS_SESSION } from '@/app/features/chat-page/chat-input/external-parts-store';
import { useComposerDispatch } from '@/app/features/chat-page/chat-input/use-handle-send';
import { useCreateSession } from '@/app/hooks/api/sessions';
import { useCreateWorktree } from '@/app/hooks/api/worktree';
import { useI18n } from '@/app/hooks/i18n';

/**
 * Dispatches a queued message through the same composer pipeline the chat
 * input uses (commands, token expansion, mentions). The only difference is
 * the source: these messages are persisted in the workspace and may target a
 * brand-new session or worktree.
 */
export function useSendQueuedMessage() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const dispatch = useComposerDispatch();
  const { mutateAsync: createSession } = useCreateSession();
  const { mutateAsync: createWorktree } = useCreateWorktree();

  return useCallback(
    async (options: {
      segments: ComposerSegment[];
      text: string;
      target: SendTodoTarget;
      sessionId?: string;
      workspaceDirectory: string;
    }) => {
      const { segments, text, target, sessionId, workspaceDirectory } = options;
      const { selectedModel } = useChatSettingsStore.getState();

      if (!selectedModel) {
        toast.danger(t.notesPanel.queue.sendFailed);
        return;
      }

      try {
        if (target === 'current' && sessionId) {
          await dispatch({
            sessionId,
            segments,
            text,
            mode: 'normal',
            externalState: EMPTY_EXTERNAL_PARTS_SESSION,
            isSteerMode: false,
          });
          return;
        }

        let directory = workspaceDirectory;
        if (target === 'worktree') {
          const worktree = await createWorktree({
            directory: workspaceDirectory,
          });
          directory = worktree.directory;
        }

        const session = await createSession({ directory });

        const result = await dispatch({
          sessionId: session.id,
          segments,
          text,
          mode: 'normal',
          externalState: EMPTY_EXTERNAL_PARTS_SESSION,
          isSteerMode: false,
        });

        if (result === 'sent') {
          useChatStore.getState().addRunningSession(session.id);
          navigate({ to: `/sessions/${session.id}` });
        }
      } catch {
        toast.danger(t.notesPanel.queue.sendFailed);
      }
    },
    [t, navigate, dispatch, createSession, createWorktree],
  );
}
