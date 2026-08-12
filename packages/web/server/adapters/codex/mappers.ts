// server/adapters/codex/mappers.ts

import { normalizePath } from '@/server/shared';

import type {
  AeroMessage,
  AeroPart,
  AeroSessionSummary,
} from '../../services/harness/types';

export interface StoredCodexSession {
  id: string;
  title?: string;
  parentId?: string;
  workspace: string;
  createdAt?: number;
  updatedAt?: number;
}

export function toAeroSession(s: StoredCodexSession): AeroSessionSummary {
  return {
    id: s.id,
    title: s.title || 'Untitled session',
    harnessId: 'codex',
    parentId: s.parentId,
    createdAt: s.createdAt ?? Date.now(),
    updatedAt: s.updatedAt ?? Date.now(),
    workspace: normalizePath(s.workspace),
  };
}

export function toAeroPart(p: {
  id: string;
  type: string;
  text?: string;
  toolName?: string;
  status?: 'pending' | 'running' | 'completed' | 'error';
  input?: unknown;
  output?: unknown;
  error?: string;
  path?: string;
  mimeType?: string;
}): AeroPart {
  switch (p.type) {
    case 'text':
      return { id: p.id, type: 'text', text: p.text ?? '' };

    case 'tool':
      return {
        id: p.id,
        type: 'tool',
        toolName: p.toolName ?? 'unknown_tool',
        status: p.status ?? 'completed',
        input: p.input,
        output: p.output,
        error: p.error,
      };

    case 'file':
      return {
        id: p.id,
        type: 'file',
        path: p.path ?? '',
        mimeType: p.mimeType,
      };

    case 'reasoning':
      return { id: p.id, type: 'reasoning', text: p.text ?? '' };

    default:
      return { id: p.id, type: 'text', text: p.text ?? '' };
  }
}

export function toAeroMessage(entry: {
  id: string;
  sessionId: string;
  role: 'user' | 'assistant';
  parts: AeroPart[];
  createdAt?: number;
}): AeroMessage {
  return {
    id: entry.id,
    sessionId: entry.sessionId,
    role: entry.role,
    parts: entry.parts.map(toAeroPart),
    createdAt: entry.createdAt ?? Date.now(),
  };
}
