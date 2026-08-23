import { create } from 'zustand';

import {
  buildFlatConversationItems,
  FlatConversationVirtualItem,
} from '@/app/components/message-view/lib';
import { AeroConversationTurn } from '@/server/services/harness/types';

interface ChatStore {
  flatItems: FlatConversationVirtualItem[];
  groupFlatIndex: number[];
  revertedMessages: {
    preview: string;
    messageId: string;
  }[];

  // Actions
  setConversationData: (
    groups: AeroConversationTurn[],
    revertMessageId?: string,
  ) => void;
}

export const useChatStore = create<ChatStore>((set) => ({
  flatItems: [],
  groupFlatIndex: [],
  revertedMessages: [],

  setConversationData: (groups, revertMessageId) => {
    const { flatItems, groupFlatIndex, revertedMessages } =
      buildFlatConversationItems(groups, false, revertMessageId);
    set({ flatItems, groupFlatIndex, revertedMessages });
  },
}));
