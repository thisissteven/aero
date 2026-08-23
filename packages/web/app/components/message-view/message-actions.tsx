import {
  ArrowUturnCcwLeft,
  Check,
  CodeFork,
  Copy,
  Volume,
} from '@gravity-ui/icons';
import { Icon } from '@gravity-ui/uikit';
import { useNavigate } from '@tanstack/react-router';

import { cn, toast, Tooltip } from '@aero/ui';

import { IconButton } from '@/app/components/ui/icon-button';
import { useForkSession, useRevertSession } from '@/app/hooks/api/sessions';
import { useCopyToClipboard } from '@/app/hooks/useCopyToClipboard';
import { Route } from '@/app/routes/_app/sessions/$sessionId';
import { useSpeechStore } from '@/app/stores/speech';

export function MessageActionsRevert({ messageId }: { messageId: string }) {
  const { sessionId } = Route.useParams();
  const { mutateAsync } = useRevertSession(undefined, sessionId);

  return (
    <Tooltip delay={300}>
      <IconButton
        onPress={async () => {
          toast.promise(() => mutateAsync(messageId), {
            loading: 'Reverting message',
            error: (err) => err.message,
            success: 'Message reverted successfully',
          });
        }}
      >
        <Icon data={ArrowUturnCcwLeft} />
      </IconButton>

      <Tooltip.Content placement='bottom' offset={8}>
        <span>Revert from here</span>
      </Tooltip.Content>
    </Tooltip>
  );
}

export function MessageActionsFork({ messageId }: { messageId: string }) {
  const { sessionId } = Route.useParams();
  const { mutateAsync: forkSession } = useForkSession(undefined, sessionId);

  const navigate = useNavigate();

  return (
    <Tooltip delay={300}>
      <IconButton
        onPress={async () => {
          toast.promise(() => forkSession(messageId), {
            loading: 'Forking session',
            error: (err) => err.message,
            success(session) {
              navigate({ to: `/sessions/${session.id}` });
              return 'Session forked successfully';
            },
          });
        }}
      >
        <Icon data={CodeFork} />
      </IconButton>

      <Tooltip.Content placement='bottom' offset={8}>
        <span>Fork from here</span>
      </Tooltip.Content>
    </Tooltip>
  );
}

export function MessageActionsCopy({ copyText }: { copyText: string }) {
  const { copied, copy } = useCopyToClipboard();

  return (
    <Tooltip delay={300}>
      <IconButton onPress={() => copy(copyText)}>
        <span className='relative flex size-3.5 items-center justify-center'>
          <span
            aria-hidden={!copied}
            className={cn(
              'absolute inset-0 flex items-center justify-center transition-all duration-200',
              copied
                ? 'blur-0 opacity-100'
                : 'pointer-events-none opacity-0 blur-sm',
            )}
          >
            <Icon data={Check} />
          </span>
          <span
            aria-hidden={copied}
            className={cn(
              'absolute inset-0 flex items-center justify-center transition-all duration-200',
              !copied
                ? 'blur-0 opacity-100'
                : 'pointer-events-none opacity-0 blur-sm',
            )}
          >
            <Icon data={Copy} />
          </span>
        </span>
      </IconButton>

      <Tooltip.Content placement='bottom' offset={8}>
        <span>Copy message</span>
      </Tooltip.Content>
    </Tooltip>
  );
}

export function MessageActionsReadAloud({
  id,
  text,
}: {
  id: string;
  text: string;
}) {
  const activeId = useSpeechStore((state) => state.activeId);
  const isSpeaking = useSpeechStore((state) => state.isSpeaking);
  const isSupported = useSpeechStore((state) => state.isSupported);
  const toggle = useSpeechStore((state) => state.toggle);

  const isThisPlaying = activeId === id && isSpeaking;

  if (!isSupported) {
    return null;
  }

  return (
    <Tooltip delay={300}>
      <IconButton onPress={() => toggle(id, text)}>
        <Icon data={Volume} className={cn(isThisPlaying && 'text-accent')} />
      </IconButton>

      <Tooltip.Content placement='bottom' offset={8}>
        <span>{isThisPlaying ? 'Stop reading' : 'Read aloud'}</span>
      </Tooltip.Content>
    </Tooltip>
  );
}
