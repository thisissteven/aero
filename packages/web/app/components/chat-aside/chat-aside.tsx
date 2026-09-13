import { cn, Tooltip, Typography } from '@aero/ui';
import { useSessionChildren } from '@/app/hooks/api/sessions';
import { collapsibleNav, NavItemId } from '@/app/lib/constants';
import { useSessionId } from '@/app/providers/SessionIdProvider';

interface ChatAsideProps {
  activeItem: NavItemId | null;
  onSelect: (id: NavItemId) => void;
}

export function ChatAside({ activeItem, onSelect }: ChatAsideProps) {
  const sessionId = useSessionId();
  const { data: sessionChildren } = useSessionChildren(undefined, sessionId);

  const hasChildren = sessionChildren && sessionChildren.length > 0;

  return (
    <aside className='relative h-full w-12 shrink-0 max-sm:hidden bg-surface/30'>
      <div
        className='border-separator absolute inset-0 top-0 right-0 h-14 border-b'
        aria-hidden
      ></div>
      <div
        className={cn(
          'mt-14 flex h-full flex-col gap-2 pt-4',
          'border-separator border-l',
        )}
      >
        {collapsibleNav.map((item) => {
          const isActive = activeItem === item.id;
          if (item.id === 'side-chat' && !hasChildren) return null;
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
