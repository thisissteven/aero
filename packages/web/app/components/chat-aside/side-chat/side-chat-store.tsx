import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface SideChatState {
  sessionId: string;
  setSessionId: (sessionId: string) => void;

  view: 'list' | 'detail';
  setView: (view: 'list' | 'detail') => void;
}

export const useSideChatStore = create<SideChatState>()(
  persist(
    (set) => ({
      sessionId: '',
      view: 'list',

      setView: (view) => set({ view: view }),
      setSessionId: (sessionId) =>
        set({ sessionId: sessionId, view: 'detail' }),
    }),
    {
      name: 'aero-side-chat-state',
    },
  ),
);
