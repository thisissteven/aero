// app/hooks/useElapsedTime.ts
import { useEffect, useState } from 'react';

export function useElapsedTime(startedAt: number | null, active: boolean) {
  const [elapsedMs, setElapsedMs] = useState(0);

  useEffect(() => {
    if (!active || startedAt == null) {
      setElapsedMs(0);
      return;
    }

    setElapsedMs(Date.now() - startedAt);
    const id = setInterval(() => setElapsedMs(Date.now() - startedAt), 1000);
    return () => clearInterval(id);
  }, [startedAt, active]);

  return elapsedMs;
}

export function formatElapsed(ms: number) {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;
}
