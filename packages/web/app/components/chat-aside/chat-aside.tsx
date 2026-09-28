import { cn, Tooltip, Typography } from '@aero/ui';
import { useGitStatus } from '@/app/hooks/api/git';
import { useSessionDirectory } from '@/app/hooks/api/sessions';
import { useI18n } from '@/app/hooks/i18n';
import { collapsibleNav, NavItemId } from '@/app/lib/constants';
import { useSidePanelStore } from '@/app/stores/side-panel-store';

interface ChatAsideProps {
  activeItem: NavItemId | null;
  onSelect: (id: NavItemId) => void;
}

export function ChatAside({ activeItem, onSelect }: ChatAsideProps) {
  const isSidePanelOpen = useSidePanelStore((state) => state.isOpen);
  const directory = useSessionDirectory();
  const { data: statusData } = useGitStatus(directory);
  const { t } = useI18n();

  const ahead =
    (statusData as { ahead?: number } | null | undefined)?.ahead ?? 0;

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
              <Tooltip.Trigger aria-label={t.nav[item.labelKey]}>
                <button
                  type='button'
                  onClick={() => onSelect(item.id)}
                  className='relative flex w-full items-center justify-center py-1.5'
                >
                  <span className='relative inline-flex'>
                    <span
                      className={`transition ${
                        isActive
                          ? 'text-accent opacity-100'
                          : 'opacity-50 hover:opacity-80'
                      }`}
                    >
                      {item.icon}
                    </span>
                    {item.id === 'git' && ahead > 0 && (
                      <span className='text-accent absolute -top-2 -right-2 z-10 flex h-3.5 min-w-3.5 items-center justify-center rounded-full px-0.5 text-[10px] leading-none font-semibold'>
                        {ahead > 99 ? '99+' : ahead}
                      </span>
                    )}
                  </span>
                </button>
              </Tooltip.Trigger>

              <Tooltip.Content placement='left'>
                <Typography
                  type='body-sm'
                  className='text-accent-soft-foreground'
                >
                  {t.nav[item.labelKey]}
                </Typography>
                <Typography type='body-xs' className='leading-4'>
                  {t.nav[item.descriptionKey]}
                </Typography>
              </Tooltip.Content>
            </Tooltip>
          );
        })}
      </div>
    </aside>
  );
}
