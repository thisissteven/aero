import { toast } from '@aero/ui';
import { useCallback } from 'react';
import {
  composerSubmitAfter,
  composerSubmitBefore,
} from '@/app/components/smart-composer/components/composer-submit';
import { AeroCommandName } from '@/app/components/smart-composer/custom-commands';
import {
  buildText,
  ComposerSegment,
  extractCommandPayload,
} from '@/app/components/smart-composer/smart-composer-helpers';
import {
  type ComposerMode,
  getComposerSession,
  useComposerStore,
} from '@/app/components/smart-composer/smart-composer-store';
import {
  useChatStore,
  useSessionRuntime,
} from '@/app/features/chat-page/chat-feed/chat-store';
import {
  buildComposerTokenParts,
  buildMessageParts,
} from '@/app/features/chat-page/chat-input/build-message-parts';
import { useChatSettingsStore } from '@/app/features/chat-page/chat-input/chat-settings-store';
import {
  getExternalPartsSession,
  type SessionExternalPartsState,
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

/**
 * `blocked` means nothing was attempted (no model / stream unavailable) and
 * the caller should keep its draft; `failed` means a send was attempted and
 * failed; `sent` succeeded.
 */
export type ComposerDispatchResult = 'sent' | 'failed' | 'blocked';

export interface ComposerDispatchInput {
  sessionId: string;
  segments: ComposerSegment[];
  text: string;
  mode: ComposerMode;
  externalState: Pick<
    SessionExternalPartsState,
    | 'fileAttachments'
    | 'chatQuotes'
    | 'browserAnnotations'
    | 'githubLinks'
    | 'subtask'
  >;
  isSteerMode: boolean;
}

/**
 * The actual composer dispatch: commands, shell, token expansion and mentions.
 * Extracted from `useHandleSend` so other persisted surfaces (the message
 * queue) send through the exact same path.
 */
export function useComposerDispatch() {
  const { t } = useI18n();
  const { mutate: sendMessage } = useSendMessage(undefined);
  const { mutate: sendShellCommand } = useSendShellCommand(undefined);
  const { mutate: sendCommand } = useSendCommand(undefined);

  return useCallback(
    async ({
      sessionId,
      segments,
      text,
      mode,
      externalState,
      isSteerMode,
    }: ComposerDispatchInput): Promise<ComposerDispatchResult> => {
      const { selectedModel, selectedAgent, selectedVariant } =
        useChatSettingsStore.getState();

      if (!selectedModel) {
        toast.danger(t.chatInput.failedToSendMessage);
        return 'blocked';
      }

      const model = {
        modelId: selectedModel.model.id,
        providerId: selectedModel.providerId,
      };

      try {
        await sessionStreamManager.ensure({
          sessionId,
          harnessId: undefined,
        });
      } catch {
        toast.danger(t.chatInput.failedToConnectStream);
        return 'blocked';
      }

      const effectiveSegments = isSteerMode ? segments.slice(1) : segments;

      const isShellMode = mode === 'shell';
      const isCommand =
        effectiveSegments[0]?.type === 'token' &&
        effectiveSegments[0].token.type === 'command';

      const sendTextMessage = (texts: string[]) => {
        const mentionParts = buildComposerTokenParts(
          effectiveSegments as ComposerSegment[],
        );

        sendMessage({
          sessionId,
          parts: [
            ...texts.map((text) => ({
              type: 'text' as const,
              text,
            })),
            ...mentionParts,
          ],
          model,
          agent: selectedAgent?.name,
          variant: selectedVariant,
          ...(isSteerMode ? { delivery: 'steer' as const } : {}),
        });
      };

      try {
        if (isShellMode && !isSteerMode) {
          sendShellCommand({
            sessionId,
            model,
            agent: selectedAgent?.name,
            command: text,
          });
        } else if (isCommand) {
          const {
            command,
            arguments: rawArgs,
            isCustomCommand,
          } = extractCommandPayload(effectiveSegments);

          // Custom commands build their message the same way a normal send
          // does: the arguments keep the composer's original whitespace and
          // include mention labels (file/agent/skill/snippet). The mention
          // parts are appended by `sendTextMessage`.
          const args = isCustomCommand
            ? buildText(
                segments.filter(
                  (segment) => segment !== effectiveSegments[0],
                ) as ComposerSegment[],
              )
            : rawArgs;

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

                return 'sent';
              }
              case 'redo': {
                const revertedMessages =
                  useChatStore.getState().activeSession.revertedMessages;

                if (revertedMessages.length === 0) return 'sent';

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

                return 'sent';
              }

              case 'btw':
                return 'sent';
              case 'timeline':
                return 'sent';
              case 'handoff-review':
                return 'sent';

              case 'compact': {
                compactSession({
                  harnessId: undefined,
                  sessionId,
                  modelId: selectedModel.model.id,
                  providerId: selectedModel.providerId,
                  errorMessage: t.toolCommand.failedToCompact,
                });
                return 'sent';
              }

              case 'catch-up':
                sendTextMessage([
                  t.promptTemplates.catchUpIntro,
                  ...(args ? [t.promptTemplates.catchUpFocus(args)] : []),
                ]);
                return 'sent';
              case 'craft-goal': {
                sendTextMessage([
                  t.promptTemplates.craftGoalIntro,
                  ...(args ? [t.promptTemplates.craftGoalIdea(args)] : []),
                ]);
                return 'sent';
              }
              case 'debug':
                sendTextMessage([
                  t.promptTemplates.debugIntro,
                  ...(args ? [t.promptTemplates.debugEncounter(args)] : []),
                ]);
                return 'sent';
              case 'explore':
                sendTextMessage([
                  t.promptTemplates.exploreIntro,
                  ...(args ? [t.promptTemplates.exploreFocus(args)] : []),
                ]);
                return 'sent';
              case 'plan-feature':
                sendTextMessage([
                  t.promptTemplates.planFeatureIntro,
                  ...(args ? [t.promptTemplates.planFeatureIdea(args)] : []),
                ]);
                return 'sent';
              case 'schedule-task':
                sendTextMessage([
                  t.promptTemplates.scheduleIntro,
                  ...(args ? [t.promptTemplates.scheduleDetail(args)] : []),
                ]);
                return 'sent';
              case 'summary':
                sendTextMessage([
                  t.promptTemplates.summaryIntro,
                  ...(args ? [t.promptTemplates.summaryFocus(args)] : []),
                ]);
                return 'sent';
              case 'weigh':
                sendTextMessage([
                  t.promptTemplates.weighIntro,
                  ...(args ? [t.promptTemplates.weighDetail(args)] : []),
                ]);
                return 'sent';
              case 'workspace-review':
                sendTextMessage([t.promptTemplates.workspaceReviewIntro]);
                return 'sent';
            }
          }

          sendCommand({
            sessionId,
            model: `${selectedModel.providerId}/${selectedModel.model.id}`,
            agent: selectedAgent?.name,
            variant: selectedVariant,
            command,
            arguments: args,
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
            model,
            agent: selectedAgent?.name,
            variant: selectedVariant,
            ...(isSteerMode ? { delivery: 'steer' as const } : {}),
          });
        }
      } catch {
        toast.danger(t.chatInput.failedToSendMessage);
        return 'failed';
      }

      return 'sent';
    },
    [sendCommand, sendMessage, sendShellCommand, t],
  );
}

export function useHandleSend(sessionId: string, isSteerMode: boolean) {
  const dispatch = useComposerDispatch();

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

      const { selectedModel } = useChatSettingsStore.getState();

      const hasComposerContent = (segments.length ?? 0) > 0;

      const hasExternalContent = !(
        externalState.fileAttachments.length === 0 &&
        externalState.chatQuotes.length === 0 &&
        externalState.browserAnnotations.length === 0 &&
        externalState.githubLinks.length === 0 &&
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

      const result = await dispatch({
        sessionId,
        segments: segments as ComposerSegment[],
        text,
        mode: composerState.mode,
        externalState,
        isSteerMode,
      });

      // Nothing was attempted (no model / stream down) — keep the draft.
      if (result === 'blocked') return;

      // The server consumes the goal-mode arm flag when a prompt is sent, so
      // refresh the cached flag for the composer target button.
      void queryClient.invalidateQueries({
        queryKey: ['config', 'settings', 'goalMode'],
      });

      composerSubmitAfter(resolvedSessionId);
      useExternalPartsStore.getState().reset(resolvedSessionId);
    },
    [dispatch, isPending, isSteerMode],
  );

  return { handleSend, isPending };
}
