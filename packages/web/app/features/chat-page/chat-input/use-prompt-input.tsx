import { toast } from '@aero/ui';
import { useCallback, useState } from 'react';
import {
  getComposerSession,
  useComposerStore,
} from '@/app/components/smart-composer/smart-composer-store';
import { useChatSettingsStore } from '@/app/features/chat-page/chat-input/chat-settings-store';
import {
  externalPartsSelectors,
  useExternalPartsStore,
} from '@/app/features/chat-page/chat-input/external-parts-store';
import { useHandleSend } from '@/app/features/chat-page/chat-input/use-handle-send';
import { useAbortSession, useSession } from '@/app/hooks/api/sessions';
import { useDoubleKeyPress } from '@/app/hooks/useDoubleKeyPress';
import { useKeyPress } from '@/app/hooks/useKeyPress';
import { useSessionId } from '@/app/providers/SessionIdProvider';

export function usePromptInput({ isDisabled }: { isDisabled?: boolean }) {
  const sessionId = useSessionId();
  const segments = useComposerStore(
    (state) => getComposerSession(state, sessionId).segments,
  );

  useKeyPress('ArrowRight', () =>
    useChatSettingsStore.getState().cycleVariant(1),
  );

  useKeyPress('ArrowLeft', () =>
    useChatSettingsStore.getState().cycleVariant(-1),
  );

  const [isAborting, setIsAborting] = useState(false);

  const { mutate: abortSession } = useAbortSession(undefined);
  const { data: session } = useSession(undefined, sessionId);

  const inputDisabled = isDisabled || (session && session.readOnly);

  const isExternalPartEmpty = useExternalPartsStore(
    externalPartsSelectors.isEmpty(sessionId),
  );

  const { handleSend, isPending } = useHandleSend(sessionId);

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
    text: segments.length || !isExternalPartEmpty ? 'text' : '',
    inputDisabled,
    handleSend,
    handleAbort,
    isAborting,
    isPending,
  };
}
