import React, { useCallback, useMemo, useRef } from 'react';
import { type VirtualizerHandle } from 'virtua';

import type { AeroConversationTurn } from '@/server/services/harness/types';

export function useTocScrollTracker(
  groups: AeroConversationTurn[],
  groupFlatIndex: Record<number, number>,
  virtualizerRef: React.RefObject<VirtualizerHandle | null>,
  onActiveGroupIndexChange: (index: number) => void,
) {
  const scrollRafRef = useRef<number | null>(null);
  const isProgrammaticScrollRef = useRef(false);
  const lastActiveIndexRef = useRef<number>(-1);

  const userTocAnchors = useMemo(() => {
    const anchors: { groupIndex: number; flatIndex: number }[] = [];

    for (let i = 0; i < groups.length; i++) {
      const flatIndex = groupFlatIndex[i];

      if (groups[i].role === 'user' && flatIndex !== undefined) {
        anchors.push({
          groupIndex: i,
          flatIndex,
        });
      }
    }

    return anchors;
  }, [groups, groupFlatIndex]);

  const resolveActiveIndex = useCallback(
    (flatIndex: number) => {
      if (userTocAnchors.length === 0) {
        return 0;
      }

      let lo = 0;
      let hi = userTocAnchors.length - 1;
      let result = userTocAnchors[0].groupIndex;

      while (lo <= hi) {
        const mid = (lo + hi) >> 1;
        const anchor = userTocAnchors[mid];

        if (anchor.flatIndex <= flatIndex) {
          result = anchor.groupIndex;
          lo = mid + 1;
        } else {
          hi = mid - 1;
        }
      }

      return result;
    },
    [userTocAnchors],
  );

  const handleScroll = useCallback(
    (offset: number) => {
      if (isProgrammaticScrollRef.current) {
        return;
      }

      if (scrollRafRef.current !== null) {
        return;
      }

      scrollRafRef.current = requestAnimationFrame(() => {
        scrollRafRef.current = null;

        const handle = virtualizerRef.current;
        if (!handle) {
          return;
        }

        const startIndex = handle.findItemIndex(offset + 60);

        if (startIndex == null || startIndex < 0) {
          return;
        }

        const nextActiveIndex = resolveActiveIndex(startIndex);

        if (nextActiveIndex === lastActiveIndexRef.current) {
          return;
        }

        lastActiveIndexRef.current = nextActiveIndex;
        onActiveGroupIndexChange(nextActiveIndex);
      });
    },
    [onActiveGroupIndexChange, resolveActiveIndex, virtualizerRef],
  );

  const beginProgrammaticScroll = useCallback(() => {
    isProgrammaticScrollRef.current = true;
  }, []);

  const endProgrammaticScroll = useCallback(() => {
    isProgrammaticScrollRef.current = false;
  }, []);

  return {
    handleScroll,
    isProgrammaticScrollRef,
    beginProgrammaticScroll,
    endProgrammaticScroll,
  };
}
