import { Session as SessionV1 } from '@opencode-ai/sdk';
import type {
  GlobalSession as SDKGlobalSession,
  Session as SessionV2,
  SessionV2Info as SDKSessionV2Info,
} from '@opencode-ai/sdk/v2';

export interface SessionMetadata {
  sharedUrl?: string;
  [key: string]: unknown;
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
