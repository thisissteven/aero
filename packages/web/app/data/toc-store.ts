import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';

export type TocStore = {
  activeGroupIndex: number;
  setActiveGroupIndex: (index: number) => void;
};

export const useTocStore = create<TocStore>()(
  subscribeWithSelector((set) => ({
    activeGroupIndex: 0,

    setActiveGroupIndex: (index) =>
      set((state) =>
        state.activeGroupIndex === index ? state : { activeGroupIndex: index },
      ),
  })),
);
