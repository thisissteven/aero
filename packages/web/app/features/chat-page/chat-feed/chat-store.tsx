import { create } from 'zustand';

import {
  buildFlatConversationItems,
  FlatConversationVirtualItem,
} from '@/app/components/message-view/lib';
import {
  AeroConversationTurn,
  AeroEvent,
} from '@/server/services/harness/types';

interface ChatStore {
  turns: AeroConversationTurn[];
  flatItems: FlatConversationVirtualItem[];
  groupFlatIndex: number[];
  revertedMessages: {
    preview: string;
    messageId: string;
  }[];
  isStreaming: boolean;

  setConversationData: (
    groups: AeroConversationTurn[],
    revertMessageId?: string,
  ) => void;

  handleStreamEvent: (event: AeroEvent, revertMessageId?: string) => void;
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

export const useChatStore = create<ChatStore>((set, get) => ({
  turns: [],
  flatItems: [],
  groupFlatIndex: [],
  revertedMessages: [],
  isStreaming: false,

  setConversationData: (groups, revertMessageId) => {
    set(buildState(groups, get().isStreaming, revertMessageId));
  },

  handleStreamEvent: (event, revertMessageId) => {
    const currentTurns = get().turns;

    switch (event.type) {
      case 'session.status': {
        if (event.status.type === 'busy') {
          set(buildState(currentTurns, true, revertMessageId));
          return;
        }

        if (event.status.type === 'idle') {
          set(buildState(currentTurns, false, revertMessageId));
          return;
        }

        // retry still means the model is actively handling the turn
        set(buildState(currentTurns, true, revertMessageId));

        return;
      }

      case 'message.updated': {
        const incoming = event.message;

        const existingIndex = currentTurns.findIndex(
          (turn) => turn.id === incoming.id,
        );

        const nextTurns =
          existingIndex === -1
            ? [
                ...currentTurns,
                {
                  id: incoming.id,
                  role: incoming.role,
                  parts: incoming.parts,
                  error: incoming.error,
                  createdAt: incoming.createdAt,
                },
              ]
            : currentTurns.map((turn, index) =>
                index === existingIndex
                  ? {
                      ...turn,
                      role: incoming.role,
                      createdAt: incoming.createdAt,
                      error: incoming.error,
                      parts:
                        incoming.parts.length > 0 ? incoming.parts : turn.parts,
                    }
                  : turn,
              );

        set(buildState(nextTurns, true, revertMessageId));

        return;
      }

      case 'message.part.updated': {
        const existingTurn = currentTurns.find(
          (turn) => turn.id === event.messageId,
        );

        const nextTurns = existingTurn
          ? currentTurns.map((turn) => {
              if (turn.id !== event.messageId) {
                return turn;
              }

              const partExists = turn.parts.some(
                (part) => part.id === event.part.id,
              );

              return {
                ...turn,
                parts: partExists
                  ? turn.parts.map((part) =>
                      part.id === event.part.id ? event.part : part,
                    )
                  : [...turn.parts, event.part],
              };
            })
          : [
              ...currentTurns,
              {
                id: event.messageId,
                role: 'assistant' as const,
                parts: [event.part],
                createdAt: Date.now(),
              },
            ];

        set(buildState(nextTurns, true, revertMessageId));

        return;
      }

      case 'session.idle': {
        set(buildState(currentTurns, false, revertMessageId));

        return;
      }

      case 'session.error': {
        const lastAssistant = [...currentTurns]
          .reverse()
          .find((turn) => turn.role === 'assistant');

        const nextTurns = lastAssistant
          ? currentTurns.map((turn) =>
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
          : currentTurns;

        set(buildState(nextTurns, false, revertMessageId));

        return;
      }

      default:
        return;
    }
  },
}));
