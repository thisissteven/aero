import { cn, Tooltip, Typography } from '@aero/ui';

import { collapsibleNav, NavItemId } from '@/app/lib/constants';
import { useStatusPanelStore } from '@/app/stores/status-panel-store';

interface ChatAsideProps {
  activeItem: NavItemId | null;
  onSelect: (id: NavItemId) => void;
}

export function ChatAside({ activeItem, onSelect }: ChatAsideProps) {
  const isStatusPanelOpen = useStatusPanelStore((s) => s.isOpen);

  return (
    <aside className='relative h-full w-12 shrink-0 max-sm:hidden'>
      {(!!activeItem || isStatusPanelOpen) && (
        <div
          className='border-separator absolute inset-0 top-0 right-0 h-14 border-b'
          aria-hidden
        ></div>
      )}
      <div
        className={cn(
          'mt-14 flex h-full flex-col gap-2 pt-4',
          (!!activeItem || isStatusPanelOpen) && 'border-separator border-l',
        )}
      >
        {collapsibleNav.map((item) => {
          const isActive = activeItem === item.id;
          return (
            <Tooltip key={item.id}>
              <Tooltip.Trigger aria-label={item.label}>
                <button
                  type='button'
                  onClick={() => onSelect(item.id)}
                  className={`flex w-full items-center justify-center py-1.5 transition ${
                    isActive
                      ? 'text-accent-soft-foreground opacity-100'
                      : 'opacity-50 hover:opacity-80'
                  }`}
                >
                  {item.icon}
                </button>
              </Tooltip.Trigger>

              <Tooltip.Content placement='left'>
                <Typography
                  type='body-sm'
                  className='text-accent-soft-foreground'
                >
                  {item.label}
                </Typography>
                <Typography type='body-xs' className='leading-4'>
                  {item.description}
                </Typography>
              </Tooltip.Content>
            </Tooltip>
          );
        })}
      </div>
    </aside>
  );
}
