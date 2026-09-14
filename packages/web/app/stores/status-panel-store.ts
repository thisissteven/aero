import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface Position {
  x: number;
  y: number;
}

interface Size {
  width: number;
  height: number;
}

export type StatusItemKey =
  | 'session'
  | 'project'
  // | 'usage'
  | 'subagent'
  | 'task'
  | 'mcp'
  | 'pinnedMessage'
  | 'contextSources';

interface StatusPanelState {
  isOpen: boolean;
  position: Position | null;
  size: Size;
  visibleItems: Record<StatusItemKey, boolean>;

  setIsOpen: (isOpen: boolean) => void;
  toggleIsOpen: () => void;
  setPosition: (
    position: Position | null | ((prev: Position | null) => Position | null),
  ) => void;
  setSize: (size: Size | ((prev: Size) => Size)) => void;
  toggleItemVisibility: (key: StatusItemKey) => void;
  setItemVisibility: (key: StatusItemKey, isVisible: boolean) => void;
}

const DEFAULT_VISIBLE_ITEMS: Record<StatusItemKey, boolean> = {
  session: true,
  project: true,
  // usage: true,
  subagent: true,
  task: true,
  mcp: true,
  pinnedMessage: true,
  contextSources: true,
};

const DEFAULT_SIZE: Size = {
  width: 280,
  height: 400,
};

export const useStatusPanelStore = create<StatusPanelState>()(
  persist(
    (set) => ({
      isOpen: false,
      position: null,
      size: DEFAULT_SIZE,
      visibleItems: DEFAULT_VISIBLE_ITEMS,

      setIsOpen: (isOpen) => set({ isOpen }),
      toggleIsOpen: () => set((state) => ({ isOpen: !state.isOpen })),

      setPosition: (position) =>
        set((state) => ({
          position:
            typeof position === 'function'
              ? position(state.position)
              : position,
        })),

      setSize: (size) =>
        set((state) => ({
          size: typeof size === 'function' ? size(state.size) : size,
        })),

      toggleItemVisibility: (key) =>
        set((state) => ({
          visibleItems: {
            ...state.visibleItems,
            [key]: !state.visibleItems[key],
          },
        })),

      setItemVisibility: (key, isVisible) =>
        set((state) => ({
          visibleItems: {
            ...state.visibleItems,
            [key]: isVisible,
          },
        })),
    }),
    {
      name: 'aero-status-panel',
      partialize: (state) => ({
        isOpen: state.isOpen,
        position: state.position,
        size: state.size,
        visibleItems: state.visibleItems,
      }),
    },
  ),
);
