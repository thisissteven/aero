import { cn, IconButton, Tooltip } from '@aero/ui';
import { LayoutSplitSideContentRight, SquareBars } from '@gravity-ui/icons';
import { Icon } from '@gravity-ui/uikit';
import { useSidePanelStore } from '@/app/stores/side-panel-store';
import { useStatusPanelStore } from '@/app/stores/status-panel-store';

export function PanelActions() {
  return <PanelActionsContent />;
}

export function PanelActionsContent() {
  const isOpen = useStatusPanelStore((state) => state.isOpen);
  const toggleIsOpen = useStatusPanelStore((state) => state.toggleIsOpen);

  const isSidePanelOpen = useSidePanelStore((state) => state.isOpen);
  const toggleSidePanelIsOpen = useSidePanelStore(
    (state) => state.openClosePanelWithShortcut,
  );

  return (
    <div className='border-separator bg-surface/60 dark:bg-surface inline-flex items-center rounded-lg border p-0.5'>
      <Tooltip>
        <IconButton
          aria-label={isOpen ? 'Hide work status' : 'Show work status'}
          onPress={toggleIsOpen}
          className={cn(
            'h-6 w-7 [&_svg]:!size-4',
            isOpen
              ? 'text-accent opacity-100 hover:opacity-100 active:opacity-100'
              : 'hover:opacity-50 active:opacity-50',
          )}
        >
          <Icon data={SquareBars} />
        </IconButton>
        <Tooltip.Content offset={6}>
          {isOpen ? 'Hide work status' : 'Show work status'}
        </Tooltip.Content>
      </Tooltip>

      <Tooltip>
        <IconButton
          aria-label='Open side panel'
          onPress={() => toggleSidePanelIsOpen()}
          className={cn(
            'h-6 w-7 [&_svg]:!size-4',
            isSidePanelOpen
              ? 'text-accent opacity-100 hover:opacity-100 active:opacity-100'
              : 'hover:opacity-50 active:opacity-50',
          )}
        >
          <Icon data={LayoutSplitSideContentRight} />
        </IconButton>
        <Tooltip.Content offset={6}>
          {isSidePanelOpen ? 'Hide side panel' : 'Show side panel'}
        </Tooltip.Content>
      </Tooltip>
    </div>
  );
}
