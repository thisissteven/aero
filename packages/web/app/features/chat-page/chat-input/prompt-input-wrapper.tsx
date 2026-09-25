import { PromptInput, toast } from '@aero/ui';
import { useNavigate } from '@tanstack/react-router';
import { ReactNode, useState } from 'react';

import { useChatStore } from '@/app/features/chat-page/chat-feed/chat-store';
import { usePromptInput } from '@/app/features/chat-page/chat-input/use-prompt-input';
import { useNewSessionStore } from '@/app/features/new-session-page/new-session-store';
import { useGitErrorCode } from '@/app/hooks/api/git';
import { useCreateSession } from '@/app/hooks/api/sessions';
import { useI18n } from '@/app/hooks/i18n';
import { useSessionId } from '@/app/providers/SessionIdProvider';

export function NewSessionPromptInputWrapper({
  children,
}: {
  children: ReactNode;
}) {
  const { t } = useI18n();
  const { text, handleSend } = usePromptInput({ isDisabled: false });
  const [isPending, setIsPending] = useState(false);

  const navigate = useNavigate();

  const { mutateAsync: createSession } = useCreateSession();

  const state = useNewSessionStore((state) => state.state);

  const selectedWorkspace = useNewSessionStore(
    (state) => state.selectedWorkspace?.directory,
  );

  const selectedWorktree = useNewSessionStore(
    (state) => state.selectedWorktree,
  );

  const { data: error } = useGitErrorCode(selectedWorkspace);

  const addRunningSession = useChatStore((state) => state.addRunningSession);

  const handleSubmit = async () => {
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
            toast.danger(t.chatInput.failedToCreateSession);
          },
        },
      );

      await handleSend(session.id, true);

      addRunningSession(session.id);
      navigate({
        to: `/sessions/${session.id}`,
      });
    } catch {
      setIsPending(false);
    }
  };

  const isDisabled =
    error && error?.code === 'DIRECTORY_NOT_FOUND' && state === 'work';

  return (
    <PromptInput
      className='group/prompt-input'
      value={text}
      onSubmit={handleSubmit}
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
    isSteerMode,
  } = usePromptInput({ isDisabled });

  const sessionId = useSessionId();

  return (
    <PromptInput
      className='group/prompt-input w-full max-w-[780px]'
      value={text}
      onSubmit={() => handleSend(sessionId)}
      onStop={handleAbort}
      isDisabled={inputDisabled}
      status={isAborting ? 'submitted' : undefined}
      isPending={isPending}
      allowSubmitWhileRunning={isSteerMode}
    >
      {children}
    </PromptInput>
  );
}
