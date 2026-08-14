import { Check, Copy, Volume } from '@gravity-ui/icons';
import { Icon } from '@gravity-ui/uikit';

import { cn, Tooltip } from '@aero/ui';

import { useCopyToClipboard } from '@/app/hooks/useCopyToClipboard';
import { useSpeechStore } from '@/app/stores/speech';

export function MessageActionsCopy({ copyText }: { copyText: string }) {
  const { copied, copy } = useCopyToClipboard();

  return (
    <Tooltip delay={300}>
      <Tooltip.Trigger onClick={() => copy(copyText)}>
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
            <Icon
              data={Check}
              size={16}
              className='opacity-50 transition hover:opacity-80'
            />
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
            <Icon
              data={Copy}
              size={16}
              className='opacity-50 transition hover:opacity-80'
            />
          </span>
        </span>
      </Tooltip.Trigger>

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
      <Tooltip.Trigger
        onClick={() => toggle(id, text)}
        aria-label={isThisPlaying ? 'Stop reading' : 'Read text aloud'}
      >
        <Icon
          data={Volume}
          size={16}
          className={cn(
            'opacity-50 transition hover:opacity-80',
            isThisPlaying && 'text-accent opacity-80',
          )}
        />
      </Tooltip.Trigger>

      <Tooltip.Content placement='bottom' offset={8}>
        <span>{isThisPlaying ? 'Stop reading' : 'Read aloud'}</span>
      </Tooltip.Content>
    </Tooltip>
  );
}
