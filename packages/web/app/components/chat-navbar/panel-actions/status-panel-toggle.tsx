import { cn, IconButton, Tooltip } from '@aero/ui';
import { DisplayPulse } from '@gravity-ui/icons';
import { useI18n } from '@/app/hooks/i18n';
import { useSessionId } from '@/app/providers/SessionIdProvider';
import { useStatusPanelStore } from '@/app/stores/status-panel-store';

export function StatusPanelToggle() {
  const isOpen = useStatusPanelStore((state) => state.isOpen);
  const toggleIsOpen = useStatusPanelStore((state) => state.toggleIsOpen);

  const sessionId = useSessionId();

  const { t } = useI18n();

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
        {isOpen ? t.chatNavbar.hideWorkStatus : t.chatNavbar.showWorkStatus}
      </Tooltip.Content>
    </Tooltip>
  );
}
