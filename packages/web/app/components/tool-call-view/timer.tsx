import { cn } from '@aero/ui';

import React, { memo, useEffect, useRef } from 'react';

import { formatElapsedMs, useElapsedTime } from '@/app/hooks/useElapsedTime';

// --- Start-time tracking ---------------------------------------------------
// Kept outside the component so start times survive unmount/remount of the
// same `id`. All writes happen in effects, never during render.
const startTimeCache = new Map<string, number>();

function getOrCreateStartTime(id: string, isStreaming: boolean): number | null {
  if (!isStreaming) return startTimeCache.get(id) ?? null;
  let t = startTimeCache.get(id);
  if (t === undefined) {
    t = Date.now();
    startTimeCache.set(id, t);
  }
  return t;
}

// --- Component -------------------------------------------------------------
type TimerProps = {
  id: string;
  duration?: number;
  isStreaming?: boolean;
  className?: string;
  style?: React.CSSProperties;
};

export const Timer = memo(
  ({ id, duration, isStreaming = false, className, style }: TimerProps) => {
    const isStatic = typeof duration === 'number';

    // Resolve start time. For a live timer, ensure the cache is populated.
    // For a static duration, drop the cache entry so a later live run starts fresh.
    const startTimeRef = useRef<number | null>(null);
    startTimeRef.current = isStatic
      ? null
      : getOrCreateStartTime(id, isStreaming);

    // Always call the hook (no conditional hooks).
    const elapsedMs = useElapsedTime(
      isStatic ? null : startTimeRef.current,
      isStatic ? false : isStreaming,
    );

    // When a static duration is supplied, clear the cache in an effect.
    useEffect(() => {
      if (isStatic) startTimeCache.delete(id);
    }, [isStatic, id]);

    const valueMs = isStatic ? duration * 1000 : elapsedMs;

    return (
      <span
        className={cn(
          'tabular-nums lining-nums inline-block text-center align-baseline',
          className,
        )}
        style={{ minWidth: '2ch', ...style }}
      >
        {formatElapsedMs(valueMs)}
      </span>
    );
  },
);

Timer.displayName = 'Timer';
