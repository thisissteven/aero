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
import { useI18n } from '@/app/hooks/i18n';
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

export function useHandleSend(sessionId: string, isSteerMode: boolean) {
  const { t } = useI18n();
  const { mutate: sendMessage } = useSendMessage(undefined);
  const { mutate: sendShellCommand } = useSendShellCommand(undefined);
  const { mutate: sendCommand } = useSendCommand(undefined);

  const status = useSessionRuntime(sessionId, (runtime) => runtime.status.type);
  const isPending = status !== 'idle' && !isSteerMode;

  const handleSend = useCallback(
    async (sessionId: string, fromNewChat?: boolean) => {
      const resolvedSessionId = fromNewChat ? 'undefined' : sessionId;
      composerSubmitBefore(resolvedSessionId);

      const composerState = getComposerSession(
        useComposerStore.getState(),
        resolvedSessionId,
      );

      const payload = composerState.payload;
      // Compute segments and steer detection up front — sendTextMessage needs isSteer
      const segments = (payload?.segments ?? []).filter(
        (segment) => segment.type !== 'text' || segment.text.trim().length > 0,
      );
      const text =
        payload?.text
          .trim()
          .replace(/^\/steer\b\s*/, '')
          .trim() ?? '';
      const externalState = getExternalPartsSession(
        useExternalPartsStore.getState(),
        resolvedSessionId,
      );

      const { selectedModel, selectedAgent, selectedVariant } =
        useChatSettingsStore.getState();

      const hasComposerContent = (segments.length ?? 0) > 0;

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

      try {
        await sessionStreamManager.ensure({
          sessionId,
          harnessId: undefined,
        });
      } catch {
        toast.danger(t.chatInput.failedToConnectStream);
        return;
      }

      const effectiveSegments = isSteerMode ? segments.slice(1) : segments;

      const isShellMode = composerState.mode === 'shell';
      const isCommand =
        effectiveSegments[0]?.type === 'token' &&
        effectiveSegments[0].token.type === 'command';

      const sendTextMessage = (texts: string[]) => {
        sendMessage({
          sessionId,
          parts: texts.map((text) => ({
            type: 'text',
            text,
          })),
          model: {
            modelId: selectedModel.model.id,
            providerId: selectedModel.providerId,
          },
          agent: selectedAgent?.name,
          variant: selectedVariant,
          ...(isSteerMode ? { delivery: 'steer' as const } : {}),
        });
      };

      try {
        if (isShellMode && !isSteerMode) {
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
          } = extractCommandPayload(effectiveSegments);

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
                  revertSessionToast(
                    () =>
                      revertSession({
                        queryClient,
                        harnessId: undefined,
                        messageId: lastUserTurn.id,
                        sessionId,
                      }),
                    t,
                  );
                }

                return;
              }
              case 'redo': {
                const revertedMessages =
                  useChatStore.getState().activeSession.revertedMessages;

                if (revertedMessages.length === 0) return;

                if (revertedMessages.length === 1) {
                  restoreAllMessagesToast(
                    () =>
                      restoreAllMessages({
                        queryClient,
                        harnessId: undefined,
                        sessionId,
                      }),
                    t,
                  );
                } else {
                  const messageToRevert = revertedMessages[1];
                  revertSessionToast(
                    () =>
                      revertSession({
                        queryClient,
                        harnessId: undefined,
                        messageId: messageToRevert.messageId,
                        sessionId,
                      }),
                    t,
                  );
                }

                return;
              }

              case 'btw':
                return;
              case 'timeline':
                return;
              case 'handoff-review':
                return;

              case 'compact': {
                compactSession({
                  harnessId: undefined,
                  sessionId,
                  modelId: selectedModel.model.id,
                  providerId: selectedModel.providerId,
                  errorMessage: t.toolCommand.failedToCompact,
                });
                return;
              }

              case 'catch-up':
                sendTextMessage([
                  t.promptTemplates.catchUpIntro,
                  ...(args ? [t.promptTemplates.catchUpFocus(args)] : []),
                ]);
                return;
              case 'craft-goal': {
                sendTextMessage([
                  t.promptTemplates.craftGoalIntro,
                  ...(args ? [t.promptTemplates.craftGoalIdea(args)] : []),
                ]);
                return;
              }
              case 'debug':
                sendTextMessage([
                  t.promptTemplates.debugIntro,
                  ...(args ? [t.promptTemplates.debugEncounter(args)] : []),
                ]);
                return;
              case 'explore':
                sendTextMessage([
                  t.promptTemplates.exploreIntro,
                  ...(args ? [t.promptTemplates.exploreFocus(args)] : []),
                ]);
                return;
              case 'plan-feature':
                sendTextMessage([
                  t.promptTemplates.planFeatureIntro,
                  ...(args ? [t.promptTemplates.planFeatureIdea(args)] : []),
                ]);
                return;
              case 'schedule-task':
                sendTextMessage([
                  t.promptTemplates.scheduleIntro,
                  ...(args ? [t.promptTemplates.scheduleDetail(args)] : []),
                ]);
                return;
              case 'summary':
                sendTextMessage([
                  t.promptTemplates.summaryIntro,
                  ...(args ? [t.promptTemplates.summaryFocus(args)] : []),
                ]);
                return;
              case 'weigh':
                sendTextMessage([
                  t.promptTemplates.weighIntro,
                  ...(args ? [t.promptTemplates.weighDetail(args)] : []),
                ]);
                return;
              case 'workspace-review':
                sendTextMessage([t.promptTemplates.workspaceReviewIntro]);
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
            ...(isSteerMode ? { delivery: 'steer' as const } : {}),
          });
        } else {
          const parts = await buildMessageParts(
            text,
            effectiveSegments as ComposerSegment[],
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
            ...(isSteerMode ? { delivery: 'steer' as const } : {}),
          });
        }
      } catch {
        toast.danger(t.chatInput.failedToSendMessage);
      } finally {
        composerSubmitAfter(resolvedSessionId);
        useExternalPartsStore.getState().reset(resolvedSessionId);
      }
    },
    [isPending, sendMessage, sendShellCommand, sendCommand, isSteerMode, t],
  );

  return { handleSend, isPending };
}
