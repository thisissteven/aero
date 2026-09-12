import { RefObject } from 'react';
import { create } from 'zustand';

interface ScrollControllerState {
  scrollRef: RefObject<HTMLElement | null> | null;
  setScrollRef: (ref: RefObject<HTMLElement | null>) => void;
  scrollToBottom: () => void;
}

export const useScrollController = create<ScrollControllerState>(
  (set, get) => ({
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
  }),
);
