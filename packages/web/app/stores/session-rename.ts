import { create, StateCreator } from 'zustand';

interface SessionRenameStore {
  state: {
    isRenaming: boolean;
    sessionId?: string;
  };

  rename: (sessionId: string) => void;
  cancelRename: () => void;
}

const defaultState = {
  isRenaming: false,
  sessionId: undefined,
} as SessionRenameStore['state'];

export const sessionRenameStoreSlice: StateCreator<SessionRenameStore> = (
  set,
) => ({
  state: defaultState,

  rename: (sessionId) =>
    set({
      state: {
        isRenaming: true,
        sessionId,
      },
    }),

  cancelRename: () =>
    set({
      state: defaultState,
    }),
});

export const createSessionRenameStore = () =>
  create<SessionRenameStore>(sessionRenameStoreSlice);

export const useNavbarSessionRenameStore = createSessionRenameStore();
export const useRecentsSessionRenameStore = createSessionRenameStore();
export const useWorkspacesSessionRenameStore = createSessionRenameStore();
