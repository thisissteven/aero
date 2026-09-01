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
  Agent,
  AssistantMessage,
  Command,
  Message,
  Part,
  Provider,
  TextPart,
  ToolListItem,
  Worktree,
} from '@opencode-ai/sdk/v2';

import { withOpencodeClientV1 } from '@/server/adapters/opencode/client';
import { unwrap } from '@/server/adapters/opencode/unwrap';
import { directoryExists } from '@/server/helper';
import { normalizePath } from '@/server/shared';
import type {
  ExtendedGlobalSession,
  ExtendedSessionV1,
  ExtendedSessionV2,
  ExtendedSessionV2Info,
} from '@/server/types/opencode-sdk';

import type {
  AeroAgent,
  AeroAgentCompact,
  AeroCommand,
  AeroMessage,
  AeroPart,
  AeroProvider,
  AeroSessionContextDetails,
  AeroSessionSummary,
  AeroSkill,
  AeroTool,
  AeroWorktreeItem,
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
    outputLimit: foundModel?.limit.output ?? 0,
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
    readOnly: !directoryExists(s.directory),
    sharedUrl: s.metadata?.sharedUrl,
    revert: s.revert,
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
    readOnly: !directoryExists(s.directory),
    sharedUrl: s.metadata?.sharedUrl,
    revert: s.revert,
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
    readOnly: !directoryExists(s.directory),
    sharedUrl: s.metadata?.sharedUrl,
    revert: s.revert,
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
    readOnly: !directoryExists(s.location.directory),
    sharedUrl: s.metadata?.sharedUrl,
    revert: s.revert,
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
  let lastTokenTotal = 0;

  for (const entry of entries) {
    const { info, parts } = entry;

    if (info.role === 'user') {
      userCount++;
    } else if (info.role === 'assistant') {
      assistantCount++;
      totalCost += info.cost ?? 0;
      lastAssistantMsg = info;

      if (info.tokens.total) {
        lastTokenTotal = info.tokens.total;
      }
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

  const { provider, model, limit, outputLimit } = await getProviderModelInfo(
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

  const used = lastTokenTotal ?? input + output;
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
      id: e.info.id,
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
      outputLimit,
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
    context: { used: 0, usedPercentage: 0, limit: 0, outputLimit: 0 },
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
  const base = {
    id: p.id,
    sessionID: p.sessionID,
    messageID: p.messageID,
  };

  switch (p.type) {
    case 'text':
      return {
        ...base,
        type: 'text',
        text: p.text ?? '',
        synthetic: p.synthetic,
        ignored: p.ignored,
        time: p.time,
        metadata: p.metadata,
      };

    case 'subtask':
      return {
        ...base,
        type: 'subtask',
        prompt: p.prompt,
        description: p.description,
        agent: p.agent,
        model: p.model,
        command: p.command,
      };

    case 'reasoning':
      return {
        ...base,
        type: 'reasoning',
        text: p.text ?? '',
        time: p.time,
        metadata: p.metadata,
      };

    case 'file':
      return {
        ...base,
        type: 'file',
        mime: p.mime,
        filename: p.filename,
        url: p.url,
        source: p.source,
      };

    case 'tool': {
      const state = p.state;

      // Extract duration whenever time.start & time.end exist (completed/error)
      let duration: number | undefined = undefined;
      if ('time' in state && 'end' in state.time && state.time.end) {
        duration = Math.max(0.1, (state.time.end - state.time.start) / 1000);
      }

      return {
        ...base,
        type: 'tool',
        callID: p.callID,
        toolName: p.tool,
        status: state.status,
        input: state.input,
        output: state.status === 'completed' ? state.output : undefined,
        error: state.status === 'error' ? state.error : undefined,
        title: 'title' in state ? state.title : undefined,
        attachments:
          state.status === 'completed' ? state.attachments : undefined,
        duration,
        metadata:
          p.metadata ?? ('metadata' in state ? state.metadata : undefined),
      };
    }

    case 'step-start':
      return {
        ...base,
        type: 'step-start',
        snapshot: p.snapshot,
      };

    case 'step-finish':
      return {
        ...base,
        type: 'step-finish',
        reason: p.reason,
        snapshot: p.snapshot,
        cost: p.cost,
        tokens: p.tokens,
      };

    case 'snapshot':
      return {
        ...base,
        type: 'snapshot',
        snapshot: p.snapshot,
      };

    case 'patch':
      return {
        ...base,
        type: 'patch',
        hash: p.hash,
        files: p.files,
      };

    case 'agent':
      return {
        ...base,
        type: 'agent',
        name: p.name,
        source: p.source,
      };

    case 'retry':
      return {
        ...base,
        type: 'retry',
        attempt: p.attempt,
        error: p.error,
        time: p.time,
      };

    case 'compaction':
      return {
        ...base,
        type: 'compaction',
        auto: p.auto,
        overflow: p.overflow,
        tail_start_id: p.tail_start_id,
      };

    default:
      // Graceful fallback for unhandled or future part variants
      return {
        ...base,
        type: 'text',
        text: '',
      };
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
    error:
      entry.info.role === 'assistant'
        ? {
            data: {
              message: entry.info.error?.data.message as string,
            },
            name: entry.info.error?.name as string,
          }
        : undefined,
    createdAt: entry.info.time?.created ?? Date.now(),
    agent: entry.info.agent,
    mode: entry.info.role === 'assistant' ? entry.info.mode : undefined,
    modelID: entry.info.role === 'assistant' ? entry.info.modelID : undefined,
    providerID:
      entry.info.role === 'assistant' ? entry.info.providerID : undefined,
  };
}

/**
 * Maps raw Agent data or API responses to AeroAgent.
 */
export function toAeroAgent(entry: Agent): AeroAgent {
  return { ...entry };
}

export function toAeroAgentCompact(entry: Agent): AeroAgentCompact {
  return {
    name: entry.name,
    mode: entry.mode,
    description: entry.description,
    native: entry.native,
  };
}

/**
 * Maps raw Skill / MCP / App entry objects to AeroSkill.
 * Handles both ToolListItem inputs and custom skill payload structures.
 */
export function toAeroSkill(entry: {
  name: string;
  description?: string | undefined;
  location: string;
  content: string;
}): AeroSkill {
  return {
    name: entry.name ?? 'Unnamed Skill',
    description: entry.description,
    location: entry.location,
    content: entry.content,
  };
}

/**
 * Maps raw Command configuration objects to AeroCommand.
 */
export function toAeroCommand(entry: Command): AeroCommand {
  return { ...entry };
}

/**
 * Maps raw Tool objects to AeroTool.
 */
export function toAeroTool(entry: ToolListItem): AeroTool {
  return {
    id: entry.id,
    description: entry.description,
    parameters: entry.parameters,
  };
}

/**
 * Maps raw Provider entries to AeroProvider.
 */
export function toAeroProvider(entry: Provider): AeroProvider {
  return { ...entry };
}

/**
 * Maps raw worktree API entries or strings into AeroWorktree format.
 */
export function toAeroWorktreeItem(entry: Worktree): AeroWorktreeItem {
  return {
    directory: normalizePath(entry.directory),
    name: entry.name || entry.directory.split('/').pop(),
    branch: entry.branch,
  };
}
