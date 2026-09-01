import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';

export interface UnreadSession {
  sessionId: string;
  status: 'success' | 'error';
}

interface GlobalChatState {
  runningSessions: string[];
  unreadSessions: UnreadSession[];

  addRunningSession: (sessionId: string) => void;
  removeRunningSession: (sessionId: string) => void;

  addUnreadSession: (sessionId: string, status: 'success' | 'error') => void;
  removeUnreadSession: (sessionId: string) => void;
}

export const useGlobalChatStore = create<GlobalChatState>()(
  immer((set) => ({
    runningSessions: [],
    unreadSessions: [],

    addRunningSession: (sessionId) =>
      set((state) => {
        if (!state.runningSessions.includes(sessionId)) {
          state.runningSessions.push(sessionId);
        }
      }),

    removeRunningSession: (sessionId) =>
      set((state) => {
        state.runningSessions = state.runningSessions.filter(
          (id) => id !== sessionId,
        );
      }),

    addUnreadSession: (sessionId, status) =>
      set((state) => {
        const existing = state.unreadSessions.find(
          (item) => item.sessionId === sessionId,
        );
        if (existing) {
          existing.status = status;
        } else {
          state.unreadSessions.push({ sessionId, status });
        }
      }),

    removeUnreadSession: (sessionId) =>
      set((state) => {
        state.unreadSessions = state.unreadSessions.filter(
          (item) => item.sessionId !== sessionId,
        );
      }),
  })),
);
