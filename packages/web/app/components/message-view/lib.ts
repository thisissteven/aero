// ---------------------------------------------------------------------------
// MessageView
//
// FIX: Memo comparator.
//
// Old: `(prev, next) => prev.turn.id === next.turn.id`
//   → Breaks streaming: parts mutate while id is constant, so memo never
//     re-renders the streaming message.
//
// New: compare id + parts array length + the last part's content/status.
//   - If id changes → different turn → re-render.
//   - If parts length changes → new tool call / text part appended → re-render.
//   - If last part's text or status changed → streaming update → re-render.
//   - Otherwise → memo bails out → no wasted render.
//
// This is defensive and works for both in-place mutation and replace-by-ref
// streaming patterns.

import { formatDateTime } from '@/app/lib/date';
import {
  AeroConversationTurn,
  AeroPart,
} from '@/server/services/harness/types';

// ---------------------------------------------------------------------------
export function areTurnsEqual(
  prev: { turn: AeroConversationTurn },
  next: { turn: AeroConversationTurn },
): boolean {
  const prevTurn = prev.turn;
  const nextTurn = next.turn;

  if (prevTurn.id !== nextTurn.id) return false;
  if (prevTurn.role !== nextTurn.role) return false;

  if (
    prevTurn.error?.name !== nextTurn.error?.name ||
    prevTurn.error?.data?.message !== nextTurn.error?.data?.message
  ) {
    return false;
  }

  if (prevTurn.parts.length !== nextTurn.parts.length) {
    return false;
  }

  for (let index = 0; index < prevTurn.parts.length; index++) {
    const prevPart = prevTurn.parts[index];
    const nextPart = nextTurn.parts[index];

    if (!arePartsEqual(prevPart, nextPart)) {
      return false;
    }
  }

  return true;
}

function arePartsEqual(prev: AeroPart, next: AeroPart): boolean {
  if (prev.id !== next.id) return false;
  if (prev.type !== next.type) return false;

  switch (next.type) {
    case 'text':
    case 'reasoning':
      return prev.type === next.type && prev.text === next.text;

    case 'tool':
      return (
        prev.type === 'tool' &&
        prev.callID === next.callID &&
        prev.toolName === next.toolName &&
        prev.status === next.status &&
        prev.title === next.title &&
        prev.output === next.output &&
        prev.error === next.error &&
        prev.duration === next.duration &&
        JSON.stringify(prev.input) === JSON.stringify(next.input)
      );

    case 'file':
      return (
        prev.type === 'file' &&
        prev.mime === next.mime &&
        prev.filename === next.filename &&
        prev.url === next.url
      );

    case 'subtask':
      return (
        prev.type === 'subtask' &&
        prev.prompt === next.prompt &&
        prev.description === next.description &&
        prev.agent === next.agent &&
        prev.command === next.command
      );

    default:
      return JSON.stringify(prev) === JSON.stringify(next);
  }
}

export interface UsageExceeded {
  title: string;
  message: string;
  label: string;
  link?: string;
}

export type FlatConversationVirtualItem =
  | {
      id: string;
      type: 'user';
      turn: AeroConversationTurn;
      forkMessageId: string;
    }
  | {
      id: string;
      type: 'assistant-part';
      turnId: string;
      part: AeroPart;
      partIndex: number;
      isPartStreaming: boolean;
      isLastPartInTurn: boolean;
    }
  | {
      id: string;
      type: 'assistant-footer';
      turnId: string;
      createdAt: string | Date;
      assistantTextResponse: string;
      nextTurnId: string;
      providerID?: string;
      modelID?: string;
      agent?: string;
      mode?: string;
    }
  | {
      id: string;
      type: 'assistant-error';
      message: string;
    }
  | {
      id: string;
      type: 'assistant-usage-exceeded';
      turnId: string;
      title: string;
      message: string;
      label: string;
      link?: string;
    }
  | {
      id: string;
      type: 'spacer-first-item';
    }
  | {
      id: string;
      type: 'spacer';
    }
  | {
      id: string;
      type: 'spacer-footer';
    };

export function buildFlatConversationItems(
  displayedGroups: AeroConversationTurn[],
  isStreaming: boolean,
  revertMessageId?: string,
  usageExceeded?: UsageExceeded,
  prev?: {
    turns: AeroConversationTurn[];
    flatItems: FlatConversationVirtualItem[];
    groupFlatIndex: number[];
    revertedMessages: { preview: string; messageId: string }[];
    isStreaming: boolean;
    revertMessageId?: string;
    usageExceeded?: UsageExceeded;
  },
): {
  flatItems: FlatConversationVirtualItem[];
  groupFlatIndex: number[];
  revertedMessages: {
    preview: string;
    messageId: string;
  }[];
} {
  const items: FlatConversationVirtualItem[] = [];
  const groupFlatIndex: number[] = new Array(displayedGroups.length);
  const revertedMessages: { preview: string; messageId: string }[] = [];

  let startIndex = 0;
  let isReverted = false;
  let hasRenderedTurn = false;

  let latestAssistantTurnIndex = -1;
  for (let i = displayedGroups.length - 1; i >= 0; i--) {
    if (displayedGroups[i].role === 'assistant') {
      latestAssistantTurnIndex = i;
      break;
    }
  }

  // Memoization: Safely reuse virtual items for referentially unmodified prefixes.
  // Bail out of prefixing completely if revert logic gets triggered.
  const canReuse =
    prev &&
    prev.revertMessageId === revertMessageId &&
    prev.usageExceeded === usageExceeded &&
    !revertMessageId;

  if (canReuse) {
    // Keep a buffer of the last 2 turns in case streaming/retry statuses mutated them.
    const safeLimit = Math.max(0, displayedGroups.length - 2);
    while (
      startIndex < safeLimit &&
      startIndex < prev.turns.length &&
      displayedGroups[startIndex] === prev.turns[startIndex]
    ) {
      startIndex++;
    }

    if (startIndex > 0) {
      const cutoff = prev.groupFlatIndex[startIndex];
      if (cutoff !== undefined && cutoff > 0) {
        for (let i = 0; i < cutoff; i++) items.push(prev.flatItems[i]);
        for (let i = 0; i < startIndex; i++)
          groupFlatIndex[i] = prev.groupFlatIndex[i];
        hasRenderedTurn = true;
      } else {
        // Fallback layout protection
        startIndex = 0;
        items.length = 0;
      }
    }
  }

  // Begin iterative buildup using imperative loops (Bypasses GC spikes generated by excessive .filter & .map chains)
  for (
    let turnIndex = startIndex;
    turnIndex < displayedGroups.length;
    turnIndex++
  ) {
    const turn = displayedGroups[turnIndex];

    if (revertMessageId && !isReverted) {
      if (turn.id === revertMessageId) {
        isReverted = true;
      } else {
        for (let p = 0; p < turn.parts.length; p++) {
          if (turn.parts[p].id === revertMessageId) {
            isReverted = true;
            break;
          }
        }
      }
    }

    if (isReverted) {
      if (turn.role === 'user') {
        let preview = '';
        for (let p = 0; p < turn.parts.length; p++) {
          const part = turn.parts[p];
          if (part.type === 'text' && part.text) {
            const trimmed = part.text.trim();
            if (trimmed) preview += (preview ? ' ' : '') + trimmed;
          }
        }
        if (preview) revertedMessages.push({ preview, messageId: turn.id });
      }
      continue;
    }

    if (turn.parts.length === 0 && !turn.error) {
      continue;
    }

    groupFlatIndex[turnIndex] = items.length;

    const nextTurn = displayedGroups[turnIndex + 1];
    const nextTurnId = nextTurn?.id ?? '';

    const isLastTurn = turnIndex === displayedGroups.length - 1;
    const isTurnStreaming = isStreaming && isLastTurn;

    if (!hasRenderedTurn) {
      items.push({
        id: `${turn.id}-spacer-first-item`,
        type: 'spacer-first-item',
      });
      hasRenderedTurn = true;
    } else {
      items.push({ id: `${turn.id}-spacer-before`, type: 'spacer' });
    }

    if (turn.role === 'user') {
      items.push({ id: turn.id, type: 'user', turn, forkMessageId: turn.id });
      continue;
    }

    if (turn.role !== 'assistant') continue;

    let assistantTextResponse = '';
    for (let p = 0; p < turn.parts.length; p++) {
      const part = turn.parts[p];
      if (part.type === 'text' && part.text) {
        const trimmed = part.text.trim();
        if (trimmed)
          assistantTextResponse +=
            (assistantTextResponse ? '\n\n' : '') + trimmed;
      }
    }
    if (assistantTextResponse) {
      assistantTextResponse = assistantTextResponse.replace(/\n{3,}/g, '\n\n');
    }

    let errorMessage: string | undefined = undefined;
    if (turn.error) {
      errorMessage =
        turn.error.name === 'MessageAbortedError'
          ? 'This turn was aborted by the user'
          : turn.error.data?.message;
    }

    const partsLength = turn.parts.length;
    for (let partIndex = 0; partIndex < partsLength; partIndex++) {
      const part = turn.parts[partIndex];
      const isLastPartInTurn = partIndex === partsLength - 1;
      const isPartStreaming = isTurnStreaming && isLastPartInTurn;

      if (
        part.type === 'text' &&
        (!part.text || !part.text.trim()) &&
        !isPartStreaming
      )
        continue;
      if (
        part.type === 'reasoning' &&
        (!part.text || !part.text.trim()) &&
        !isPartStreaming
      )
        continue;

      items.push({
        id: `${turn.id}-part-${partIndex}`,
        type: 'assistant-part',
        turnId: turn.id,
        part,
        partIndex,
        isPartStreaming,
        isLastPartInTurn,
      });
    }

    if (errorMessage) {
      items.push({
        id: `${turn.id}-assistant-error`,
        type: 'assistant-error',
        message: errorMessage,
      });
    }

    if (usageExceeded && turnIndex === latestAssistantTurnIndex) {
      items.push({
        id: `${turn.id}-usage-exceeded`,
        type: 'assistant-usage-exceeded',
        turnId: turn.id,
        title: usageExceeded.title,
        message: usageExceeded.message,
        label: usageExceeded.label,
        link: usageExceeded.link,
      });
    }

    const hasFooter =
      !isTurnStreaming && (turn.parts.length > 0 || !!turn.error);
    if (hasFooter) {
      items.push({
        id: `${turn.id}-footer`,
        type: 'assistant-footer',
        turnId: turn.id,
        createdAt: formatDateTime(turn.createdAt),
        assistantTextResponse: assistantTextResponse || errorMessage || '',
        nextTurnId,
        providerID: turn.providerID,
        modelID: turn.modelID,
        agent: turn.agent,
        mode: turn.mode,
      });
    }

    items.push({ id: `${turn.id}-spacer-footer`, type: 'spacer-footer' });
  }

  return {
    flatItems: items,
    groupFlatIndex,
    revertedMessages,
  };
}
