import { toast } from '@aero/ui';
import { useCallback, useState } from 'react';
import {
  composerSubmitAfter,
  composerSubmitBefore,
} from '@/app/components/smart-composer/components/composer-submit';
import {
  ComposerSegment,
  extractCommandPayload,
} from '@/app/components/smart-composer/smart-composer-helpers';
import {
  getComposerSession,
  useComposerStore,
} from '@/app/components/smart-composer/smart-composer-store';
import { useSessionRuntime } from '@/app/features/chat-page/chat-feed/chat-store';
import { buildMessageParts } from '@/app/features/chat-page/chat-input/build-message-parts';
import { useChatSettingsStore } from '@/app/features/chat-page/chat-input/chat-settings-store';
import {
  externalPartsSelectors,
  getExternalPartsSession,
  useExternalPartsStore,
} from '@/app/features/chat-page/chat-input/external-parts-store';
import {
  useAbortSession,
  useSendCommand,
  useSendMessage,
  useSendShellCommand,
  useSession,
} from '@/app/hooks/api/sessions';
import { useDoubleKeyPress } from '@/app/hooks/useDoubleKeyPress';
import { useKeyPress } from '@/app/hooks/useKeyPress';
import { useSessionId } from '@/app/providers/SessionIdProvider';
import { sessionStreamManager } from '@/app/services/session-stream-manager';

export function usePromptInput({ isDisabled }: { isDisabled?: boolean }) {
  const sessionId = useSessionId();
  const segments = useComposerStore(
    (state) => getComposerSession(state, sessionId).segments,
  );

  useKeyPress(
    'ArrowRight',
    () => useChatSettingsStore.getState().cycleVariant(1),
    { ignoreInputs: segments.length > 0 },
  );

  useKeyPress(
    'ArrowLeft',
    () => useChatSettingsStore.getState().cycleVariant(-1),
    { ignoreInputs: segments.length > 0 },
  );

  const [isAborting, setIsAborting] = useState(false);
  const { mutate: sendMessage } = useSendMessage(undefined);
  const { mutate: sendShellCommand } = useSendShellCommand(undefined);
  const { mutate: sendCommand } = useSendCommand(undefined);
  const { mutate: abortSession } = useAbortSession(undefined);
  const { data: session } = useSession(undefined, sessionId);

  const status = useSessionRuntime(sessionId, (runtime) => runtime.status.type);
  const isPending = status !== 'idle';
  const inputDisabled = isDisabled || (session && session.readOnly);

  const handleSend = useCallback(
    async (sessionId: string) => {
      composerSubmitBefore(sessionId);

      const composerState = getComposerSession(
        useComposerStore.getState(),
        sessionId,
      );
      const payload = composerState.payload;
      const text = payload?.text ?? '';
      const externalState = getExternalPartsSession(
        useExternalPartsStore.getState(),
        sessionId,
      );

      const { selectedModel, selectedAgent, selectedVariant } =
        useChatSettingsStore.getState();

      const hasComposerContent = (payload?.segments.length ?? 0) > 0;
      const hasExternalContent = !externalPartsSelectors.isEmpty(sessionId);

      if (
        (!hasComposerContent && !hasExternalContent) ||
        isPending ||
        !sessionId ||
        !selectedModel?.providerId ||
        !selectedModel.model.id
      ) {
        return;
      }

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
          } = extractCommandPayload(segments);

          // NOTE: command flow doesn't currently merge external parts.
          // If you want attachments alongside a command, concat
          // buildExternalParts(externalState) into `parts` here.
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
          const parts = buildMessageParts(
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
        composerSubmitAfter(sessionId);
        useExternalPartsStore.getState().reset(sessionId);
      }
    },
    [isPending, sendMessage, sendShellCommand, sendCommand],
  );

  const handleAbort = useCallback(() => {
    if (!sessionId || !isPending || isAborting) return;

    setIsAborting(true);

    abortSession(sessionId, {
      onSuccess: () => setIsAborting(false),
      onError: () => {
        setIsAborting(false);
        toast.danger('Failed to stop session');
      },
    });
  }, [sessionId, isPending, isAborting, abortSession]);

  useDoubleKeyPress('Escape', handleAbort, {
    threshold: 350,
    ignoreInputs: false,
  });

  return {
    text: segments.length ? 'text' : '',
    inputDisabled,
    handleSend,
    handleAbort,
    isAborting,
    isPending,
  };
}
