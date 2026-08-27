import { create } from 'zustand';

import {
  buildFlatConversationItems,
  type FlatConversationVirtualItem,
} from '@/app/components/message-view/lib';
import type {
  AeroConversationTurn,
  AeroEvent,
  AeroPart,
  AeroSessionStatus,
} from '@/server/services/harness/types';

interface PendingDelta {
  field: 'text';
  delta: string;
}

interface ChatStore {
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

  setStatus: (status: AeroSessionStatus) => void;

  setConversationData: (
    turns: AeroConversationTurn[],
    revertMessageId?: string,
  ) => void;

  handleStreamEvent: (event: AeroEvent, revertMessageId?: string) => void;

  reset: () => void;
}

function buildState(
  turns: AeroConversationTurn[],
  isStreaming: boolean,
  revertMessageId?: string,
) {
  const { flatItems, groupFlatIndex, revertedMessages } =
    buildFlatConversationItems(turns, isStreaming, revertMessageId);

  return {
    turns,
    flatItems,
    groupFlatIndex,
    revertedMessages,
    isStreaming,
  };
}

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

function isSameOptimisticUserMessage(
  optimistic: AeroConversationTurn,
  incoming: AeroConversationTurn,
) {
  if (
    optimistic.role !== 'user' ||
    incoming.role !== 'user' ||
    !optimistic.id.startsWith('temp-turn-')
  ) {
    return false;
  }

  const optimisticText = optimistic.parts
    .filter((part) => part.type === 'text')
    .map((part) => part.text)
    .join('');

  const incomingText = incoming.parts
    .filter((part) => part.type === 'text')
    .map((part) => part.text)
    .join('');

  return optimisticText.length > 0 && optimisticText === incomingText;
}

function upsertPart(
  turns: AeroConversationTurn[],
  messageId: string,
  part: AeroPart,
): AeroConversationTurn[] {
  const turnIndex = turns.findIndex((turn) => turn.id === messageId);

  if (turnIndex === -1) {
    return [
      ...turns,
      {
        id: messageId,
        role: 'assistant',
        parts: [part],
        createdAt: Date.now(),
      },
    ];
  }

  const turn = turns[turnIndex];

  const partIndex = turn.parts.findIndex(
    (currentPart) => currentPart.id === part.id,
  );

  const parts =
    partIndex === -1
      ? [...turn.parts, part]
      : turn.parts.map((currentPart, index) =>
          index === partIndex ? part : currentPart,
        );

  return turns.map((currentTurn, index) =>
    index === turnIndex
      ? {
          ...currentTurn,
          parts,
        }
      : currentTurn,
  );
}

export const useChatStore = create<ChatStore>((set) => {
  const pendingDeltas = new Map<string, PendingDelta[]>();

  return {
    turns: [],
    flatItems: [],
    groupFlatIndex: [],
    revertedMessages: [],

    status: { type: 'idle' },
    isStreaming: false,
    streamStartedAt: null,

    setStatus: (status) => {
      set((state) => {
        const isStreaming = status.type !== 'idle';

        return {
          status,
          isStreaming,
          streamStartedAt: getStreamStartTime(
            state.turns,
            status,
            state.streamStartedAt,
          ),
        };
      });
    },

    setConversationData: (turns, revertMessageId) => {
      set((state) => {
        const isStreaming = state.status.type !== 'idle';

        return {
          ...buildState(turns, isStreaming, revertMessageId),
          status: state.status,

          // Important:
          // when restoring a busy session after navigation/refresh,
          // derive the timer from the latest persisted user message.
          streamStartedAt: getStreamStartTime(
            turns,
            state.status,
            state.streamStartedAt,
          ),
        };
      });
    },

    handleStreamEvent: (event, revertMessageId) => {
      set((state) => {
        switch (event.type) {
          case 'session.status': {
            const isStreaming = event.status.type !== 'idle';

            return {
              ...buildState(state.turns, isStreaming, revertMessageId),
              status: event.status,
              streamStartedAt: getStreamStartTime(
                state.turns,
                event.status,
                state.streamStartedAt,
              ),
            };
          }

          case 'message.updated': {
            const incoming = event.message;

            const existingIndex = state.turns.findIndex(
              (turn) => turn.id === incoming.id,
            );

            const nextTurns =
              existingIndex === -1
                ? [
                    ...state.turns,
                    {
                      id: incoming.id,
                      role: incoming.role,
                      parts: incoming.parts,
                      error: incoming.error,
                      createdAt: incoming.createdAt,
                    },
                  ]
                : state.turns.map((turn, index) =>
                    index === existingIndex
                      ? {
                          ...turn,
                          role: incoming.role,
                          createdAt: incoming.createdAt,
                          error: incoming.error,
                          parts:
                            incoming.parts.length > 0
                              ? incoming.parts
                              : turn.parts,
                        }
                      : turn,
                  );

            return {
              ...buildState(nextTurns, state.isStreaming, revertMessageId),
              status: state.status,
              streamStartedAt: state.streamStartedAt,
            };
          }

          case 'message.part.updated': {
            pendingDeltas.delete(event.part.id);

            const nextTurns = upsertPart(
              state.turns,
              event.messageId,
              event.part,
            );

            return {
              ...buildState(nextTurns, state.isStreaming, revertMessageId),
              status: state.status,
              streamStartedAt: state.streamStartedAt,
            };
          }

          case 'message.part.delta': {
            const turn = state.turns.find(
              (currentTurn) => currentTurn.id === event.messageId,
            );

            const part = turn?.parts.find(
              (currentPart) => currentPart.id === event.partId,
            );

            if (!turn || !part) {
              const pending = pendingDeltas.get(event.partId) ?? [];

              pendingDeltas.set(event.partId, [
                ...pending,
                {
                  field: event.field,
                  delta: event.delta,
                },
              ]);

              return state;
            }

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

            const nextTurns = state.turns.map((currentTurn) =>
              currentTurn.id !== event.messageId
                ? currentTurn
                : {
                    ...currentTurn,
                    parts: currentTurn.parts.map((currentPart) =>
                      currentPart.id === event.partId
                        ? updatedPart
                        : currentPart,
                    ),
                  },
            );

            return {
              ...buildState(nextTurns, state.isStreaming, revertMessageId),
              status: state.status,
              streamStartedAt:
                state.streamStartedAt ??
                getStreamStartTime(nextTurns, state.status, null),
            };
          }

          case 'message.part.removed': {
            pendingDeltas.delete(event.partId);

            const nextTurns = state.turns.map((turn) =>
              turn.id !== event.messageId
                ? turn
                : {
                    ...turn,
                    parts: turn.parts.filter(
                      (part) => part.id !== event.partId,
                    ),
                  },
            );

            return {
              ...buildState(nextTurns, state.isStreaming, revertMessageId),
              status: state.status,
              streamStartedAt: state.streamStartedAt,
            };
          }

          case 'message.removed': {
            const nextTurns = state.turns.filter(
              (turn) => turn.id !== event.messageId,
            );

            return {
              ...buildState(nextTurns, state.isStreaming, revertMessageId),
              status: state.status,
              streamStartedAt: state.streamStartedAt,
            };
          }

          case 'session.idle': {
            return {
              ...buildState(state.turns, false, revertMessageId),
              status: { type: 'idle' },
              streamStartedAt: null,
            };
          }

          case 'session.error': {
            const lastAssistant = [...state.turns]
              .reverse()
              .find((turn) => turn.role === 'assistant');

            const nextTurns = lastAssistant
              ? state.turns.map((turn) =>
                  turn.id === lastAssistant.id
                    ? {
                        ...turn,
                        error: {
                          name: 'SessionError',
                          data: {
                            message: event.error,
                          },
                        },
                      }
                    : turn,
                )
              : state.turns;

            return {
              ...buildState(nextTurns, false, revertMessageId),
              status: { type: 'idle' },
              streamStartedAt: null,
            };
          }

          default:
            return state;
        }
      });
    },

    reset: () => {
      pendingDeltas.clear();

      set({
        turns: [],
        flatItems: [],
        groupFlatIndex: [],
        revertedMessages: [],
        status: { type: 'idle' },
        isStreaming: false,
        streamStartedAt: null,
      });
    },
  };
});
