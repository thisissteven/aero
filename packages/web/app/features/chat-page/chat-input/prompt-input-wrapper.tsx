import { useNavigate, useParams } from '@tanstack/react-router';
import { ReactNode, useCallback, useState } from 'react';

import { PromptInput, toast } from '@aero/ui';

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
import { sessionStreamManager } from '@/app/services/session-stream-manager';

export function NewSessionPromptInputWrapper({
  children,
  onSubmit,
}: {
  children: ReactNode;
  onSubmit: () => void;
}) {
  const [value, setValue] = useState('');
  const [isPending, setIsPending] = useState(false);

  const navigate = useNavigate();

  const { mutateAsync: createSession } = useCreateSession();
  const { mutateAsync: sendMessage } = useSendMessage(undefined);

  const selectedModel = useChatSettingsStore((state) => state.selectedModel);
  const selectedAgent = useChatSettingsStore((state) => state.selectedAgent);

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
            modelId: selectedModel?.id as string,
            providerId: selectedModel?.providerId as string,
          },
          agent: selectedAgent?.name,
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
      onSubmit();
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
  onSubmit: () => void;
}

export function ActiveSessionPromptInputWrapper({
  children,
  isDisabled,
  onSubmit,
}: ActiveSessionPromptInputWrapperProps) {
  const [value, setValue] = useState('');
  const [isAborting, setIsAborting] = useState(false);

  const { sessionId } = useParams({
    strict: false,
  });

  const { data: session } = useSession(undefined, sessionId);

  const selectedModel = useChatSettingsStore((state) => state.selectedModel);

  const selectedAgent = useChatSettingsStore((state) => state.selectedAgent);

  const status = useChatStore((state) =>
    sessionId
      ? (state.sessions[sessionId]?.status ?? {
          type: 'idle',
        })
      : { type: 'idle' },
  );

  const isPending = status.type !== 'idle';

  const { mutate: sendMessage } = useSendMessage(undefined);

  const { mutate: abortSession } = useAbortSession(undefined);

  const handleSend = useCallback(async () => {
    const text = value.trim();

    if (
      !text ||
      isPending ||
      !sessionId ||
      !selectedModel?.providerId ||
      !selectedModel.id
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
          modelId: selectedModel.id,
          providerId: selectedModel.providerId,
        },
        agent: selectedAgent?.name,
      },
      {
        onSuccess: () => {
          setValue('');
        },

        onError: () => {
          toast.danger('Failed to send message');
        },
      },
    );

    onSubmit();
  }, [
    value,
    isPending,
    sessionId,
    selectedModel,
    selectedAgent,
    sendMessage,
    onSubmit,
  ]);

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

  const inputDisabled = isDisabled || (session && session.readOnly);

  return (
    <PromptInput
      className='group/prompt-input w-full max-w-[780px]'
      value={value}
      onValueChange={setValue}
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
