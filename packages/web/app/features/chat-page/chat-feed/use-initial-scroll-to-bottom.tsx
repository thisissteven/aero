import React, { useLayoutEffect, useRef, useState } from 'react';
import { type VirtualizerHandle } from 'virtua';

export function useInitialScrollToBottom(
  virtualizerRef: React.RefObject<VirtualizerHandle | null>,
  totalItems: number,
) {
  const [isReady, setIsReady] = useState(false);
  const didInitialScrollRef = useRef(false);

  useLayoutEffect(() => {
    if (!totalItems || didInitialScrollRef.current) {
      return;
    }

    let raf1: number;
    let raf2: number;

    const tryInitialize = () => {
      const virtualizer = virtualizerRef.current;

      if (!virtualizer) {
        raf1 = requestAnimationFrame(tryInitialize);
        return;
      }

      didInitialScrollRef.current = true;

      virtualizer.scrollToIndex(totalItems - 1, {
        align: 'end',
        offset: 48,
      });

      raf2 = requestAnimationFrame(() => {
        setIsReady(true);
      });
    };

    raf1 = requestAnimationFrame(tryInitialize);

    return () => {
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
    };
  }, [totalItems, virtualizerRef]);

  return isReady;
}
