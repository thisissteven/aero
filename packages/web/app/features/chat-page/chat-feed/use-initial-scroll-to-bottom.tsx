// use-initial-scroll-to-bottom.ts

import React, { useLayoutEffect, useRef, useState } from 'react';
import { type VirtualizerHandle } from 'virtua';

export function useInitialScrollToBottom(
  virtualizerRef: React.RefObject<VirtualizerHandle | null>,
  totalItems: number,
) {
  const [isReady, setIsReady] = useState(false);

  const didInitialScrollRef = useRef(false);

  const raf1Ref = useRef<number | null>(null);
  const raf2Ref = useRef<number | null>(null);
  const raf3Ref = useRef<number | null>(null);

  useLayoutEffect(() => {
    if (totalItems <= 0 || didInitialScrollRef.current) {
      return;
    }

    const scrollToBottom = () => {
      const virtualizer = virtualizerRef.current;

      if (!virtualizer) {
        raf1Ref.current = requestAnimationFrame(scrollToBottom);
        return;
      }

      virtualizer.scrollToIndex(totalItems - 1, {
        align: 'end',
        offset: 48,
        smooth: false,
      });

      raf2Ref.current = requestAnimationFrame(() => {
        virtualizer.scrollToIndex(totalItems - 1, {
          align: 'end',
          offset: 48,
          smooth: false,
        });

        raf3Ref.current = requestAnimationFrame(() => {
          virtualizer.scrollToIndex(totalItems - 1, {
            align: 'end',
            offset: 48,
            smooth: false,
          });

          didInitialScrollRef.current = true;
          setIsReady(true);
        });
      });
    };

    raf1Ref.current = requestAnimationFrame(scrollToBottom);

    return () => {
      if (raf1Ref.current !== null) {
        cancelAnimationFrame(raf1Ref.current);
        raf1Ref.current = null;
      }

      if (raf2Ref.current !== null) {
        cancelAnimationFrame(raf2Ref.current);
        raf2Ref.current = null;
      }

      if (raf3Ref.current !== null) {
        cancelAnimationFrame(raf3Ref.current);
        raf3Ref.current = null;
      }
    };
  }, [totalItems, virtualizerRef]);

  return isReady;
}
