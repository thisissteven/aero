import { cn } from '@aero/ui';
import { IconRefresh } from '@pierre/icons';
import { useCallback, useState } from 'react';

export function RefreshButton({
  onClick,
  label = 'Reload',
  classNameOverride,
}: {
  onClick: () => void;
  label?: string;
  classNameOverride?: string;
}) {
  const [refreshing, setRefreshing] = useState(false);

  const handleClick = useCallback(() => {
    onClick();
    setRefreshing(true);
  }, [onClick]);

  return (
    <button
      type='button'
      aria-label={label}
      title={label}
      onClick={handleClick}
      className={
        classNameOverride ??
        cn(
          'flex h-7 w-7 relative shrink-0 items-center justify-center rounded-md',
          'text-muted hover:bg-surface-hover hover:text-foreground transition-colors',
        )
      }
    >
      <div
        className={cn(
          'absolute left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2 inline-block grid place-items-center',
          refreshing && 'animate-spin origin-center',
        )}
        style={{
          ...(refreshing
            ? { animationDuration: '0.7s', animationIterationCount: 3 }
            : null),
        }}
        onAnimationEnd={() => setRefreshing(false)}
      >
        <IconRefresh className='size-3' />
      </div>
    </button>
  );
}
