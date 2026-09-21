import { toast } from '@aero/ui';
import { useCallback } from 'react';
import {
  composerSubmitAfter,
  composerSubmitBefore,
} from '@/app/components/smart-composer/components/composer-submit';
import { AeroCommandName } from '@/app/components/smart-composer/custom-commands';
import {
  ComposerSegment,
  extractCommandPayload,
} from '@/app/components/smart-composer/smart-composer-helpers';
import {
  getComposerSession,
  useComposerStore,
} from '@/app/components/smart-composer/smart-composer-store';
import {
  useChatStore,
  useSessionRuntime,
} from '@/app/features/chat-page/chat-feed/chat-store';
import { buildMessageParts } from '@/app/features/chat-page/chat-input/build-message-parts';
import { useChatSettingsStore } from '@/app/features/chat-page/chat-input/chat-settings-store';
import {
  getExternalPartsSession,
  useExternalPartsStore,
} from '@/app/features/chat-page/chat-input/external-parts-store';
import {
  useSendCommand,
  useSendMessage,
  useSendShellCommand,
} from '@/app/hooks/api/sessions';
import { compactSession } from '@/app/lib/commands/compact-session';
import {
  restoreAllMessages,
  restoreAllMessagesToast,
} from '@/app/lib/commands/restore-all-messages';
import {
  revertSession,
  revertSessionToast,
} from '@/app/lib/commands/revert-session';
import { queryClient } from '@/app/providers';
import { sessionStreamManager } from '@/app/services/session-stream-manager';

export function useHandleSend(sessionId: string) {
  const { mutate: sendMessage } = useSendMessage(undefined);
  const { mutate: sendShellCommand } = useSendShellCommand(undefined);
  const { mutate: sendCommand } = useSendCommand(undefined);

  const status = useSessionRuntime(sessionId, (runtime) => runtime.status.type);
  const isPending = status !== 'idle';

  const handleSend = useCallback(
    async (sessionId: string, fromNewChat?: boolean) => {
      const resolvedSessionId = fromNewChat ? 'undefined' : sessionId;
      composerSubmitBefore(resolvedSessionId);

      const composerState = getComposerSession(
        useComposerStore.getState(),
        resolvedSessionId,
      );

      const payload = composerState.payload;
      const text = payload?.text ?? '';
      const externalState = getExternalPartsSession(
        useExternalPartsStore.getState(),
        resolvedSessionId,
      );

      const { selectedModel, selectedAgent, selectedVariant } =
        useChatSettingsStore.getState();

      const hasComposerContent = (payload?.segments.length ?? 0) > 0;

      const hasExternalContent = !(
        externalState.fileAttachments.length === 0 &&
        externalState.chatQuotes.length === 0 &&
        externalState.browserAnnotations.length === 0 &&
        externalState.subtask === null
      );

      if (
        (!hasComposerContent && !hasExternalContent) ||
        isPending ||
        !sessionId ||
        !selectedModel
      ) {
        return;
      }

      const sendTextMessage = (text: string) => {
        sendMessage({
          sessionId,
          parts: [
            {
              type: 'text',
              text,
            },
          ],
          model: {
            modelId: selectedModel.model.id,
            providerId: selectedModel.providerId,
          },
          agent: selectedAgent?.name,
          variant: selectedVariant,
        });
      };

      try {
        await sessionStreamManager.ensure({
          sessionId,
          harnessId: undefined,
        });
      } catch {
        toast.danger('Failed to connect to session stream');
        return;
      }

      const segments = payload?.segments ?? [];
      const isShellMode = composerState.mode === 'shell';
      const isCommand =
        segments[0]?.type === 'token' && segments[0].token.type === 'command';

      try {
        if (isShellMode) {
          sendShellCommand({
            sessionId,
            model: {
              modelId: selectedModel.model.id,
              providerId: selectedModel.providerId,
            },
            agent: selectedAgent?.name,
            command: text,
          });
        } else if (isCommand) {
          const {
            command,
            arguments: args,
            parts,
            isCustomCommand,
          } = extractCommandPayload(segments);

          if (isCustomCommand) {
            switch (command as AeroCommandName) {
              case 'undo': {
                const revertedMessages =
                  useChatStore.getState().activeSession.revertedMessages;
                const lastUserTurn = useChatStore
                  .getState()
                  .activeSession.turns.findLast(
                    (turn) =>
                      turn.role === 'user' &&
                      !revertedMessages.find((m) => m.messageId === turn.id),
                  );

                if (lastUserTurn) {
                  revertSessionToast(() =>
                    revertSession({
                      queryClient,
                      harnessId: undefined,
                      messageId: lastUserTurn.id,
                      sessionId,
                    }),
                  );
                }

                return;
              }
              case 'redo': {
                const revertedMessages =
                  useChatStore.getState().activeSession.revertedMessages;

                if (revertedMessages.length === 0) return;

                if (revertedMessages.length === 1) {
                  restoreAllMessagesToast(() =>
                    restoreAllMessages({
                      queryClient,
                      harnessId: undefined,
                      sessionId,
                    }),
                  );
                } else {
                  const messageToRevert = revertedMessages[1];
                  revertSessionToast(() =>
                    revertSession({
                      queryClient,
                      harnessId: undefined,
                      messageId: messageToRevert.messageId,
                      sessionId,
                    }),
                  );
                }

                return;
              }

              case 'btw':
                return;
              case 'catch-up':
                sendTextMessage(
                  'Catch me up on where this project is right now.',
                );
                return;
              case 'compact': {
                compactSession({
                  harnessId: undefined,
                  sessionId,
                  modelId: selectedModel.model.id,
                  providerId: selectedModel.providerId,
                });
                return;
              }
              case 'craft-goal':
                sendTextMessage(
                  'Help me turn an idea or task into a clear, verifiable Goal.',
                );
                return;
              case 'debug':
                sendTextMessage('I want to debug an issue.');
                return;
              case 'explore':
                sendTextMessage('Give me a high-level tour of this codebase.');
                return;
              case 'plan-feature':
                sendTextMessage('I want to start planning a feature.');
                return;
              case 'schedule-task':
                sendTextMessage('Help me set up a scheduled task.');
                return;
              case 'timeline':
                return;
              case 'summary':
                sendTextMessage('Summarize this session.');
                return;
              case 'weigh':
                sendTextMessage('Help me decide how to approach this.');
                return;
              case 'workspace-review':
                sendTextMessage('Review the changes made in this workspace.');
                return;
            }
          }

          sendCommand({
            sessionId,
            model: `${selectedModel.providerId}/${selectedModel.model.id}`,
            agent: selectedAgent?.name,
            variant: selectedVariant,
            command,
            arguments: args,
            parts,
          });
        } else {
          const parts = await buildMessageParts(
            text,
            segments as ComposerSegment[],
            externalState,
          );

          sendMessage({
            sessionId,
            parts,
            model: {
              modelId: selectedModel.model.id,
              providerId: selectedModel.providerId,
            },
            agent: selectedAgent?.name,
            variant: selectedVariant,
          });
        }
      } catch {
        toast.danger('Failed to send message');
      } finally {
        composerSubmitAfter(resolvedSessionId);
        useExternalPartsStore.getState().reset(resolvedSessionId);
      }
    },
    [isPending, sendMessage, sendShellCommand, sendCommand],
  );

  return { handleSend, isPending };
}
