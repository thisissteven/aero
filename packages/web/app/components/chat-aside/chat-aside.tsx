import { cn, Tooltip, Typography } from '@aero/ui';
import { collapsibleNav, NavItemId } from '@/app/lib/constants';
import { useSidePanelStore } from '@/app/stores/side-panel-store';

interface ChatAsideProps {
  activeItem: NavItemId | null;
  onSelect: (id: NavItemId) => void;
}

export function ChatAside({ activeItem, onSelect }: ChatAsideProps) {
  const isSidePanelOpen = useSidePanelStore((state) => state.isOpen);
  if (!isSidePanelOpen) return null;

  return (
    <aside className='relative h-full w-12 shrink-0 max-sm:hidden bg-surface/30'>
      <div
        className={cn(
          'flex h-full flex-col gap-2 pt-4',
          'border-separator border-l',
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
                      ? 'text-accent opacity-100'
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
