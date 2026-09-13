import { RefObject, useEffect } from 'react';
import { StoreApi, UseBoundStore } from 'zustand';
import { ScrollControllerState } from '@/app/components/scroll-to-bottom/use-scroll-controller';

export function useRegisterScrollContainer(
  scrollRef: RefObject<HTMLDivElement | null> | null,
  useStore: UseBoundStore<StoreApi<ScrollControllerState>>,
) {
  useEffect(() => {
    if (scrollRef) {
      useStore
        .getState()
        .setScrollRef(scrollRef as RefObject<HTMLElement | null>);
    }

    return () => {
      useStore.setState({ scrollRef: null });
    };
  }, [scrollRef, useStore]);
}
