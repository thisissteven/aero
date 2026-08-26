import { useNavigate, useParams } from '@tanstack/react-router';
import { ReactNode, useState } from 'react';

import { PromptInput, toast } from '@aero/ui';

import { useChatSettingsStore } from '@/app/features/chat-page/chat-input/chat-settings-store';
import { useCreateSession, useSendMessage } from '@/app/hooks/api/sessions';

export function NewSessionPromptInputWrapper({
  children,
}: {
  children: ReactNode;
}) {
  const [value, setValue] = useState('');

  const navigate = useNavigate();

  const { mutate: createSession, isPending } = useCreateSession();

  const selectedModel = useChatSettingsStore((state) => state.selectedModel);
  const selectedAgent = useChatSettingsStore((state) => state.selectedAgent);

  const handleSubmit = (text: string) =>
    createSession(
      {
        parts: [
          {
            type: 'text',
            text,
          },
        ],
        model: {
          modelId: selectedModel?.providerId as string,
          providerId: selectedModel?.id as string,
        },
        agent: selectedAgent?.name,
      },
      {
        onSuccess: (session) =>
          navigate({
            to: `/sessions/${session.id}`,
          }),
        onError: () => toast.danger('Failed to create session'),
      },
    );

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
  const { sessionId } = useParams({ strict: false });

  const selectedModel = useChatSettingsStore((state) => state.selectedModel);
  const selectedAgent = useChatSettingsStore((state) => state.selectedAgent);

  const { mutateAsync: sendMessage, isPending } = useSendMessage(
    undefined,
    sessionId,
  );

  const handleSubmit = (text: string) =>
    sendMessage(
      {
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
        onError: () => toast.danger('Failed to send message'),
      },
    );

  const isInputDisabled =
    isDisabled || isPending || !selectedModel?.providerId || !selectedModel?.id;

  return (
    <PromptInput
      className='w-full max-w-[780px]'
      value={value}
      onValueChange={setValue}
      onSubmit={() => handleSubmit(value)}
      isDisabled={isInputDisabled}
    >
      {children}
    </PromptInput>
  );
}
