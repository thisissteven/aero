import { create } from 'zustand';

export interface TerminalSession {
  id: string;
  title: string;
  createdAt: number;
  cwd?: string;
  command?: string;
  commandRunning: boolean;
  commandRequestId: number;
  commandConsumedRequestId: number;
}

export type TerminalConnectionStatus =
  | 'connecting'
  | 'connected'
  | 'disconnected';

interface TerminalStoreState {
  sessions: TerminalSession[];
  activeSessionId: string | null;
  statusById: Record<string, TerminalConnectionStatus>;
}

interface TerminalStoreActions {
  addSession: ({
    title,
    cwd,
    command,
  }: {
    title?: string;
    cwd?: string;
    command?: string;
  }) => string;
  removeSession: (id: string) => void;
  setActiveSession: (id: string) => void;
  renameSession: (id: string, title: string) => void;
  setSessionStatus: (id: string, status: TerminalConnectionStatus) => void;
  setCommandRunning: (id: string, running: boolean) => void;
  requestCommand: (id: string, command: string) => void;
  stopCommand: (id: string) => void;
  initializeInitialSessionCwd: (cwd: string) => void;
  consumeCommandRequest: (id: string, requestId: number) => boolean;
}

type TerminalStore = TerminalStoreState & {
  actions: TerminalStoreActions;
};

function createSession(
  index: number,
  {
    title,
    cwd,
    command,
  }: {
    title?: string;
    cwd?: string;
    command?: string;
  },
): TerminalSession {
  return {
    id: crypto.randomUUID(),
    title: title ?? `Terminal ${index}`,
    createdAt: Date.now(),
    cwd,
    command,
    commandRunning: false,
    commandRequestId: 0,
    commandConsumedRequestId: 0,
  };
}

export const useTerminalStore = create<TerminalStore>()((set, get) => ({
  sessions: [],
  activeSessionId: null,
  statusById: {},

  actions: {
    addSession: ({ title, cwd, command }) => {
      const session = createSession(get().sessions.length + 1, {
        title,
        cwd,
        command,
      });

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

        return {
          sessions,
          activeSessionId,
          statusById,
        };
      });
    },

    setActiveSession: (id) => {
      set({ activeSessionId: id });
    },

    renameSession: (id, title) => {
      set((state) => ({
        sessions: state.sessions.map((session) =>
          session.id === id ? { ...session, title } : session,
        ),
      }));
    },

    setSessionStatus: (id, status) => {
      set((state) => ({
        statusById: {
          ...state.statusById,
          [id]: status,
        },
      }));
    },

    setCommandRunning: (id, running) => {
      set((state) => ({
        sessions: state.sessions.map((session) =>
          session.id === id
            ? {
                ...session,
                commandRunning: running,
              }
            : session,
        ),
      }));
    },

    requestCommand: (id, command) => {
      set((state) => ({
        sessions: state.sessions.map((session) =>
          session.id === id
            ? {
                ...session,
                command,
                commandRunning: false,
                commandRequestId: session.commandRequestId + 1,
              }
            : session,
        ),
      }));
    },

    stopCommand: (id) => {
      set((state) => ({
        sessions: state.sessions.map((session) =>
          session.id === id
            ? {
                ...session,
                commandRunning: false,
                commandConsumedRequestId: session.commandRequestId,
              }
            : session,
        ),
      }));
    },

    consumeCommandRequest: (id, requestId) => {
      let consumed = false;

      set((state) => ({
        sessions: state.sessions.map((session) => {
          if (
            session.id !== id ||
            requestId <= session.commandConsumedRequestId
          ) {
            return session;
          }

          consumed = true;

          return {
            ...session,
            commandConsumedRequestId: requestId,
          };
        }),
      }));

      return consumed;
    },

    initializeInitialSessionCwd: (cwd) => {
      set((state) => {
        const [first, ...rest] = state.sessions;

        if (first && !first.cwd) {
          return {
            sessions: [{ ...first, cwd }, ...rest],
          };
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
