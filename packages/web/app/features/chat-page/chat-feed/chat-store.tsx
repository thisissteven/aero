import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import {
  buildFlatConversationItems,
  type FlatConversationVirtualItem,
  type UsageExceeded,
} from '@/app/components/message-view/lib';
import { useScrollController } from '@/app/components/scroll-to-bottom';
import { sessionKeys } from '@/app/hooks/api/sessions';
import { queryClient } from '@/app/providers';
import { useActiveSessionStore } from '@/app/stores/active-session-id';
import type {
  AeroConversationTurn,
  AeroEvent,
  AeroMessage,
  AeroPart,
  AeroSessionStatus,
} from '@/server/services/harness/types';

interface PendingDelta {
  field: 'text';
  delta: string;
}

interface SessionRuntime {
  turns: AeroConversationTurn[];
  flatItems: FlatConversationVirtualItem[];
  groupFlatIndex: number[];
  revertedMessages: {
    preview: string;
    messageId: string;
  }[];

  status: AeroSessionStatus;
  isStreaming: boolean;
  streamStartedAt: number | null;

  usageExceeded?: UsageExceeded;

  hasLiveStatus: boolean;
  hasHydrated: boolean;

  messageTurnIds: Record<string, string>;
}

interface ChatStore {
  activeSessionId: string | null;

  sessions: Record<string, SessionRuntime>;

  runningSessions: string[];

  awaitingQuestions: string[];

  unreadSessions: Array<{
    sessionId: string;
    status: 'success' | 'error';
  }>;

  turns: AeroConversationTurn[];
  flatItems: FlatConversationVirtualItem[];
  groupFlatIndex: number[];
  revertedMessages: {
    preview: string;
    messageId: string;
  }[];

  status: AeroSessionStatus;
  isStreaming: boolean;
  streamStartedAt: number | null;

  setActiveSession: (sessionId: string, revertMessageId?: string) => void;

  setConversationData: (
    sessionId: string,
    turns: AeroConversationTurn[],
    revertMessageId?: string,
  ) => void;

  setStatus: (
    sessionId: string,
    status: AeroSessionStatus,
    source?: 'query' | 'stream',
  ) => void;

  handleStreamEvent: (
    sessionId: string,
    event: AeroEvent,
    revertMessageId?: string,
  ) => void;

  addRunningSession: (sessionId: string) => void;
  removeRunningSession: (sessionId: string) => void;

  addAwaitingQuestion: (sessionId: string) => void;
  removeAwaitingQuestion: (sessionId: string) => void;

  addUnreadSession: (sessionId: string, status: 'success' | 'error') => void;
  removeUnreadSession: (sessionId: string) => void;

  resetSession: (sessionId: string) => void;
}

const IDLE: AeroSessionStatus = { type: 'idle' };

function getLastUserMessageTime(turns: AeroConversationTurn[]) {
  for (let i = turns.length - 1; i >= 0; i--) {
    if (turns[i].role === 'user') {
      return turns[i].createdAt;
    }
  }

  return null;
}

function getStreamStartTime(
  turns: AeroConversationTurn[],
  status: AeroSessionStatus,
  current: number | null,
) {
  if (status.type === 'idle') {
    return null;
  }

  return current ?? getLastUserMessageTime(turns) ?? Date.now();
}

function buildMessageTurnIds(
  turns: AeroConversationTurn[],
): Record<string, string> {
  const map: Record<string, string> = {};

  for (const turn of turns) {
    map[turn.id] = turn.id;

    for (const part of turn.parts) {
      if (part.messageID) {
        map[part.messageID] = turn.id;
      }
    }
  }

  return map;
}

function buildRuntime(
  turns: AeroConversationTurn[],
  isStreaming: boolean,
  revertMessageId?: string,
  usageExceeded?: UsageExceeded,
): Pick<
  SessionRuntime,
  'turns' | 'flatItems' | 'groupFlatIndex' | 'revertedMessages' | 'isStreaming'
> {
  const { flatItems, groupFlatIndex, revertedMessages } =
    buildFlatConversationItems(
      turns,
      isStreaming,
      revertMessageId,
      usageExceeded,
    );

  return {
    turns,
    flatItems,
    groupFlatIndex,
    revertedMessages,
    isStreaming,
  };
}

function createEmptyRuntime(): SessionRuntime {
  return {
    ...buildRuntime([], false),

    status: IDLE,
    streamStartedAt: null,

    usageExceeded: undefined,

    hasLiveStatus: false,
    hasHydrated: false,

    messageTurnIds: {},
  };
}

function getRuntime(
  sessions: Record<string, SessionRuntime>,
  sessionId: string,
) {
  return sessions[sessionId] ?? createEmptyRuntime();
}

function projectActiveSession(
  sessions: Record<string, SessionRuntime>,
  activeSessionId: string | null,
) {
  if (!activeSessionId) {
    return {
      turns: [],
      flatItems: [],
      groupFlatIndex: [],
      revertedMessages: [],
      status: IDLE,
      isStreaming: false,
      streamStartedAt: null,
    };
  }

  const runtime = getRuntime(sessions, activeSessionId);

  return {
    turns: runtime.turns,
    flatItems: runtime.flatItems,
    groupFlatIndex: runtime.groupFlatIndex,
    revertedMessages: runtime.revertedMessages,
    status: runtime.status,
    isStreaming: runtime.isStreaming,
    streamStartedAt: runtime.streamStartedAt,
  };
}

function findTurnIndexByMessageId(runtime: SessionRuntime, messageId: string) {
  const mappedTurnId = runtime.messageTurnIds[messageId];

  if (mappedTurnId) {
    const mappedIndex = runtime.turns.findIndex(
      (turn) => turn.id === mappedTurnId,
    );

    if (mappedIndex !== -1) {
      return mappedIndex;
    }
  }

  return runtime.turns.findIndex(
    (turn) =>
      turn.id === messageId ||
      turn.parts.some((part) => part.messageID === messageId),
  );
}

function replaceMessageParts(
  turn: AeroConversationTurn,
  messageId: string,
  incomingParts: AeroPart[],
) {
  const incomingIds = new Set(incomingParts.map((part) => part.id));

  const nextParts = turn.parts.filter(
    (part) => part.messageID !== messageId || incomingIds.has(part.id),
  );

  for (const incomingPart of incomingParts) {
    const index = nextParts.findIndex((part) => part.id === incomingPart.id);

    if (index === -1) {
      nextParts.push(incomingPart);
    } else {
      nextParts[index] = incomingPart;
    }
  }

  return nextParts;
}

function updateFlatAssistantPart(
  flatItems: FlatConversationVirtualItem[],
  turnId: string,
  partIndex: number,
  part: AeroPart,
): FlatConversationVirtualItem[] | null {
  const itemIndex = flatItems.findIndex(
    (item) =>
      item.type === 'assistant-part' &&
      item.turnId === turnId &&
      item.partIndex === partIndex,
  );

  if (itemIndex === -1) {
    return null;
  }

  const currentItem = flatItems[itemIndex];

  if (currentItem.type !== 'assistant-part') {
    return null;
  }

  const nextFlatItems = flatItems.slice();

  nextFlatItems[itemIndex] = {
    ...currentItem,
    part,
  };

  return nextFlatItems;
}

function appendIncomingMessage(
  runtime: SessionRuntime,
  incoming: AeroMessage,
): SessionRuntime {
  const existingTurnId = runtime.messageTurnIds[incoming.id];

  /**
   * Existing message -> update that turn.
   *
   * Turn metadata is intentionally NOT touched here.
   */
  if (existingTurnId) {
    const turnIndex = runtime.turns.findIndex(
      (turn) => turn.id === existingTurnId,
    );

    if (turnIndex !== -1) {
      const nextTurns = runtime.turns.map((turn, index) =>
        index !== turnIndex
          ? turn
          : {
              ...turn,

              parts:
                incoming.parts.length > 0
                  ? replaceMessageParts(turn, incoming.id, incoming.parts)
                  : turn.parts,

              createdAt:
                turn.id === incoming.id ? incoming.createdAt : turn.createdAt,

              error: incoming.error ?? turn.error,
            },
      );

      const messageTurnIds = {
        ...runtime.messageTurnIds,
      };

      for (const part of incoming.parts) {
        if (part.messageID) {
          messageTurnIds[part.messageID] = existingTurnId;
        }
      }

      return {
        ...runtime,
        ...buildRuntime(
          nextTurns,
          runtime.isStreaming,
          undefined,
          runtime.usageExceeded,
        ),
        messageTurnIds,
      };
    }
  }

  const previous = runtime.turns.at(-1);

  /**
   * Consecutive messages with the same role are grouped
   * into the existing turn.
   */
  if (previous?.role === incoming.role) {
    const nextTurns = [
      ...runtime.turns.slice(0, -1),
      {
        ...previous,
        parts: [...previous.parts, ...incoming.parts],
        error: incoming.error ?? previous.error,
      },
    ];

    const messageTurnIds = {
      ...runtime.messageTurnIds,
      [incoming.id]: previous.id,
    };

    for (const part of incoming.parts) {
      if (part.messageID) {
        messageTurnIds[part.messageID] = previous.id;
      }
    }

    return {
      ...runtime,
      ...buildRuntime(
        nextTurns,
        runtime.isStreaming,
        undefined,
        runtime.usageExceeded,
      ),
      messageTurnIds,
    };
  }

  const nextTurn: AeroConversationTurn = {
    id: incoming.id,
    role: incoming.role,
    parts: [...incoming.parts],
    createdAt: incoming.createdAt,
    error: incoming.error,

    providerID: incoming.providerID,
    modelID: incoming.modelID,
    agent: incoming.agent,
    mode: incoming.mode,
  };

  const messageTurnIds = {
    ...runtime.messageTurnIds,
    [incoming.id]: incoming.id,
  };

  for (const part of incoming.parts) {
    if (part.messageID) {
      messageTurnIds[part.messageID] = incoming.id;
    }
  }

  return {
    ...runtime,
    ...buildRuntime(
      [...runtime.turns, nextTurn],
      runtime.isStreaming,
      undefined,
      runtime.usageExceeded,
    ),
    messageTurnIds,
  };
}

type PersistedChatState = {
  runningSessions: string[];
  awaitingQuestions: string[];
  unreadSessions: Array<{
    sessionId: string;
    status: 'success' | 'error';
  }>;
};

const PERSIST_DELAY = 250;

const persistedTimers = new Map<string, ReturnType<typeof setTimeout>>();
const persistedValues = new Map<string, string>();

const debouncedStateStorage = {
  getItem(name: string) {
    if (typeof window === 'undefined') {
      return null;
    }

    return window.localStorage.getItem(name);
  },

  setItem(name: string, value: string) {
    if (typeof window === 'undefined') {
      return;
    }

    persistedValues.set(name, value);

    const existingTimer = persistedTimers.get(name);

    if (existingTimer !== undefined) {
      clearTimeout(existingTimer);
    }

    const timer = setTimeout(() => {
      persistedTimers.delete(name);

      const latest = persistedValues.get(name);

      if (latest === undefined) {
        return;
      }

      persistedValues.delete(name);
      window.localStorage.setItem(name, latest);
    }, PERSIST_DELAY);

    persistedTimers.set(name, timer);
  },

  removeItem(name: string) {
    if (typeof window === 'undefined') {
      return;
    }

    const existingTimer = persistedTimers.get(name);

    if (existingTimer !== undefined) {
      clearTimeout(existingTimer);
      persistedTimers.delete(name);
    }

    persistedValues.delete(name);
    window.localStorage.removeItem(name);
  },
};

export const useChatStore = create<ChatStore>()(
  persist(
    (set) => {
      const pendingDeltas = new Map<string, PendingDelta[]>();
      const pendingPartUpdates = new Map<string, AeroPart[]>();

      return {
        activeSessionId: null,

        sessions: {},

        runningSessions: [],
        awaitingQuestions: [],
        unreadSessions: [],

        turns: [],
        flatItems: [],
        groupFlatIndex: [],
        revertedMessages: [],

        status: IDLE,
        isStreaming: false,
        streamStartedAt: null,

        setActiveSession: (sessionId, revertMessageId) => {
          set((state) => {
            const sessions = {
              ...state.sessions,
            };

            const runtime = getRuntime(sessions, sessionId);

            sessions[sessionId] = {
              ...runtime,
              ...buildRuntime(
                runtime.turns,
                runtime.isStreaming,
                revertMessageId,
                runtime.usageExceeded,
              ),
            };

            return {
              activeSessionId: sessionId,
              ...projectActiveSession(sessions, sessionId),
              sessions,
            };
          });
        },

        setConversationData: (sessionId, turns, revertMessageId) => {
          set((state) => {
            const current = getRuntime(state.sessions, sessionId);

            if (current.hasHydrated) {
              return state;
            }

            const isStreaming = current.status.type !== 'idle';

            const runtime: SessionRuntime = {
              ...current,

              ...buildRuntime(
                turns,
                isStreaming,
                revertMessageId,
                current.usageExceeded,
              ),

              status: current.status,
              isStreaming,

              streamStartedAt: getStreamStartTime(
                turns,
                current.status,
                current.streamStartedAt,
              ),

              hasHydrated: true,

              messageTurnIds: buildMessageTurnIds(turns),
            };

            const hasAwaitingQuestion = turns.some((turn) =>
              turn.parts.some(
                (part) =>
                  part.type === 'tool' &&
                  part.toolName === 'question' &&
                  part.status === 'running',
              ),
            );

            const sessions = {
              ...state.sessions,
              [sessionId]: runtime,
            };

            const runningSessions = isStreaming
              ? state.runningSessions.includes(sessionId)
                ? state.runningSessions
                : [...state.runningSessions, sessionId]
              : state.runningSessions.filter((id) => id !== sessionId);

            const awaitingQuestions = hasAwaitingQuestion
              ? state.awaitingQuestions.includes(sessionId)
                ? state.awaitingQuestions
                : [...state.awaitingQuestions, sessionId]
              : state.awaitingQuestions.filter((id) => id !== sessionId);

            return {
              sessions,
              runningSessions,
              awaitingQuestions,
              ...projectActiveSession(sessions, state.activeSessionId),
            };
          });
        },

        setStatus: (sessionId, status, source = 'stream') => {
          set((state) => {
            const current = getRuntime(state.sessions, sessionId);

            if (source === 'query' && current.hasLiveStatus) {
              return state;
            }

            const isStreaming = status.type !== 'idle';

            const usageExceeded =
              status.type === 'idle' ? undefined : current.usageExceeded;

            const runtime: SessionRuntime = {
              ...current,

              status,

              usageExceeded,

              hasLiveStatus: source === 'stream' ? true : current.hasLiveStatus,

              streamStartedAt: getStreamStartTime(
                current.turns,
                status,
                current.streamStartedAt,
              ),

              ...buildRuntime(
                current.turns,
                isStreaming,
                undefined,
                usageExceeded,
              ),

              isStreaming,
            };

            const sessions = {
              ...state.sessions,
              [sessionId]: runtime,
            };

            const runningSessions = isStreaming
              ? state.runningSessions.includes(sessionId)
                ? state.runningSessions
                : [...state.runningSessions, sessionId]
              : state.runningSessions.filter((id) => id !== sessionId);

            const awaitingQuestions =
              status.type === 'idle'
                ? state.awaitingQuestions.filter((id) => id !== sessionId)
                : state.awaitingQuestions;

            return {
              sessions,
              runningSessions,
              awaitingQuestions,
              ...projectActiveSession(sessions, state.activeSessionId),
            };
          });
        },

        addAwaitingQuestion: (sessionId) => {
          set((state) => {
            if (state.awaitingQuestions.includes(sessionId)) {
              return state;
            }

            return {
              awaitingQuestions: [...state.awaitingQuestions, sessionId],
            };
          });
        },

        removeAwaitingQuestion: (sessionId) => {
          set((state) => {
            const awaitingQuestions = state.awaitingQuestions.filter(
              (id) => id !== sessionId,
            );

            if (awaitingQuestions.length === state.awaitingQuestions.length) {
              return state;
            }

            return {
              awaitingQuestions,
            };
          });
        },

        handleStreamEvent: (sessionId, event, revertMessageId) => {
          set((state) => {
            const current = getRuntime(state.sessions, sessionId);

            switch (event.type) {
              case 'session.updated': {
                queryClient.setQueryData(
                  sessionKeys.detail(event.session.harnessId, sessionId),
                  event.session,
                );
                queryClient.invalidateQueries({
                  queryKey: sessionKeys.context(undefined, sessionId),
                });
                return state;
              }

              case 'session.status': {
                const isStreaming = event.status.type !== 'idle';

                const nextUsageExceeded =
                  event.status.type === 'retry' &&
                  event.status.action?.reason === 'free_tier_limit'
                    ? {
                        title: event.status.action.title,
                        message: event.status.action.message,
                        label: event.status.action.label,
                        link: event.status.action.link,
                      }
                    : event.status.type === 'idle'
                      ? undefined
                      : current.usageExceeded;

                const runtime: SessionRuntime = {
                  ...current,

                  status: event.status,

                  usageExceeded: nextUsageExceeded,

                  hasLiveStatus: true,

                  streamStartedAt: getStreamStartTime(
                    current.turns,
                    event.status,
                    current.streamStartedAt,
                  ),

                  ...buildRuntime(
                    current.turns,
                    isStreaming,
                    revertMessageId,
                    nextUsageExceeded,
                  ),

                  isStreaming,
                };

                const sessions = {
                  ...state.sessions,
                  [sessionId]: runtime,
                };

                const runningSessions = isStreaming
                  ? state.runningSessions.includes(sessionId)
                    ? state.runningSessions
                    : [...state.runningSessions, sessionId]
                  : state.runningSessions.filter((id) => id !== sessionId);

                const awaitingQuestions =
                  event.status.type === 'idle'
                    ? state.awaitingQuestions.filter((id) => id !== sessionId)
                    : state.awaitingQuestions;

                return {
                  sessions,
                  runningSessions,
                  awaitingQuestions,
                  ...projectActiveSession(sessions, state.activeSessionId),
                };
              }

              case 'session.error': {
                const error = event.error;

                if (!error) {
                  return state;
                }

                let turnIndex = -1;

                for (let i = current.turns.length - 1; i >= 0; i--) {
                  if (current.turns[i].role === 'assistant') {
                    turnIndex = i;
                    break;
                  }
                }

                if (turnIndex === -1) {
                  return state;
                }

                /**
                 * The original implementation intentionally preserved
                 * an already-populated turn.error here.
                 *
                 * Keep that behavior intact.
                 */
                const nextTurns = current.turns.map((turn, index) =>
                  index === turnIndex
                    ? {
                        ...turn,
                        error: turn.error,
                      }
                    : turn,
                );

                const runtime: SessionRuntime = {
                  ...current,

                  ...buildRuntime(
                    nextTurns,
                    current.isStreaming,
                    revertMessageId,
                    current.usageExceeded,
                  ),
                };

                const sessions = {
                  ...state.sessions,
                  [sessionId]: runtime,
                };

                return {
                  sessions,
                  ...projectActiveSession(sessions, state.activeSessionId),
                };
              }

              case 'message.updated': {
                let runtime = appendIncomingMessage(current, event.message);

                const pendingKey = `${sessionId}:${event.message.id}`;
                const pendingParts = pendingPartUpdates.get(pendingKey);

                if (pendingParts?.length) {
                  pendingPartUpdates.delete(pendingKey);

                  const turnIndex = findTurnIndexByMessageId(
                    runtime,
                    event.message.id,
                  );

                  if (turnIndex !== -1) {
                    const nextTurns = runtime.turns.map((turn, index) => {
                      if (index !== turnIndex) {
                        return turn;
                      }

                      let nextParts = turn.parts;

                      for (const part of pendingParts) {
                        const partIndex = nextParts.findIndex(
                          (currentPart) => currentPart.id === part.id,
                        );

                        if (partIndex === -1) {
                          nextParts = [...nextParts, part];
                        } else {
                          nextParts = nextParts.map((currentPart, index) =>
                            index === partIndex ? part : currentPart,
                          );
                        }
                      }

                      return {
                        ...turn,
                        parts: nextParts,
                      };
                    });

                    runtime = {
                      ...runtime,
                      ...buildRuntime(
                        nextTurns,
                        runtime.isStreaming,
                        revertMessageId,
                        runtime.usageExceeded,
                      ),
                    };
                  }
                }

                const hasAwaitingQuestion = runtime.turns.some((turn) =>
                  turn.parts.some(
                    (part) =>
                      part.type === 'tool' &&
                      part.toolName === 'question' &&
                      part.status === 'running',
                  ),
                );

                const sessions = {
                  ...state.sessions,
                  [sessionId]: runtime,
                };

                const awaitingQuestions = hasAwaitingQuestion
                  ? state.awaitingQuestions.includes(sessionId)
                    ? state.awaitingQuestions
                    : [...state.awaitingQuestions, sessionId]
                  : state.awaitingQuestions.filter((id) => id !== sessionId);

                return {
                  sessions,
                  awaitingQuestions,
                  ...projectActiveSession(sessions, state.activeSessionId),
                };
              }

              case 'message.part.updated': {
                const key = `${sessionId}:${event.part.id}`;

                const pending = pendingDeltas.get(key) ?? [];

                pendingDeltas.delete(key);

                let part = event.part;

                // Retrieve the latest turn directly from state
                const lastTurn = current.turns[current.turns.length - 1];

                // Trigger auto-scroll if the active session is receiving updates for the active/latest message
                if (
                  state.activeSessionId === sessionId &&
                  part.type === 'text' &&
                  (part.messageID === lastTurn?.id ||
                    part.messageID === event.messageId)
                ) {
                  requestAnimationFrame(() => {
                    requestAnimationFrame(() => {
                      useScrollController.getState().scrollToBottom();
                    });
                  });
                }

                if (part.type === 'text' || part.type === 'reasoning') {
                  const textDelta = pending
                    .filter((delta) => delta.field === 'text')
                    .map((delta) => delta.delta)
                    .join('');

                  if (textDelta) {
                    part = {
                      ...part,
                      text: part.text + textDelta,
                    };
                  }
                }

                const turnIndex = findTurnIndexByMessageId(
                  current,
                  event.messageId,
                );

                if (turnIndex === -1) {
                  const pendingMessageKey = `${sessionId}:${event.messageId}`;

                  const pendingMessageParts =
                    pendingPartUpdates.get(pendingMessageKey) ?? [];

                  pendingPartUpdates.set(pendingMessageKey, [
                    ...pendingMessageParts,
                    part,
                  ]);

                  const awaitingQuestions =
                    part.type === 'tool' &&
                    part.toolName === 'question' &&
                    part.status === 'running'
                      ? state.awaitingQuestions.includes(sessionId)
                        ? state.awaitingQuestions
                        : [...state.awaitingQuestions, sessionId]
                      : state.awaitingQuestions;

                  return {
                    ...state,
                    awaitingQuestions,
                  };
                }

                const currentTurn = current.turns[turnIndex];

                const partIndex = currentTurn.parts.findIndex(
                  (currentPart) => currentPart.id === part.id,
                );

                if (partIndex === -1) {
                  const nextTurns = current.turns.map((turn, index) =>
                    index !== turnIndex
                      ? turn
                      : {
                          ...turn,
                          parts: [...turn.parts, part],
                        },
                  );

                  const runtime: SessionRuntime = {
                    ...current,
                    ...buildRuntime(
                      nextTurns,
                      current.isStreaming,
                      revertMessageId,
                      current.usageExceeded,
                    ),
                  };

                  const sessions = {
                    ...state.sessions,
                    [sessionId]: runtime,
                  };

                  return {
                    sessions,
                    ...projectActiveSession(sessions, state.activeSessionId),
                  };
                }

                /**
                 * Part.updated can change rendering structure,
                 * footer content, filtering of empty parts, etc.
                 *
                 * Keep the safe full rebuild here. The high-frequency
                 * path is message.part.delta below.
                 */
                const nextTurns = current.turns.map((turn, index) =>
                  index !== turnIndex
                    ? turn
                    : {
                        ...turn,
                        parts: turn.parts.map((currentPart, index) =>
                          index === partIndex ? part : currentPart,
                        ),
                      },
                );

                const runtime: SessionRuntime = {
                  ...current,

                  ...buildRuntime(
                    nextTurns,
                    current.isStreaming,
                    revertMessageId,
                    current.usageExceeded,
                  ),

                  streamStartedAt:
                    current.streamStartedAt ??
                    getStreamStartTime(nextTurns, current.status, null),
                };

                const sessions = {
                  ...state.sessions,
                  [sessionId]: runtime,
                };

                const hasAwaitingQuestion = runtime.turns.some((turn) =>
                  turn.parts.some(
                    (runtimePart) =>
                      runtimePart.type === 'tool' &&
                      runtimePart.toolName === 'question' &&
                      runtimePart.status === 'running',
                  ),
                );

                const awaitingQuestions = hasAwaitingQuestion
                  ? state.awaitingQuestions.includes(sessionId)
                    ? state.awaitingQuestions
                    : [...state.awaitingQuestions, sessionId]
                  : state.awaitingQuestions.filter((id) => id !== sessionId);

                return {
                  sessions,
                  awaitingQuestions,
                  ...projectActiveSession(sessions, state.activeSessionId),
                };
              }

              case 'message.part.delta': {
                const turnIndex = findTurnIndexByMessageId(
                  current,
                  event.messageId,
                );

                if (turnIndex === -1) {
                  const key = `${sessionId}:${event.partId}`;

                  const pending = pendingDeltas.get(key) ?? [];

                  pendingDeltas.set(key, [
                    ...pending,
                    {
                      field: event.field,
                      delta: event.delta,
                    },
                  ]);

                  return state;
                }

                const turn = current.turns[turnIndex];

                const partIndex = turn.parts.findIndex(
                  (currentPart) => currentPart.id === event.partId,
                );

                if (partIndex === -1) {
                  const key = `${sessionId}:${event.partId}`;

                  const pending = pendingDeltas.get(key) ?? [];

                  pendingDeltas.set(key, [
                    ...pending,
                    {
                      field: event.field,
                      delta: event.delta,
                    },
                  ]);

                  return state;
                }

                const part = turn.parts[partIndex];

                if (
                  event.field !== 'text' ||
                  (part.type !== 'text' && part.type !== 'reasoning')
                ) {
                  return state;
                }

                const updatedPart: AeroPart = {
                  ...part,
                  text: part.text + event.delta,
                };

                /**
                 * Fast path:
                 *
                 * Only use the incremental update when the event is
                 * updating the currently-streaming last part.
                 *
                 * In that situation:
                 * - no item is added
                 * - no item is removed
                 * - no footer exists
                 * - flat indices do not change
                 *
                 * This avoids rebuilding the whole conversation.
                 */
                const isCurrentStreamingPart =
                  current.isStreaming &&
                  turnIndex === current.turns.length - 1 &&
                  partIndex === turn.parts.length - 1;

                if (isCurrentStreamingPart) {
                  const nextFlatItems = updateFlatAssistantPart(
                    current.flatItems,
                    turn.id,
                    partIndex,
                    updatedPart,
                  );

                  if (nextFlatItems) {
                    const nextTurns = current.turns.map((runtimeTurn, index) =>
                      index !== turnIndex
                        ? runtimeTurn
                        : {
                            ...runtimeTurn,
                            parts: runtimeTurn.parts.map(
                              (runtimePart, index) =>
                                index === partIndex ? updatedPart : runtimePart,
                            ),
                          },
                    );

                    const runtime: SessionRuntime = {
                      ...current,

                      turns: nextTurns,
                      flatItems: nextFlatItems,

                      streamStartedAt:
                        current.streamStartedAt ??
                        getStreamStartTime(nextTurns, current.status, null),
                    };

                    const sessions = {
                      ...state.sessions,
                      [sessionId]: runtime,
                    };

                    return {
                      sessions,
                      ...projectActiveSession(sessions, state.activeSessionId),
                    };
                  }
                }

                /**
                 * Safe fallback for unusual out-of-order events or
                 * deltas targeting a non-current part.
                 */
                const nextTurns = current.turns.map((runtimeTurn, index) =>
                  index !== turnIndex
                    ? runtimeTurn
                    : {
                        ...runtimeTurn,
                        parts: runtimeTurn.parts.map((runtimePart, index) =>
                          index === partIndex ? updatedPart : runtimePart,
                        ),
                      },
                );

                const runtime: SessionRuntime = {
                  ...current,

                  ...buildRuntime(
                    nextTurns,
                    current.isStreaming,
                    revertMessageId,
                    current.usageExceeded,
                  ),

                  streamStartedAt:
                    current.streamStartedAt ??
                    getStreamStartTime(nextTurns, current.status, null),
                };

                const sessions = {
                  ...state.sessions,
                  [sessionId]: runtime,
                };

                return {
                  sessions,
                  ...projectActiveSession(sessions, state.activeSessionId),
                };
              }

              case 'message.part.removed': {
                pendingDeltas.delete(`${sessionId}:${event.partId}`);

                const turnIndex = findTurnIndexByMessageId(
                  current,
                  event.messageId,
                );

                if (turnIndex === -1) {
                  return state;
                }

                const nextTurns = current.turns.map((turn, index) =>
                  index !== turnIndex
                    ? turn
                    : {
                        ...turn,
                        parts: turn.parts.filter(
                          (part) => part.id !== event.partId,
                        ),
                      },
                );

                const runtime: SessionRuntime = {
                  ...current,

                  ...buildRuntime(
                    nextTurns,
                    current.isStreaming,
                    revertMessageId,
                    current.usageExceeded,
                  ),
                };

                const sessions = {
                  ...state.sessions,
                  [sessionId]: runtime,
                };

                const hasAwaitingQuestion = runtime.turns.some((turn) =>
                  turn.parts.some(
                    (part) =>
                      part.type === 'tool' &&
                      part.toolName === 'question' &&
                      part.status === 'running',
                  ),
                );

                const awaitingQuestions = hasAwaitingQuestion
                  ? state.awaitingQuestions.includes(sessionId)
                    ? state.awaitingQuestions
                    : [...state.awaitingQuestions, sessionId]
                  : state.awaitingQuestions.filter((id) => id !== sessionId);

                return {
                  sessions,
                  awaitingQuestions,
                  ...projectActiveSession(sessions, state.activeSessionId),
                };
              }

              case 'message.removed': {
                const turnIndex = findTurnIndexByMessageId(
                  current,
                  event.messageId,
                );

                pendingPartUpdates.delete(`${sessionId}:${event.messageId}`);

                if (turnIndex === -1) {
                  return state;
                }

                const turn = current.turns[turnIndex];

                const removedMessagePartIds = new Set(
                  turn.parts
                    .filter((part) => part.messageID === event.messageId)
                    .map((part) => part.id),
                );

                const nextParts = turn.parts.filter(
                  (part) => part.messageID !== event.messageId,
                );

                const nextTurns =
                  nextParts.length > 0
                    ? current.turns.map((currentTurn, index) =>
                        index !== turnIndex
                          ? currentTurn
                          : {
                              ...currentTurn,
                              parts: nextParts,
                            },
                      )
                    : current.turns.filter((_, index) => index !== turnIndex);

                const nextMessageTurnIds = {
                  ...current.messageTurnIds,
                };

                delete nextMessageTurnIds[event.messageId];

                for (const partId of removedMessagePartIds) {
                  delete nextMessageTurnIds[partId];
                }

                const runtime: SessionRuntime = {
                  ...current,

                  ...buildRuntime(
                    nextTurns,
                    current.isStreaming,
                    revertMessageId,
                    current.usageExceeded,
                  ),

                  messageTurnIds: nextMessageTurnIds,
                };

                const sessions = {
                  ...state.sessions,
                  [sessionId]: runtime,
                };

                const hasAwaitingQuestion = runtime.turns.some((turn) =>
                  turn.parts.some(
                    (part) =>
                      part.type === 'tool' &&
                      part.toolName === 'question' &&
                      part.status === 'running',
                  ),
                );

                const awaitingQuestions = hasAwaitingQuestion
                  ? state.awaitingQuestions.includes(sessionId)
                    ? state.awaitingQuestions
                    : [...state.awaitingQuestions, sessionId]
                  : state.awaitingQuestions.filter((id) => id !== sessionId);

                return {
                  sessions,
                  awaitingQuestions,
                  ...projectActiveSession(sessions, state.activeSessionId),
                };
              }

              case 'session.idle': {
                queryClient.invalidateQueries({
                  queryKey: sessionKeys.context(undefined, sessionId),
                });

                const lastTurn = current.turns[current.turns.length - 1];
                const unreadStatus: 'success' | 'error' = lastTurn?.error?.data
                  ?.message
                  ? 'error'
                  : 'success';

                const activeId = useActiveSessionStore.getState().activeId;

                const shouldMarkUnread = activeId !== sessionId;

                const runtime: SessionRuntime = {
                  ...current,

                  status: IDLE,
                  streamStartedAt: null,

                  hasLiveStatus: true,

                  usageExceeded: undefined,

                  ...buildRuntime(
                    current.turns,
                    false,
                    revertMessageId,
                    undefined,
                  ),

                  isStreaming: false,
                };

                const sessions = {
                  ...state.sessions,
                  [sessionId]: runtime,
                };

                const unreadSessions = shouldMarkUnread
                  ? [
                      ...state.unreadSessions.filter(
                        (item) => item.sessionId !== sessionId,
                      ),
                      {
                        sessionId,
                        status: unreadStatus,
                      },
                    ]
                  : state.unreadSessions;

                return {
                  sessions,
                  unreadSessions,

                  awaitingQuestions: state.awaitingQuestions.filter(
                    (id) => id !== sessionId,
                  ),

                  runningSessions: state.runningSessions.filter(
                    (id) => id !== sessionId,
                  ),

                  ...projectActiveSession(sessions, state.activeSessionId),
                };
              }

              default:
                return state;
            }
          });
        },

        resetSession: (sessionId) => {
          pendingDeltas.forEach((_value, key) => {
            if (key.startsWith(`${sessionId}:`)) {
              pendingDeltas.delete(key);
            }
          });

          pendingPartUpdates.forEach((_value, key) => {
            if (key.startsWith(`${sessionId}:`)) {
              pendingPartUpdates.delete(key);
            }
          });

          set((state) => {
            const sessions = {
              ...state.sessions,
              [sessionId]: createEmptyRuntime(),
            };

            return {
              sessions,
              awaitingQuestions: state.awaitingQuestions.filter(
                (id) => id !== sessionId,
              ),
              runningSessions: state.runningSessions.filter(
                (id) => id !== sessionId,
              ),
              ...projectActiveSession(sessions, state.activeSessionId),
            };
          });
        },

        addRunningSession: (sessionId) => {
          set((state) => {
            if (state.runningSessions.includes(sessionId)) {
              return state;
            }

            return {
              runningSessions: [...state.runningSessions, sessionId],
            };
          });
        },

        removeRunningSession: (sessionId) => {
          set((state) => {
            const runningSessions = state.runningSessions.filter(
              (id) => id !== sessionId,
            );

            if (runningSessions.length === state.runningSessions.length) {
              return state;
            }

            return {
              runningSessions,
            };
          });
        },

        addUnreadSession: (sessionId, status) => {
          set((state) => ({
            unreadSessions: [
              ...state.unreadSessions.filter(
                (item) => item.sessionId !== sessionId,
              ),
              {
                sessionId,
                status,
              },
            ],
          }));
        },

        removeUnreadSession: (sessionId) => {
          set((state) => {
            const unreadSessions = state.unreadSessions.filter(
              (item) => item.sessionId !== sessionId,
            );

            if (unreadSessions.length === state.unreadSessions.length) {
              return state;
            }

            return {
              unreadSessions,
            };
          });
        },
      };
    },
    {
      name: 'aero-chat-store',

      storage: createJSONStorage<PersistedChatState>(
        () => debouncedStateStorage,
      ),

      partialize: (state) => ({
        runningSessions: state.runningSessions,
        awaitingQuestions: state.awaitingQuestions,
        unreadSessions: state.unreadSessions,
      }),
    },
  ),
);
