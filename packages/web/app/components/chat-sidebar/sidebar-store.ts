import { create, StateCreator } from 'zustand';

type SidebarStore = {
  isEditMode: boolean;
  selectedSessionIds: string[];
  /**
   * Session IDs in the exact order they are rendered in the sidebar. Published
   * by the list so shift + click range selection follows the visual order,
   * including the hoisted pinned group.
   */
  orderedSessionIds: string[];
  lastSelectedId: string | null;
  toggleisEditMode: () => void;
  setOrderedSessionIds: (sessionIds: string[]) => void;
  toggleSessionSelection: (
    sessionId: string,
    isShiftPressed: boolean,
    /** Overrides the rendered order; defaults to the list's published order. */
    orderedIds?: string[],
  ) => void;
  clearSelectedSessionIds: () => void;
};

const sidebarStoreSlice: StateCreator<SidebarStore> = (set) => ({
  isEditMode: false,
  selectedSessionIds: [],
  orderedSessionIds: [],
  lastSelectedId: null,

  toggleisEditMode: () =>
    set(({ isEditMode, selectedSessionIds }) => ({
      isEditMode: !isEditMode,
      selectedSessionIds: !isEditMode ? [] : selectedSessionIds,
      lastSelectedId: null,
    })),

  setOrderedSessionIds: (sessionIds) =>
    set(() => ({
      orderedSessionIds: sessionIds,
    })),

  clearSelectedSessionIds: () =>
    set(() => ({
      selectedSessionIds: [],
      lastSelectedId: null,
    })),

  toggleSessionSelection: (sessionId, isShiftPressed, orderedIds) =>
    set((state) => {
      const { selectedSessionIds, orderedSessionIds, lastSelectedId } = state;
      const isCurrentlySelected = selectedSessionIds.includes(sessionId);
      const order = orderedIds ?? orderedSessionIds;

      // 1. SHIFT + CLICK RANGE SELECTION
      if (
        isShiftPressed &&
        lastSelectedId &&
        order.length > 0 &&
        order.includes(lastSelectedId) &&
        order.includes(sessionId)
      ) {
        const lastIndex = order.indexOf(lastSelectedId);
        const currentIndex = order.indexOf(sessionId);

        const start = Math.min(lastIndex, currentIndex);
        const end = Math.max(lastIndex, currentIndex);

        const rangeIds = order.slice(start, end + 1);
        const shouldSelect = !isCurrentlySelected;

        const nextSelected = shouldSelect
          ? Array.from(new Set([...selectedSessionIds, ...rangeIds]))
          : selectedSessionIds.filter((id) => !rangeIds.includes(id));

        return {
          selectedSessionIds: nextSelected,
          lastSelectedId: sessionId,
        };
      }

      // 2. NORMAL SINGLE TOGGLE
      const nextSelected = isCurrentlySelected
        ? selectedSessionIds.filter((id) => id !== sessionId)
        : [...selectedSessionIds, sessionId];

      return {
        selectedSessionIds: nextSelected,
        lastSelectedId: sessionId,
      };
    }),
});

export const createSidebarStore = () => create<SidebarStore>(sidebarStoreSlice);

export const useRecentsSidebarStore = createSidebarStore();
export const useWorkspacesSidebarStore = createSidebarStore();
