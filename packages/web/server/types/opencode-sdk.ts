import { Session as SessionV1 } from '@opencode-ai/sdk';
import type {
  GlobalSession as SDKGlobalSession,
  SessionV2Info as SDKSessionV2Info,
  Session as SessionV2,
} from '@opencode-ai/sdk/v2';
import { ConversationRole } from '@/server/services/harness/types';

export type ContextObligatoryMessage = {
  id: string;
  createdAt: number;
  role: ConversationRole;
};

export interface AeroSessionMetadata {
  selected_model?: string;
  context_obligatory_messages?: ContextObligatoryMessage[];
  context_obligatory_last_compaction_message_id?: string;
}

export interface SessionMetadata {
  sharedUrl?: string;
  aero?: AeroSessionMetadata;
}

export type ExtendedSessionV1 = SessionV1 & {
  metadata?: SessionMetadata;
};

export type ExtendedGlobalSession = SDKGlobalSession & {
  metadata?: SessionMetadata;
};

export type ExtendedSessionV2 = SessionV2 & {
  metadata?: SessionMetadata;
};

export type ExtendedSessionV2Info = SDKSessionV2Info & {
  metadata?: SessionMetadata;
};
