import { useNavigate, useParams } from '@tanstack/react-router';
import { ReactNode, useCallback, useState } from 'react';

import { PromptInput, toast } from '@aero/ui';

import {
  composerSubmitAfter,
  composerSubmitBefore,
} from '@/app/components/smart-composer/components/composer-submit';
import { useComposerStore } from '@/app/components/smart-composer/smart-composer-store';
import { useChatStore } from '@/app/features/chat-page/chat-feed/chat-store';
import { useChatSettingsStore } from '@/app/features/chat-page/chat-input/chat-settings-store';
import { useNewSessionStore } from '@/app/features/new-session-page/new-session-store';
import { useGitErrorCode } from '@/app/hooks/api/git';
import {
  useAbortSession,
  useCreateSession,
  useSendMessage,
  useSession,
} from '@/app/hooks/api/sessions';
import { useDoubleKeyPress } from '@/app/hooks/useDoubleKeyPress';
import { useKeyPress } from '@/app/hooks/useKeyPress';
import { sessionStreamManager } from '@/app/services/session-stream-manager';

export function NewSessionPromptInputWrapper({
  children,
}: {
  children: ReactNode;
}) {
  const [value, setValue] = useState('');
  const [isPending, setIsPending] = useState(false);

  const navigate = useNavigate();

  const { mutateAsync: createSession } = useCreateSession();
  const { mutateAsync: sendMessage } = useSendMessage(undefined);

  const selectedVariant = useChatSettingsStore(
    (state) => state.selectedVariant,
  );
  const selectedModel = useChatSettingsStore((state) => state.selectedModel);
  const selectedAgent = useChatSettingsStore((state) => state.selectedAgent);

  const cycleVariant = useChatSettingsStore((state) => state.cycleVariant);

  useKeyPress(
    'ArrowRight',
    () => {
      cycleVariant(1);
    },
    {
      ignoreInputs: value.length === 0 ? false : true,
    },
  );

  useKeyPress(
    'ArrowLeft',
    () => {
      cycleVariant(-1);
    },
    {
      ignoreInputs: value.length === 0 ? false : true,
    },
  );

  const state = useNewSessionStore((state) => state.state);

  const selectedWorkspace = useNewSessionStore(
    (state) => state.selectedWorkspace?.directory,
  );

  const selectedWorktree = useNewSessionStore(
    (state) => state.selectedWorktree,
  );

  const { data: error } = useGitErrorCode(selectedWorkspace);

  const addRunningSession = useChatStore((state) => state.addRunningSession);

  const handleSubmit = async (text: string) => {
    try {
      setIsPending(true);

      const directory =
        state === 'chat' ? undefined : (selectedWorktree ?? selectedWorkspace);

      const session = await createSession(
        {
          directory,
        },
        {
          onError: () => {
            toast.danger('Failed to create session');
          },
        },
      );

      await sessionStreamManager.ensure({
        sessionId: session.id,
        harnessId: undefined,
      });

      await sendMessage(
        {
          sessionId: session.id,
          parts: [
            {
              type: 'text',
              text,
            },
          ],
          model: {
            modelId: selectedModel?.model.id as string,
            providerId: selectedModel?.providerId as string,
          },
          agent: selectedAgent?.name,
          variant: selectedVariant,
        },
        {
          onSuccess: () => {
            navigate({
              to: `/sessions/${session.id}`,
            });
          },
          onError: () => {
            toast.danger('Failed to send message');
          },
        },
      );

      addRunningSession(session.id);
    } catch {
      setIsPending(false);
    }
  };

  const isDisabled =
    error && error?.code === 'DIRECTORY_NOT_FOUND' && state === 'work';

  return (
    <PromptInput
      className='group/prompt-input'
      value={value}
      onValueChange={setValue}
      onSubmit={() => handleSubmit(value)}
      isDisabled={isDisabled}
      status={isPending ? 'submitted' : undefined}
    >
      {children}
    </PromptInput>
  );
}

interface ActiveSessionPromptInputWrapperProps {
  children: ReactNode;
  isDisabled: boolean;
}

export function ActiveSessionPromptInputWrapper({
  children,
  isDisabled,
}: ActiveSessionPromptInputWrapperProps) {
  const {
    text,
    handleSend,
    handleAbort,
    inputDisabled,
    isAborting,
    isPending,
  } = usePromptInput({ isDisabled });

  return (
    <PromptInput
      className='group/prompt-input w-full max-w-[780px]'
      value={text}
      onSubmit={handleSend}
      onStop={handleAbort}
      isDisabled={inputDisabled}
      status={isAborting ? 'submitted' : undefined}
      isPending={isPending}
    >
      {children}
    </PromptInput>
  );
}

export function usePromptInput({ isDisabled }: { isDisabled?: boolean }) {
  const segments = useComposerStore((state) => state.segments);

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
  const { sessionId } = useParams({ strict: false });
  const { mutate: sendMessage } = useSendMessage(undefined);
  const { mutate: abortSession } = useAbortSession(undefined);
  const { data: session } = useSession(undefined, sessionId);

  const status = useChatStore((state) =>
    sessionId
      ? (state.sessions[sessionId]?.status ?? {
          type: 'idle',
        })
      : { type: 'idle' },
  );

  const isPending = status.type !== 'idle';

  const inputDisabled = isDisabled || (session && session.readOnly);

  const handleSend = useCallback(async () => {
    composerSubmitBefore();
    const text = useComposerStore.getState().payload?.text;

    const { selectedModel, selectedAgent, selectedVariant } =
      useChatSettingsStore.getState();

    if (
      !text ||
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

    sendMessage(
      {
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
      },
      {
        onSuccess: () => {
          composerSubmitAfter();
        },

        onError: () => {
          toast.danger('Failed to send message');
        },
      },
    );
  }, [isPending, sessionId, sendMessage]);

  const handleAbort = useCallback(() => {
    if (!sessionId || !isPending || isAborting) {
      return;
    }

    setIsAborting(true);

    abortSession(sessionId, {
      onSuccess: () => {
        setIsAborting(false);
      },

      onError: () => {
        setIsAborting(false);

        toast.danger('Failed to stop session');
      },
    });
  }, [sessionId, isPending, isAborting, abortSession]);

  useDoubleKeyPress('Escape', handleAbort, { threshold: 350 });

  return {
    text: segments.length ? 'text' : '',
    inputDisabled,
    handleSend,
    handleAbort,
    isAborting,
    isPending,
  };
}
