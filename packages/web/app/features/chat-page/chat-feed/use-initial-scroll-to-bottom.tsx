import React, { useLayoutEffect, useState } from 'react';
import { type VirtualizerHandle } from 'virtua';

export function useInitialScrollToBottom(
  virtualizerRef: React.RefObject<VirtualizerHandle | null>,
  totalItems: number,
) {
  const [isReady, setIsReady] = useState(false);

  useLayoutEffect(() => {
    if (!totalItems) return;

    let raf2: number;
    const raf1 = requestAnimationFrame(() => {
      virtualizerRef.current?.scrollToIndex(totalItems - 1, { align: 'end' });

      raf2 = requestAnimationFrame(() => {
        setIsReady(true);
      });
    });

    return () => {
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
    };
  }, [totalItems, virtualizerRef]);

  return isReady;
}
