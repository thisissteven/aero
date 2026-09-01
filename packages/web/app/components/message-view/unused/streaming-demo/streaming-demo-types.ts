import type {
  AeroConversationTurn,
  AeroEvent,
  AeroPart,
  AeroSessionStatus,
} from '@/server/services/harness/types';

export type UserFooterStatus = 'optimistic' | 'actual' | 'error';

export type FlatItem =
  | { id: string; type: 'user-spacer' }
  | {
      id: string;
      type: 'user';
      messageId: string;
      turn: AeroConversationTurn;
      forkMessageId: string;
      createdAt?: number;
    }
  | {
      id: string;
      type: 'assistant-part';
      turnId: string;
      partId: string;
      part: AeroPart;
      isPartStreaming: boolean;
      isLastPartInTurn: boolean;
    }
  | {
      id: string;
      type: 'user-footer';
      messageId: string;
      status: UserFooterStatus;
      text?: string;
      createdAt?: number;
    }
  | {
      id: string;
      type: 'assistant-footer';
      turnId: string;
      createdAt?: number;
      textResponse: string;
      nextTurnId: string;
      providerID?: string;
      modelID?: string;
      agent?: string;
      mode?: string;
    }
  | {
      id: string;
      type: 'assistant-error';
      turnId: string;
      errorType: 'usage_exceeded' | 'message_aborted' | 'generic';
      message: string;
    };

export interface RevertedMessage {
  messageId: string;
  preview: string;
}

export interface ChatSessionState {
  sessionId: string;
  isStreaming: boolean;
  streamStartedAt: number | null;
  status: AeroSessionStatus;
  flatItems: FlatItem[];
  groupFlatIndex: number[];
  revertedMessages: RevertedMessage[];
  hasAwaitingQuestion: boolean;

  activeUserMessageId: string | null;
  lastAssistantTurnId: string | null;

  initFromMessages: (
    messages: AeroConversationTurn[],
    revertMessageId?: string,
  ) => void;
  updateRevertedMessages: (revertMessageId: string) => void;
  setStatus: (status: AeroSessionStatus) => void;
  appendOptimisticUserMessage: (text: string) => string;
  removeOptimisticUserMessage: (localMessageId: string) => void;
  handleStreamEvent: (event: AeroEvent, revertMessageId?: string) => void;
  setStreaming: (isStreaming: boolean) => void;
  handleSendError: (errorMsg?: string) => void;
}
