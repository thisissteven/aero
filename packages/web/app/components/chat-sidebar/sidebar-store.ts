import { create, StateCreator } from 'zustand';

type SidebarStore = {
  isEditMode: boolean;
  selectedSessionIds: string[];
  lastSelectedId: string | null;
  toggleisEditMode: () => void;
  batchAddSelectionSessions: (sessionIds: string[]) => void;
  batchRemoveSelectionSessions: (sessionIds: string[]) => void;
  toggleRangeSessions: (sessionIds: string[], select: boolean) => void;
  toggleSessionSelection: (
    sessionId: string,
    isShiftPressed: boolean,
    orderedIds: string[],
  ) => void;
  clearSelectedSessionIds: () => void;
};

const sidebarStoreSlice: StateCreator<SidebarStore> = (set) => ({
  isEditMode: false,
  selectedSessionIds: [],
  lastSelectedId: null,

  toggleisEditMode: () =>
    set(({ isEditMode, selectedSessionIds }) => ({
      isEditMode: !isEditMode,
      selectedSessionIds: !isEditMode ? [] : selectedSessionIds,
      lastSelectedId: null,
    })),

  batchAddSelectionSessions: (sessionIds) =>
    set(({ selectedSessionIds }) => ({
      selectedSessionIds: Array.from(
        new Set([...selectedSessionIds, ...sessionIds]),
      ),
    })),

  batchRemoveSelectionSessions: (sessionIds) =>
    set(({ selectedSessionIds }) => ({
      selectedSessionIds: selectedSessionIds.filter(
        (id) => !sessionIds.includes(id),
      ),
    })),

  toggleRangeSessions: (sessionIds, select) =>
    set(({ selectedSessionIds }) => {
      if (select) {
        return {
          selectedSessionIds: Array.from(
            new Set([...selectedSessionIds, ...sessionIds]),
          ),
        };
      }
      return {
        selectedSessionIds: selectedSessionIds.filter(
          (id) => !sessionIds.includes(id),
        ),
      };
    }),

  clearSelectedSessionIds: () =>
    set(() => ({
      selectedSessionIds: [],
      lastSelectedId: null,
    })),

  toggleSessionSelection: (sessionId, isShiftPressed, orderedIds) =>
    set((state) => {
      const { selectedSessionIds, lastSelectedId } = state;
      const isCurrentlySelected = selectedSessionIds.includes(sessionId);

      // 1. SHIFT + CLICK RANGE SELECTION
      if (
        isShiftPressed &&
        lastSelectedId &&
        orderedIds.length > 0 &&
        orderedIds.includes(lastSelectedId) &&
        orderedIds.includes(sessionId)
      ) {
        const lastIndex = orderedIds.indexOf(lastSelectedId);
        const currentIndex = orderedIds.indexOf(sessionId);

        const start = Math.min(lastIndex, currentIndex);
        const end = Math.max(lastIndex, currentIndex);

        const rangeIds = orderedIds.slice(start, end + 1);
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
