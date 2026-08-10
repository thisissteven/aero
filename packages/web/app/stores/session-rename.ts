import { create } from 'zustand';

export type SessionRenameFromEnum = 'sidebar' | 'navbar';

interface SessionRenameStore {
  state: {
    isRenaming: boolean;
    sessionId?: string;
    from: SessionRenameFromEnum;
  };

  rename: (sessionId: string, from: SessionRenameFromEnum) => void;
  cancelRename: () => void;
}

const defaultState = {
  isRenaming: false,
  sessionId: undefined,
  from: 'sidebar',
} as SessionRenameStore['state'];

export const useSessionRenameStore = create<SessionRenameStore>((set) => ({
  state: defaultState,

  rename: (sessionId, from) =>
    set({
      state: {
        isRenaming: true,
        sessionId,
        from,
      },
    }),

  cancelRename: () =>
    set({
      state: defaultState,
    }),
}));
