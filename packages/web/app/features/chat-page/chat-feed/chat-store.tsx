// app/features/chat-page/chat-feed/chat-store.tsx
import { create } from 'zustand';

import {
  buildFlatConversationItems,
  FlatConversationVirtualItem,
} from '@/app/components/message-view/lib';
import {
  AeroConversationTurn,
  AeroPart,
} from '@/server/services/harness/types';

export interface OpenCodeEvent {
  type: string;
  properties: Record<string, unknown>;
}

interface ChatStore {
  flatItems: FlatConversationVirtualItem[];
  groupFlatIndex: number[];
  revertedMessages: { preview: string; messageId: string }[];
  isStreaming: boolean;

  setConversationData: (
    groups: AeroConversationTurn[],
    revertMessageId?: string,
  ) => void;
  handleStreamEvent: (
    event: OpenCodeEvent,
    baseTurns: AeroConversationTurn[],
    revertMessageId?: string,
  ) => void;
}

export const useChatStore = create<ChatStore>((set, get) => ({
  flatItems: [],
  groupFlatIndex: [],
  revertedMessages: [],
  isStreaming: false,

  setConversationData: (groups, revertMessageId) => {
    const { flatItems, groupFlatIndex, revertedMessages } =
      buildFlatConversationItems(groups, get().isStreaming, revertMessageId);

    set({ flatItems, groupFlatIndex, revertedMessages });
  },

  handleStreamEvent: (event, baseTurns, revertMessageId) => {
    const { type, properties } = event;

    // 1. Single part updated (streaming text delta or tool status change)
    if (type === 'message.part.updated') {
      const part = properties.part as AeroPart;
      if (!part) return;

      set({ isStreaming: true });

      const updatedTurns = baseTurns.map((turn) => {
        if (turn.id !== part.messageID) return turn;

        const partExists = turn.parts.some((p) => p.id === part.id);
        const nextParts = partExists
          ? turn.parts.map((p) => (p.id === part.id ? part : p))
          : [...turn.parts, part];

        return { ...turn, parts: nextParts };
      });

      get().setConversationData(updatedTurns, revertMessageId);
      return;
    }

    // 2. Full message updated
    if (type === 'message.updated') {
      const info = properties.info as AeroConversationTurn;
      if (!info) return;

      const turnExists = baseTurns.some((t) => t.id === info.id);
      const updatedTurns = turnExists
        ? baseTurns.map((t) => (t.id === info.id ? info : t))
        : [...baseTurns, info];

      get().setConversationData(updatedTurns, revertMessageId);
      return;
    }

    // 3. Session status change or idle completed
    if (type === 'session.idle' || type === 'session.status') {
      const status = (properties.status as { type: string })?.type;
      const isBusy = status === 'busy';

      set({ isStreaming: isBusy });
      get().setConversationData(baseTurns, revertMessageId);
    }
  },
}));
