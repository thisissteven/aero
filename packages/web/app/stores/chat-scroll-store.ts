import { create, StateCreator } from 'zustand';

export interface ChatScrollState {
  scrollToIndexFn: ((index: number) => void) | null;
  registerScrollToIndex: (fn: ((index: number) => void) | null) => void;
  scrollToIndex: (index: number) => void;
}

export const createChatScrollSlice: StateCreator<
  ChatScrollState,
  [],
  [],
  ChatScrollState
> = (set, get) => ({
  scrollToIndexFn: null,
  registerScrollToIndex: (fn) => set({ scrollToIndexFn: fn }),
  scrollToIndex: (index) => {
    get().scrollToIndexFn?.(index);
  },
});

export const useMainChatScrollStore = create<ChatScrollState>()(
  createChatScrollSlice,
);

export const useSideChatScrollStore = create<ChatScrollState>()(
  createChatScrollSlice,
);
