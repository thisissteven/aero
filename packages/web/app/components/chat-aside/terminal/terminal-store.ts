import { create } from 'zustand';

export interface TerminalSession {
  id: string;
  title: string;
  createdAt: number;
  cwd?: string;
}

export type TerminalConnectionStatus =
  'connecting' | 'connected' | 'disconnected';

interface TerminalStoreState {
  sessions: TerminalSession[];
  activeSessionId: string | null;
  statusById: Record<string, TerminalConnectionStatus>;
}

interface TerminalStoreActions {
  addSession: (initialCwd?: string) => string;
  removeSession: (id: string) => void;
  setActiveSession: (id: string) => void;
  renameSession: (id: string, title: string) => void;
  setSessionStatus: (id: string, status: TerminalConnectionStatus) => void;
  initializeInitialSessionCwd: (cwd: string) => void;
}

type TerminalStore = TerminalStoreState & { actions: TerminalStoreActions };

function createSession(index: number, cwd?: string): TerminalSession {
  return {
    id: crypto.randomUUID(),
    title: `Terminal ${index}`,
    createdAt: Date.now(),
    cwd,
  };
}

const initialSession = createSession(1);

export const useTerminalStore = create<TerminalStore>()((set, get) => ({
  sessions: [initialSession],
  activeSessionId: initialSession.id,
  statusById: {},

  actions: {
    addSession: (initialCwd) => {
      const session = createSession(get().sessions.length + 1, initialCwd);
      set((state) => ({
        sessions: [...state.sessions, session],
        activeSessionId: session.id,
      }));
      return session.id;
    },

    removeSession: (id) => {
      set((state) => {
        const sessions = state.sessions.filter((s) => s.id !== id);
        const statusById = { ...state.statusById };
        delete statusById[id];

        let activeSessionId = state.activeSessionId;
        if (activeSessionId === id) {
          const removedIndex = state.sessions.findIndex((s) => s.id === id);
          activeSessionId =
            sessions[Math.max(0, removedIndex - 1)]?.id ??
            sessions[0]?.id ??
            null;
        }

        return { sessions, activeSessionId, statusById };
      });
    },

    setActiveSession: (id) => set({ activeSessionId: id }),

    renameSession: (id, title) => {
      set((state) => ({
        sessions: state.sessions.map((s) =>
          s.id === id ? { ...s, title } : s,
        ),
      }));
    },

    setSessionStatus: (id, status) => {
      set((state) => ({ statusById: { ...state.statusById, [id]: status } }));
    },

    // Sets cwd on the initial tab if it was created before workspace was available
    initializeInitialSessionCwd: (cwd) => {
      set((state) => {
        const [first, ...rest] = state.sessions;
        if (first && !first.cwd) {
          return { sessions: [{ ...first, cwd }, ...rest] };
        }
        return state;
      });
    },
  },
}));

export const useTerminalSessions = () =>
  useTerminalStore((state) => state.sessions);
export const useActiveSessionId = () =>
  useTerminalStore((state) => state.activeSessionId);
export const useTerminalActions = () =>
  useTerminalStore((state) => state.actions);
export const useSessionStatus = (id: string) =>
  useTerminalStore((state) => state.statusById[id] ?? 'connecting');
