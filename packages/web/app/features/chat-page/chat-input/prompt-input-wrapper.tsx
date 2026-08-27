import { useNavigate, useParams } from '@tanstack/react-router';
import { ReactNode, useState } from 'react';

import { PromptInput, toast } from '@aero/ui';

import { useChatStore } from '@/app/features/chat-page/chat-feed/chat-store';
import { useChatSettingsStore } from '@/app/features/chat-page/chat-input/chat-settings-store';
import {
  useAbortSession,
  useCreateSession,
  useSendMessage,
} from '@/app/hooks/api/sessions';

export function NewSessionPromptInputWrapper({
  children,
}: {
  children: ReactNode;
}) {
  const [value, setValue] = useState('');

  const navigate = useNavigate();

  const { mutateAsync: createSession, isPending: isPendingCreateSession } =
    useCreateSession();
  const { mutateAsync: sendMessage, isPending: isPendingSendMessage } =
    useSendMessage(undefined);

  const selectedModel = useChatSettingsStore((state) => state.selectedModel);
  const selectedAgent = useChatSettingsStore((state) => state.selectedAgent);

  const handleSubmit = async (text: string) => {
    const session = await createSession(
      {},
      {
        onError: () => toast.danger('Failed to create session'),
      },
    );

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
            to: `/plugins/${session.id}`,
          }),
      },
    );
  };

  const isPending = isPendingCreateSession || isPendingSendMessage;

  const isDisabled =
    isPending || !selectedModel?.providerId || !selectedModel?.id;

  return (
    <PromptInput
      className='w-full max-w-[720px]'
      value={value}
      onValueChange={setValue}
      onSubmit={() => handleSubmit(value)}
      isDisabled={isDisabled}
    >
      {children}
    </PromptInput>
  );
}

export function ActiveSessionPromptInputWrapper({
  children,
  isDisabled,
}: {
  children: ReactNode;
  isDisabled: boolean;
}) {
  const [value, setValue] = useState('');

  const { sessionId } = useParams({
    strict: false,
  });

  const selectedModel = useChatSettingsStore((state) => state.selectedModel);

  const selectedAgent = useChatSettingsStore((state) => state.selectedAgent);

  const isStreaming = useChatStore((state) => state.isStreaming);

  const setStatus = useChatStore((state) => state.setStatus);

  const { mutate: sendMessage } = useSendMessage(undefined);

  const { mutate: abortSession } = useAbortSession(undefined);

  const handleSend = () => {
    const text = value.trim();

    if (
      !text ||
      isStreaming ||
      !sessionId ||
      !selectedModel?.providerId ||
      !selectedModel?.id
    ) {
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
  };

  const handleAbort = () => {
    if (!sessionId || !isStreaming) {
      return;
    }

    abortSession(sessionId, {
      onSuccess: () => {
        /**
         * Don't wait for another SSE event to unlock
         * the input. The server accepted the abort.
         *
         * The eventual session.status/session.idle event
         * will keep the store synchronized.
         */
        setStatus({ type: 'idle' });
      },
      onError: () => {
        toast.danger('Failed to stop session');
      },
    });
  };

  const inputDisabled =
    isDisabled || !selectedModel?.providerId || !selectedModel?.id;

  return (
    <PromptInput
      className='w-full max-w-[780px]'
      value={value}
      onValueChange={setValue}
      onSubmit={handleSend}
      onStop={handleAbort}
      isDisabled={inputDisabled}
      isPending={isStreaming}
      allowSubmitWhileRunning={false}
      lockInputOnRun
    >
      {children}
    </PromptInput>
  );
}
