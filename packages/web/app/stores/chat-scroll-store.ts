import { create, StateCreator } from 'zustand';

export interface ChatScrollState {
  scrollToIndexFn: ((index: number) => void) | null;
  scrollToBottomFn: (() => void) | null;
  registerScrollToIndex: (fn: ((index: number) => void) | null) => void;
  registerScrollToBottom: (fn: (() => void) | null) => void;
  scrollToIndex: (index: number) => void;
  scrollToBottom: () => void;
}

export const createChatScrollSlice: StateCreator<
  ChatScrollState,
  [],
  [],
  ChatScrollState
> = (set, get) => ({
  scrollToIndexFn: null,
  scrollToBottomFn: null,
  registerScrollToIndex: (fn) => set({ scrollToIndexFn: fn }),
  registerScrollToBottom: (fn) => set({ scrollToBottomFn: fn }),
  scrollToIndex: (index) => {
    get().scrollToIndexFn?.(index);
  },
  scrollToBottom: () => {
    get().scrollToBottomFn?.();
  },
});

export const useMainChatScrollStore = create<ChatScrollState>()(
  createChatScrollSlice,
);

export const useSideChatScrollStore = create<ChatScrollState>()(
  createChatScrollSlice,
);
