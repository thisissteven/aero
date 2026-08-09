import type {
  Session as OriginalSession,
  SessionListData as OriginalSessionListData,
} from '@opencode-ai/sdk';

export type Session = OriginalSession & {
  time: OriginalSession['time'] & {
    archived?: number | null;
  };
};

export type SessionListData = OriginalSessionListData & {
  query?: OriginalSessionListData['query'] & {
    limit?: number;
  };
};
