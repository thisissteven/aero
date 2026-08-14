// server/adapters/opencode/mappers.ts
//
// All opencode-specific shape knowledge lives here and nowhere else in the
// adapter. If opencode's types change, this file is the only thing that
// should need edits.
//
// NOTE: field names below (s.time.created, p.state.status, p.tool, etc.)
// are based on the documented SDK method signatures but the exact Session /
// Message / Part shapes come from the generated types.gen.ts file (see the
// SDK docs' typesUrl). Check that file against your installed
// @opencode-ai/sdk version and adjust field access here if anything drifted.

import type { Message, Part } from '@opencode-ai/sdk/v2';

import { normalizePath } from '@/server/shared';
import type {
  ExtendedGlobalSession,
  ExtendedSessionV1,
  ExtendedSessionV2,
  ExtendedSessionV2Info,
} from '@/server/types/opencode-sdk';

import type {
  AeroMessage,
  AeroPart,
  AeroSessionSummary,
} from '../../services/harness/types';

export function toAeroSession(s: ExtendedSessionV1): AeroSessionSummary {
  return {
    id: s.id,
    title: s.title || 'Untitled session',
    harnessId: 'opencode',
    parentId: s.parentID,
    createdAt: s.time?.created ?? Date.now(),
    updatedAt: s.time?.updated ?? Date.now(),
    workspace: normalizePath(s.directory),
    sharedUrl: s.metadata?.sharedUrl,
  };
}

export function toAeroSessionExperimental(
  s: ExtendedGlobalSession,
): AeroSessionSummary {
  return {
    id: s.id,
    title: s.title || 'Untitled session',
    harnessId: 'opencode',
    parentId: s.parentID,
    createdAt: s.time?.created ?? Date.now(),
    updatedAt: s.time?.updated ?? Date.now(),
    workspace: normalizePath(s.directory),
    sharedUrl: s.metadata?.sharedUrl,
  };
}

export function toAeroSessionV2(s: ExtendedSessionV2): AeroSessionSummary {
  return {
    id: s.id,
    title: s.title || 'Untitled session',
    harnessId: 'opencode',
    parentId: s.parentID,
    createdAt: s.time?.created ?? Date.now(),
    updatedAt: s.time?.updated ?? Date.now(),
    workspace: normalizePath(s.directory),
    sharedUrl: s.metadata?.sharedUrl,
  };
}

export function toAeroSessionV2Info(
  s: ExtendedSessionV2Info,
): AeroSessionSummary {
  return {
    id: s.id,
    title: s.title || 'Untitled session',
    harnessId: 'opencode',
    parentId: s.parentID,
    createdAt: s.time?.created ?? Date.now(),
    updatedAt: s.time?.updated ?? Date.now(),
    workspace: normalizePath(s.location.directory),
    sharedUrl: s.metadata?.sharedUrl,
  };
}

export function toAeroPart(p: Part): AeroPart {
  switch (p.type) {
    case 'text':
      return { id: p.id, type: 'text', text: p.text ?? '' };

    case 'tool':
      return {
        id: p.id,
        type: 'tool',
        toolName: p.tool,
        status: p.state.status,
        input: p.state.input,
        // output/error only exist on the completed/error branches of the
        // ToolState union — narrow explicitly rather than optional-chaining
        // into fields that aren't there on every variant.
        output: p.state.status === 'completed' ? p.state.output : undefined,
        error: p.state.status === 'error' ? p.state.error : undefined,
        duration:
          p.state.status === 'completed'
            ? Math.max(0.1, (p.state.time.end - p.state.time.start) / 1000)
            : p.state.status === 'error'
              ? Math.max(0.1, (p.state.time.end - p.state.time.start) / 1000)
              : undefined,
      };

    case 'file':
      return {
        id: p.id,
        type: 'file',
        path: p.filename ?? p.url ?? '',
        mimeType: p.mime,
      };

    case 'reasoning':
      return { id: p.id, type: 'reasoning', text: p.text ?? '' };

    default:
      // Unknown/unsupported part type from a newer opencode version —
      // degrade gracefully instead of throwing mid-stream.
      return { id: p.id, type: 'text', text: '' };
  }
}

export function toAeroMessage(entry: {
  info: Message;
  parts: Part[];
}): AeroMessage {
  return {
    id: entry.info.id,
    sessionId: entry.info.sessionID,
    role: entry.info.role,
    parts: (entry.parts ?? []).map(toAeroPart),
    createdAt: entry.info.time?.created ?? Date.now(),
  };
}
