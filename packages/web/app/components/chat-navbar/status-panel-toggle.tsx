import { DisplayPulse } from '@gravity-ui/icons';
import { useParams } from '@tanstack/react-router';

import { cn, Tooltip } from '@aero/ui';

import { IconButton } from '@/app/components/ui/icon-button';
import { useStatusPanelStore } from '@/app/stores/status-panel-store';

export function StatusPanelToggle() {
  const isOpen = useStatusPanelStore((state) => state.isOpen);
  const toggleIsOpen = useStatusPanelStore((state) => state.toggleIsOpen);

  const { sessionId } = useParams({
    strict: false,
  });

  if (!sessionId) {
    return null;
  }

  return (
    <Tooltip>
      <IconButton
        onPress={() => toggleIsOpen()}
        svgSize='xs'
        className={cn(
          isOpen
            ? 'bg-transparent opacity-80'
            : 'text-muted opacity-100 hover:opacity-100',
          'h-7.25 w-7 transition',
        )}
      >
        <DisplayPulse className='size-4' />
      </IconButton>
      <Tooltip.Content offset={4}>
        {isOpen ? 'Hide work status' : 'Show work status'}
      </Tooltip.Content>
    </Tooltip>
  );
}
