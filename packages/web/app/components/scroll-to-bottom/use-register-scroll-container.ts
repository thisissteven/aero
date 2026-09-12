import { RefObject, useEffect } from 'react';

import { useScrollController } from '@/app/components/scroll-to-bottom/use-scroll-controller';

export function useRegisterScrollContainer(
  scrollRef: RefObject<HTMLDivElement | null> | null,
) {
  useEffect(() => {
    if (scrollRef) {
      useScrollController.getState().setScrollRef(scrollRef);
    }

    return () => {
      useScrollController.setState({ scrollRef: null });
    };
  }, [scrollRef]);
}
