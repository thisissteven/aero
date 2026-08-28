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
  const revertedMessages: {
    preview: string;
    messageId: string;
  }[] = [];

  let isReverted = false;
  let hasRenderedTurn = false;

  /**
   * Usage-exceeded belongs to the latest assistant turn,
   * not necessarily the last turn in the conversation.
   *
   * This matters if a newer user turn has already been added
   * while the previous assistant is still the one associated
   * with the retry state.
   */
  let latestAssistantTurnIndex = -1;

  for (let i = displayedGroups.length - 1; i >= 0; i--) {
    if (displayedGroups[i].role === 'assistant') {
      latestAssistantTurnIndex = i;
      break;
    }
  }

  for (let turnIndex = 0; turnIndex < displayedGroups.length; turnIndex++) {
    const turn = displayedGroups[turnIndex];

    const isRevertTarget =
      turn.id === revertMessageId ||
      turn.parts.some((part) => part.id === revertMessageId);

    if (revertMessageId && isRevertTarget) {
      isReverted = true;
    }

    if (isReverted) {
      if (turn.role === 'user') {
        const preview = turn.parts
          .filter((part) => part.type === 'text')
          .map((part) => part.text.trim())
          .filter(Boolean)
          .join(' ');

        revertedMessages.push({
          preview,
          messageId: turn.id,
        });
      }

      continue;
    }

    /**
     * Empty turns are ignored only when they also have no error.
     *
     * An errored assistant turn can legitimately have zero parts.
     */
    if (turn.parts.length === 0 && !turn.error) {
      continue;
    }

    groupFlatIndex[turnIndex] = items.length;

    const nextTurn = displayedGroups[turnIndex + 1];
    const nextTurnId = nextTurn?.id ?? '';

    /**
     * Only the actual last turn is considered streaming.
     *
     * Older assistant turns remain completed so their footers
     * continue to render while a newer assistant turn streams.
     */
    const isLastTurn = turnIndex === displayedGroups.length - 1;
    const isTurnStreaming = isStreaming && isLastTurn;

    if (!hasRenderedTurn) {
      items.push({
        id: `${turn.id}-spacer-first-item`,
        type: 'spacer-first-item',
      });

      hasRenderedTurn = true;
    } else {
      items.push({
        id: `${turn.id}-spacer-before`,
        type: 'spacer',
      });
    }

    if (turn.role === 'user') {
      items.push({
        id: turn.id,
        type: 'user',
        turn,
        forkMessageId: turn.id,
      });

      continue;
    }

    if (turn.role !== 'assistant') {
      continue;
    }

    const assistantTextResponse = turn.parts
      .filter((part) => part.type === 'text')
      .map((part) => part.text.trim())
      .filter(Boolean)
      .join('\n\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();

    const errorMessage = (() => {
      if (!turn.error) {
        return undefined;
      }

      switch (turn.error.name) {
        case 'MessageAbortedError':
          return 'This turn was aborted by the user';

        default:
          return turn.error.data?.message;
      }
    })();

    turn.parts.forEach((part, partIndex) => {
      const isLastPartInTurn = partIndex === turn.parts.length - 1;

      const isPartStreaming = isTurnStreaming && isLastPartInTurn;

      if (part.type === 'text' && !part.text?.trim() && !isPartStreaming) {
        return;
      }

      if (part.type === 'reasoning' && !part.text?.trim() && !isPartStreaming) {
        return;
      }

      items.push({
        id: `${turn.id}-part-${partIndex}`,
        type: 'assistant-part',
        turnId: turn.id,
        part,
        partIndex,
        isPartStreaming,
        isLastPartInTurn,
      });
    });

    /**
     * Error rendering is independent from the footer.
     *
     * Therefore an errored assistant turn with zero parts
     * still gets a visible error item.
     */
    if (errorMessage) {
      items.push({
        id: `${turn.id}-assistant-error`,
        type: 'assistant-error',
        message: errorMessage,
      });
    }

    /**
     * Usage exceeded is a session-level retry state, not
     * an AeroMessage error.
     *
     * Attach it only to the latest assistant turn.
     */
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

    /**
     * A completed assistant turn gets a footer when it has
     * either content or an error.
     */
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

    items.push({
      id: `${turn.id}-spacer-footer`,
      type: 'spacer-footer',
    });
  }

  return {
    flatItems: items,
    groupFlatIndex,
    revertedMessages,
  };
}
