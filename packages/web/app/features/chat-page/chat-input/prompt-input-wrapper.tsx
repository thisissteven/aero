import { useNavigate, useParams } from '@tanstack/react-router';
import { ReactNode, useCallback, useState } from 'react';

import { PromptInput, toast } from '@aero/ui';

import { useChatStore } from '@/app/features/chat-page/chat-feed/chat-store';
import { useChatSettingsStore } from '@/app/features/chat-page/chat-input/chat-settings-store';
import { useNewSessionStore } from '@/app/features/new-session-page/new-session-store';
import {
  sessionKeys,
  useAbortSession,
  useCreateSession,
  useSendMessage,
} from '@/app/hooks/api/sessions';
import { queryClient } from '@/app/providers';
import { sessionStreamManager } from '@/app/services/session-stream-manager';

export function NewSessionPromptInputWrapper({
  children,
  onSubmit,
}: {
  children: ReactNode;
  onSubmit: () => void;
}) {
  const [value, setValue] = useState('');

  const navigate = useNavigate();

  const { mutateAsync: createSession, isPending: isPendingCreateSession } =
    useCreateSession();
  const { mutateAsync: sendMessage, isPending: isPendingSendMessage } =
    useSendMessage(undefined);

  const selectedModel = useChatSettingsStore((state) => state.selectedModel);
  const selectedAgent = useChatSettingsStore((state) => state.selectedAgent);

  const selectedWorkspace = useNewSessionStore(
    (state) => state.selectedWorkspace?.directory,
  );
  const selectedWorktree = useNewSessionStore(
    (state) => state.selectedWorktree,
  );

  const addRunningSession = useChatStore((state) => state.addRunningSession);

  const handleSubmit = async (text: string) => {
    const session = await createSession(
      {
        directory: selectedWorktree ?? selectedWorkspace,
      },
      {
        onError: () => toast.danger('Failed to create session'),
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
        onSuccess: () =>
          navigate({
            to: `/sessions/${session.id}`,
          }),
      },
    );

    addRunningSession(session.id);
    onSubmit();
  };

  const isPending = isPendingCreateSession || isPendingSendMessage;

  const isDisabled =
    isPending || !selectedModel?.providerId || !selectedModel?.id;

  return (
    <PromptInput
      value={value}
      onValueChange={setValue}
      onSubmit={() => handleSubmit(value)}
      isDisabled={isDisabled}
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

  const { sessionId } = useParams({
    strict: false,
  });

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

    queryClient.invalidateQueries({
      queryKey: sessionKeys.toc(undefined, sessionId),
    });
  }, [value, isPending, sessionId, selectedModel, selectedAgent, sendMessage]);

  const [isAborting, setIsAborting] = useState(false);

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

  const inputDisabled =
    isDisabled || !sessionId || !selectedModel?.providerId || !selectedModel.id;

  return (
    <PromptInput
      className='w-full max-w-[780px]'
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
