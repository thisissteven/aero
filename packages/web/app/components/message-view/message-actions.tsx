import { Check, Copy } from '@gravity-ui/icons';
import { Icon } from '@gravity-ui/uikit';

import { cn, Tooltip } from '@aero/ui';

import { useCopyToClipboard } from '@/app/hooks/useCopyToClipboard';

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

      <Tooltip.Content>
        <span>Copy message</span>
      </Tooltip.Content>
    </Tooltip>
  );
}
