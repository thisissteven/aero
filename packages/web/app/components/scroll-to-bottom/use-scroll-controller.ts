import { RefObject } from 'react';
import { create, StateCreator } from 'zustand';

export interface ScrollControllerState {
  scrollRef: RefObject<HTMLElement | null> | null;
  setScrollRef: (ref: RefObject<HTMLElement | null>) => void;
  scrollToBottom: () => void;
}

export const createScrollControllerSlice: StateCreator<
  ScrollControllerState,
  [],
  [],
  ScrollControllerState
> = (set, get) => ({
  scrollRef: null,

  setScrollRef: (ref) => {
    set({ scrollRef: ref });
  },

  scrollToBottom: () => {
    const el = get().scrollRef?.current;
    if (!el) return;

    const distance = el.scrollHeight - el.scrollTop - el.clientHeight;

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        el.scrollTo({
          top: el.scrollHeight,
          behavior: distance < 2000 ? 'smooth' : 'auto',
        });
      });
    });
  },
});

export const useMainScrollController = create<ScrollControllerState>()(
  createScrollControllerSlice,
);

export const useSideScrollController = create<ScrollControllerState>()(
  createScrollControllerSlice,
);
