import { Shapes3 } from '@gravity-ui/icons';
import { useParams } from '@tanstack/react-router';

import { Tooltip } from '@aero/ui';

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
        className={
          isOpen
            ? 'text-foreground bg-default/60'
            : 'text-muted/60 hover:text-muted/60 active:text-muted'
        }
      >
        <Shapes3 />
      </IconButton>
      <Tooltip.Content>
        {isOpen ? 'Hide work status' : 'Show work status'}
      </Tooltip.Content>
    </Tooltip>
  );
}
