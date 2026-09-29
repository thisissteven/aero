'use client';

import { toast } from '@aero/ui';
import { useNavigate } from '@tanstack/react-router';
import { useCallback } from 'react';

import { useChatStore } from '@/app/features/chat-page/chat-feed/chat-store';
import { useChatSettingsStore } from '@/app/features/chat-page/chat-input/chat-settings-store';
import { useCreateSession, useSendMessage } from '@/app/hooks/api/sessions';
import { useCreateWorktree } from '@/app/hooks/api/worktree';
import { useI18n } from '@/app/hooks/i18n';
import { sessionStreamManager } from '@/app/services/session-stream-manager';

export type SendTodoTarget = 'current' | 'new' | 'worktree';

/**
 * Hands a todo to the agent. Kept separate from the composer's send flow
 * (`useHandleSend`) because that one reads the contenteditable DOM and would
 * clobber whatever the user has typed.
 */
export function useSendTodoToAgent() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const { mutateAsync: sendMessage } = useSendMessage(undefined);
  const { mutateAsync: createSession } = useCreateSession();
  const { mutateAsync: createWorktree } = useCreateWorktree();

  return useCallback(
    async (options: {
      text: string;
      target: SendTodoTarget;
      sessionId?: string;
      workspaceDirectory: string;
    }) => {
      const { text, target, sessionId, workspaceDirectory } = options;
      const { selectedModel, selectedAgent, selectedVariant } =
        useChatSettingsStore.getState();

      const parts = [{ type: 'text' as const, text }];
      const model = selectedModel
        ? {
            modelId: selectedModel.model.id,
            providerId: selectedModel.providerId,
          }
        : undefined;

      try {
        if (target === 'current' && sessionId) {
          await sessionStreamManager.ensure({
            sessionId,
            harnessId: undefined,
          });
          await sendMessage({
            sessionId,
            parts,
            model,
            agent: selectedAgent?.name,
            variant: selectedVariant,
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

        await sessionStreamManager.ensure({
          sessionId: session.id,
          harnessId: undefined,
        });
        await sendMessage({
          sessionId: session.id,
          parts,
          model,
          agent: selectedAgent?.name,
          variant: selectedVariant,
        });

        useChatStore.getState().addRunningSession(session.id);
        navigate({ to: `/sessions/${session.id}` });
      } catch {
        toast.danger(t.notesPanel.todos.sendFailed);
      }
    },
    [t, navigate, sendMessage, createSession, createWorktree],
  );
}
