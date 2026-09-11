import { create } from 'zustand';

interface ChatScrollStore {
  scrollToIndexFn: ((index: number) => void) | null;
  registerScrollToIndex: (fn: ((index: number) => void) | null) => void;
  scrollToIndex: (index: number) => void;
}

export const useChatScrollStore = create<ChatScrollStore>((set, get) => ({
  scrollToIndexFn: null,
  registerScrollToIndex: (fn) => set({ scrollToIndexFn: fn }),
  scrollToIndex: (index) => {
    get().scrollToIndexFn?.(index);
  },
}));
