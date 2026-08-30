import { cn, Sidebar } from '@aero/ui';

// import { useSessionTitleMarquee } from '@/app/hooks/useMarquee';

export function SessionItemMarquee({
  title,
  isCurrent,
  isWorktreeItem,
}: {
  title: string;
  isCurrent?: boolean;
  isWorktreeItem?: boolean;
}) {
  // const marquee = useSessionTitleMarquee();

  return (
    <Sidebar.MenuItemContent>
      <Sidebar.MenuLabel
        // ref={marquee.labelRef}
        // onMouseEnter={marquee.handleMouseEnter}
        // onMouseLeave={marquee.handleMouseLeave}
        className={cn(
          'pointer-events-auto min-w-0 overflow-hidden',
          isWorktreeItem && 'text-foreground/50',
          isCurrent && 'text-foreground',
        )}
      >
        {title}
      </Sidebar.MenuLabel>
    </Sidebar.MenuItemContent>
  );
}
