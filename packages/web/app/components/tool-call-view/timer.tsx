import { cn } from '@aero/ui';

import React, { memo } from 'react';

import { formatElapsedMs, useElapsedTime } from '@/app/hooks/useElapsedTime';

const startTimeCache = new Map<string, number>();

type TimerProps = {
  id: string;
  duration?: number;
  isStreaming?: boolean;
  className?: string;
  style?: React.CSSProperties;
  decimals?: number;
};

export const Timer = memo(
  ({ id, duration, isStreaming = false, className, style }: TimerProps) => {
    // If a duration in seconds is provided, display it immediately
    if (typeof duration === 'number') {
      if (startTimeCache.has(id)) {
        startTimeCache.delete(id);
      }
      return (
        <span className={cn('tabular-nums', className)} style={style}>
          {formatElapsedMs(duration * 1000)}
        </span>
      );
    }

    // Lazy initialization for start time tracking during active streaming
    let startTime = startTimeCache.get(id);
    if (!startTime && isStreaming) {
      startTime = Date.now();
      startTimeCache.set(id, startTime);
    }

    const elapsedMs = useElapsedTime(startTime ?? null, isStreaming);

    return (
      <span className={cn('tabular-nums', className)} style={style}>
        {formatElapsedMs(elapsedMs)}
      </span>
    );
  },
);

Timer.displayName = 'Timer';
