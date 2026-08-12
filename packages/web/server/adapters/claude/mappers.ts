// server/adapters/claude/mappers.ts

import type Anthropic from '@anthropic-ai/sdk';

import { normalizePath } from '@/server/shared';

import type {
  AeroMessage,
  AeroPart,
  AeroSessionSummary,
} from '../../services/harness/types';

export interface StoredClaudeSession {
  id: string;
  title: string;
  workspace: string;
  createdAt: number;
  updatedAt: number;
}

export function toAeroSession(s: StoredClaudeSession): AeroSessionSummary {
  return {
    id: s.id,
    title: s.title || 'Untitled session',
    harnessId: 'claude',
    createdAt: s.createdAt,
    updatedAt: s.updatedAt,
    workspace: normalizePath(s.workspace),
  };
}

export function toAeroPartFromContentBlock(
  block: Anthropic.ContentBlock,
  index: number,
): AeroPart {
  switch (block.type) {
    case 'text':
      return {
        id: `block-${index}`,
        type: 'text',
        text: block.text,
      };

    case 'tool_use':
      return {
        id: block.id,
        type: 'tool',
        toolName: block.name,
        status: 'completed',
        input: block.input,
      };

    default:
      return {
        id: `block-${index}`,
        type: 'text',
        text: '',
      };
  }
}

/** Converts an Assistant response (Anthropic.Message) to an AeroMessage */
export function toAeroMessageFromAnthropic(
  message: Anthropic.Message,
  sessionId: string,
): AeroMessage {
  const parts: AeroPart[] = message.content.map((block, idx) =>
    toAeroPartFromContentBlock(block, idx),
  );

  return {
    id: message.id,
    sessionId,
    role: 'assistant',
    parts,
    createdAt: Date.now(),
  };
}

/** Converts a User or System MessageParam (Anthropic.MessageParam) to an AeroMessage */
export function toAeroMessageFromParam(
  param: Anthropic.MessageParam,
  sessionId: string,
  messageId: string = `msg-${Date.now()}`,
): AeroMessage {
  let parts: AeroPart[] = [];

  if (typeof param.content === 'string') {
    parts = [{ id: `part-0`, type: 'text', text: param.content }];
  } else if (Array.isArray(param.content)) {
    parts = param.content.map((block, idx) => {
      if (block.type === 'text') {
        return { id: `part-${idx}`, type: 'text', text: block.text };
      }
      return { id: `part-${idx}`, type: 'text', text: '' };
    });
  }

  return {
    id: messageId,
    sessionId,
    role: param.role, // 'user' | 'assistant'
    parts,
    createdAt: Date.now(),
  };
}
