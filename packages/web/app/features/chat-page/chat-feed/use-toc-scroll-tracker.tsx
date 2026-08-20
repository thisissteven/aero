import React, { useCallback, useMemo, useRef } from 'react';
import { type VirtualizerHandle } from 'virtua';

import { AeroConversationTurn } from '@/server/services/harness/types';

export function useTocScrollTracker(
  groups: AeroConversationTurn[],
  groupFlatIndex: Record<number, number>,
  virtualizerRef: React.RefObject<VirtualizerHandle | null>,
  onActiveGroupIndexChange: (index: number) => void,
) {
  const scrollRafRef = useRef<number | null>(null);

  const userTocAnchors = useMemo(
    () =>
      groups.reduce<{ groupIndex: number; flatIndex: number }[]>(
        (acc, group, index) => {
          if (group.role === 'user') {
            acc.push({ groupIndex: index, flatIndex: groupFlatIndex[index]! });
          }
          return acc;
        },
        [],
      ),
    [groups, groupFlatIndex],
  );

  const resolveActiveIndex = useCallback(
    (flatIndex: number) => {
      if (userTocAnchors.length === 0) return 0;
      let lo = 0;
      let hi = userTocAnchors.length - 1;
      let result = userTocAnchors[0]!.groupIndex;

      while (lo <= hi) {
        const mid = (lo + hi) >> 1;
        const anchor = userTocAnchors[mid]!;
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
      if (scrollRafRef.current !== null) return;

      scrollRafRef.current = requestAnimationFrame(() => {
        scrollRafRef.current = null;
        const handle = virtualizerRef.current;
        if (!handle) return;

        const startIndex = handle.findItemIndex(offset + 60);
        if (startIndex != null && startIndex >= 0) {
          onActiveGroupIndexChange(resolveActiveIndex(startIndex));
        }
      });
    },
    [onActiveGroupIndexChange, resolveActiveIndex, virtualizerRef],
  );

  return handleScroll;
}
