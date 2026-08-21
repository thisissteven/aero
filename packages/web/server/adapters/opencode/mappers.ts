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

import type {
  AssistantMessage,
  Message,
  Part,
  TextPart,
} from '@opencode-ai/sdk/v2';

import { withOpencodeClientV1 } from '@/server/adapters/opencode/client';
import { unwrap } from '@/server/adapters/opencode/unwrap';
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
  AeroSessionContextDetails,
  AeroSessionSummary,
} from '../../services/harness/types';

async function getProviderModelInfo(providerId: string, modelId: string) {
  const { providers } = unwrap(
    await withOpencodeClientV1((client) => client.config.providers()),
  );

  const foundProvider = providers.find((p) => p.id === providerId);
  const foundModel = foundProvider?.models[modelId];

  return {
    model: foundModel?.name ?? 'Unknown',
    provider: foundProvider?.name ?? 'Unknown',
    limit: foundModel?.limit.context ?? 0,
  };
}

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

function isValidEntry(entry: { info: Message; parts: Array<Part> }): boolean {
  if (entry.info.role !== 'assistant') {
    return true;
  }
  const validParts = entry.parts.filter(
    (p) => p.type !== 'step-start' && p.type !== 'step-finish',
  );
  return validParts.length > 0;
}

// Helper to remove adjacent duplicate strings
function deduplicateAdjacent(arr: string[]): string[] {
  return arr.filter((item, index) => index === 0 || item !== arr[index - 1]);
}

export async function toAeroSessionContextDetails(
  rawEntries: Array<{
    info: Message;
    parts: Array<Part>;
  }>,
): Promise<AeroSessionContextDetails> {
  const entries = rawEntries.filter(isValidEntry);

  if (!entries || entries.length === 0) {
    return createEmptySessionDetails();
  }

  // Session aggregates
  let totalCost = 0;
  let userCount = 0;
  let assistantCount = 0;

  // Distribution counters
  let totalUserParts = 0;
  let totalAssistantParts = 0;
  let totalToolParts = 0;
  let totalOtherParts = 0;

  let lastAssistantMsg: AssistantMessage | null = null;

  for (const entry of entries) {
    const { info, parts } = entry;

    if (info.role === 'user') {
      userCount++;
    } else if (info.role === 'assistant') {
      assistantCount++;
      totalCost += info.cost ?? 0;
      lastAssistantMsg = info;
    }

    for (const part of parts) {
      if (part.type === 'step-start' || part.type === 'step-finish') {
        continue;
      }

      if (info.role === 'user') {
        totalUserParts++;
      } else if (part.type === 'reasoning' || part.type === 'text') {
        totalAssistantParts++;
      } else if (part.type === 'tool') {
        totalToolParts++;
      } else {
        totalOtherParts++;
      }
    }
  }

  const grandTotalParts =
    totalUserParts + totalAssistantParts + totalToolParts + totalOtherParts;

  const distribution = {
    userPercentage: grandTotalParts
      ? (totalUserParts / grandTotalParts) * 100
      : 0,
    assistantPercentage: grandTotalParts
      ? (totalAssistantParts / grandTotalParts) * 100
      : 0,
    toolCallPercentage: grandTotalParts
      ? (totalToolParts / grandTotalParts) * 100
      : 0,
    otherPercentage: grandTotalParts
      ? (totalOtherParts / grandTotalParts) * 100
      : 0,
  };

  const lastEntry = entries[entries.length - 1];
  const firstEntry = entries[0];

  const providerId =
    lastEntry.info.role === 'user'
      ? lastEntry.info.model.providerID
      : lastEntry.info.providerID;

  const modelId =
    lastEntry.info.role === 'user'
      ? lastEntry.info.model.modelID
      : lastEntry.info.modelID;

  const { provider, model, limit } = await getProviderModelInfo(
    providerId,
    modelId,
  );

  // Last Assistant Token Metrics
  const tokens = lastAssistantMsg?.tokens;
  const input = tokens?.input ?? 0;
  const output = tokens?.output ?? 0;
  const reasoning = tokens?.reasoning ?? 0;
  const cacheRead = tokens?.cache?.read ?? 0;
  const cacheWrite = tokens?.cache?.write ?? 0;

  const cacheHitDenominator = input + cacheRead;
  const cacheHit =
    cacheHitDenominator > 0 ? (cacheRead / cacheHitDenominator) * 100 : 0;

  const used = tokens?.total ?? input + output;
  const usedPercentage = limit > 0 ? (used / limit) * 100 : 0;

  // Map rawMessages across all valid entries
  const rawMessages = entries.reverse().map((e) => {
    let text = '';
    let inputTokens = 0;
    let outputTokens = 0;

    if (e.info.role === 'user') {
      // Extract actual user message content from text parts
      text = e.parts
        .filter((p): p is TextPart => p.type === 'text')
        .map((p) => p.text)
        .join('\n');
    } else {
      inputTokens = e.info.tokens.input ?? 0;
      outputTokens = e.info.tokens.output ?? 0;

      // Map to part indicator names and deduplicate adjacent duplicates
      const partNames = e.parts
        .filter((p) => p.type !== 'step-start' && p.type !== 'step-finish')
        .map((p) => (p.type === 'tool' ? p.tool : p.type));

      text = deduplicateAdjacent(partNames).join(' + ');
    }

    return {
      role: e.info.role,
      text,
      createdAt: e.info.time.created,
      input: inputTokens,
      output: outputTokens,
      rawContent: JSON.stringify(e, null, 2),
    };
  });

  return {
    provider,
    model,
    createdAt: firstEntry.info.time.created,
    context: {
      used,
      usedPercentage,
      limit,
    },
    messages: entries.length,
    user: userCount,
    assistant: assistantCount,
    cost: totalCost,
    lastAssistantMessage: {
      input,
      output,
      reasoning,
      cacheRead,
      cacheWrite,
      cacheHit,
    },
    distribution,
    rawMessages,
  };
}

function createEmptySessionDetails(): AeroSessionContextDetails {
  return {
    provider: '',
    model: '',
    createdAt: 0,
    context: { used: 0, usedPercentage: 0, limit: 0 },
    messages: 0,
    user: 0,
    assistant: 0,
    cost: 0,
    lastAssistantMessage: {
      input: 0,
      output: 0,
      reasoning: 0,
      cacheRead: 0,
      cacheWrite: 0,
      cacheHit: 0,
    },
    distribution: {
      userPercentage: 0,
      assistantPercentage: 0,
      toolCallPercentage: 0,
      otherPercentage: 0,
    },
    rawMessages: [],
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
