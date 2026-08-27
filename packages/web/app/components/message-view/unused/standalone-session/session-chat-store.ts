import { create } from 'zustand';

import type {
  AeroMessage,
  AeroPart,
  AeroSessionStatus,
} from '@/server/services/harness/types';

export interface SessionChatState {
  messages: Record<string, AeroMessage>;
  order: string[];
  status: AeroSessionStatus;
  lastUserMessageAt: number | null;

  hydrate: (messages: AeroMessage[]) => void;
  upsertMessage: (message: AeroMessage) => void;
  upsertPart: (sessionId: string, messageId: string, part: AeroPart) => void;
  applyPartDelta: (
    sessionId: string,
    messageId: string,
    partId: string,
    field: 'text',
    delta: string,
  ) => void;
  removePart: (messageId: string, partId: string) => void;
  removeMessage: (messageId: string) => void;
  setStatus: (status: AeroSessionStatus) => void;
  reset: () => void;
}

const IDLE: AeroSessionStatus = { type: 'idle' };

export function createSessionChatStore() {
  const pendingDeltas = new Map<
    string,
    Array<{
      field: 'text';
      delta: string;
    }>
  >();

  return create<SessionChatState>((set) => ({
    messages: {},
    order: [],
    status: IDLE,
    lastUserMessageAt: null,

    hydrate: (messages) => {
      pendingDeltas.clear();

      const map: Record<string, AeroMessage> = {};
      const order: string[] = [];
      let lastUserAt: number | null = null;

      for (const message of messages) {
        map[message.id] = message;
        order.push(message.id);

        if (message.role === 'user') {
          lastUserAt = message.createdAt;
        }
      }

      set({
        messages: map,
        order,
        lastUserMessageAt: lastUserAt,
      });
    },

    upsertMessage: (message) =>
      set((state) => {
        const existing = state.messages[message.id];

        const merged: AeroMessage = {
          ...existing,
          ...message,
          parts: existing?.parts ?? message.parts,
        };

        return {
          messages: {
            ...state.messages,
            [message.id]: merged,
          },
          order: existing ? state.order : [...state.order, message.id],
          lastUserMessageAt:
            message.role === 'user'
              ? message.createdAt
              : state.lastUserMessageAt,
        };
      }),

    upsertPart: (sessionId, messageId, part) => {
      // A full part snapshot is authoritative.
      // Any deltas buffered before this snapshot are therefore obsolete.
      pendingDeltas.delete(part.id);

      set((state) => {
        const existingMessage = state.messages[messageId];

        const message: AeroMessage = existingMessage ?? {
          id: messageId,
          sessionId,
          role: 'assistant',
          parts: [],
          createdAt: Date.now(),
        };

        const partIndex = message.parts.findIndex(
          (currentPart) => currentPart.id === part.id,
        );

        const parts =
          partIndex === -1
            ? [...message.parts, part]
            : message.parts.map((currentPart, index) =>
                index === partIndex ? part : currentPart,
              );

        return {
          messages: {
            ...state.messages,
            [messageId]: {
              ...message,
              parts,
            },
          },
          order: existingMessage ? state.order : [...state.order, messageId],
        };
      });
    },

    applyPartDelta: (sessionId, messageId, partId, field, delta) =>
      set((state) => {
        const message = state.messages[messageId];

        if (!message) {
          const pending = pendingDeltas.get(partId) ?? [];

          pendingDeltas.set(partId, [...pending, { field, delta }]);

          return state;
        }

        const partIndex = message.parts.findIndex((part) => part.id === partId);

        if (partIndex === -1) {
          const pending = pendingDeltas.get(partId) ?? [];

          pendingDeltas.set(partId, [...pending, { field, delta }]);

          return state;
        }

        const part = message.parts[partIndex];

        if (
          field !== 'text' ||
          (part.type !== 'text' && part.type !== 'reasoning')
        ) {
          return state;
        }

        const updatedPart: AeroPart =
          part.type === 'text'
            ? {
                ...part,
                text: part.text + delta,
              }
            : {
                ...part,
                text: part.text + delta,
              };

        const parts = message.parts.map((currentPart, index) =>
          index === partIndex ? updatedPart : currentPart,
        );

        return {
          messages: {
            ...state.messages,
            [messageId]: {
              ...message,
              parts,
            },
          },
        };
      }),

    removePart: (messageId, partId) =>
      set((state) => {
        pendingDeltas.delete(partId);

        const message = state.messages[messageId];

        if (!message) {
          return state;
        }

        return {
          messages: {
            ...state.messages,
            [messageId]: {
              ...message,
              parts: message.parts.filter((part) => part.id !== partId),
            },
          },
        };
      }),

    removeMessage: (messageId) =>
      set((state) => {
        const message = state.messages[messageId];

        if (message) {
          for (const part of message.parts) {
            pendingDeltas.delete(part.id);
          }
        }

        const messages = { ...state.messages };
        delete messages[messageId];

        return {
          messages,
          order: state.order.filter((id) => id !== messageId),
        };
      }),

    setStatus: (status) => set({ status }),

    reset: () => {
      pendingDeltas.clear();

      set({
        messages: {},
        order: [],
        status: IDLE,
        lastUserMessageAt: null,
      });
    },
  }));
}

export type SessionChatStore = ReturnType<typeof createSessionChatStore>;
