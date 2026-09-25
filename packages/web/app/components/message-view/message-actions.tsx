import { cn, IconButton, Tooltip, toast } from '@aero/ui';
import {
  ArrowUturnCcwLeft,
  Check,
  CodeFork,
  Copy,
  Pin,
  PinFill,
  Volume,
} from '@gravity-ui/icons';
import { Icon } from '@gravity-ui/uikit';
import { useNavigate } from '@tanstack/react-router';
import {
  useForkSession,
  useIsPinned,
  useRevertSession,
  useTogglePinnedMessage,
} from '@/app/hooks/api/sessions';
import { useI18n } from '@/app/hooks/i18n';
import { useCopyToClipboard } from '@/app/hooks/useCopyToClipboard';
import { revertSessionToast } from '@/app/lib/commands/revert-session';
import { useSessionId } from '@/app/providers/SessionIdProvider';
import { useSpeechStore } from '@/app/stores/speech';

export function MessageActionsPin({ messageId }: { messageId: string }) {
  const sessionId = useSessionId();
  const { t } = useI18n();
  const pinned = useIsPinned(sessionId, messageId);
  const { mutate: toggle } = useTogglePinnedMessage();

  return (
    <Tooltip>
      <IconButton
        onPress={() =>
          toggle({
            sessionId,
            messageId,
            pinned: !pinned,
          })
        }
        className={cn(pinned && 'opacity-100 hover:opacity-100')}
      >
        <Icon
          data={pinned ? PinFill : Pin}
          className={cn(pinned && 'text-accent')}
        />
      </IconButton>

      <Tooltip.Content placement='bottom' offset={8}>
        <span>
          {pinned ? t.composer.removeFromContext : t.composer.pinIntoContext}
        </span>
      </Tooltip.Content>
    </Tooltip>
  );
}

export function MessageActionsRevert({ messageId }: { messageId: string }) {
  const sessionId = useSessionId();
  const { t } = useI18n();
  const { mutateAsync } = useRevertSession(undefined, sessionId);

  return (
    <Tooltip>
      <IconButton
        onPress={() => revertSessionToast(() => mutateAsync(messageId), t)}
      >
        <Icon data={ArrowUturnCcwLeft} />
      </IconButton>

      <Tooltip.Content placement='bottom' offset={8}>
        <span>{t.composer.revertFromHere}</span>
      </Tooltip.Content>
    </Tooltip>
  );
}

export function MessageActionsFork({ messageId }: { messageId: string }) {
  const sessionId = useSessionId();
  const { t } = useI18n();
  const { mutateAsync: forkSession } = useForkSession(undefined, sessionId);

  const navigate = useNavigate();

  return (
    <Tooltip>
      <IconButton
        onPress={async () => {
          toast.promise(() => forkSession(messageId), {
            loading: t.composer.forkingSession,
            error: (err) => err.message,
            success(session) {
              navigate({ to: `/sessions/${session.id}` });
              return t.composer.sessionForked;
            },
          });
        }}
      >
        <Icon data={CodeFork} />
      </IconButton>

      <Tooltip.Content placement='bottom' offset={8}>
        <span>{t.composer.forkFromHere}</span>
      </Tooltip.Content>
    </Tooltip>
  );
}

export function MessageActionsCopy({ copyText }: { copyText: string }) {
  const { copied, copy } = useCopyToClipboard();
  const { t } = useI18n();

  return (
    <Tooltip>
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
        <span>{t.composer.copyMessage}</span>
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
  const { t } = useI18n();

  const isThisPlaying = activeId === id && isSpeaking;

  if (!isSupported) {
    return null;
  }

  return (
    <Tooltip>
      <IconButton onPress={() => toggle(id, text)}>
        <Icon data={Volume} className={cn(isThisPlaying && 'text-accent')} />
      </IconButton>

      <Tooltip.Content placement='bottom' offset={8}>
        <span>
          {isThisPlaying ? t.composer.stopReading : t.composer.readAloud}
        </span>
      </Tooltip.Content>
    </Tooltip>
  );
}
