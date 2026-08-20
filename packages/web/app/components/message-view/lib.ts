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
  if (prev.turn.id !== next.turn.id) return false;
  if (prev.turn.parts.length !== next.turn.parts.length) return false;

  const prevLast = prev.turn.parts[prev.turn.parts.length - 1];
  const nextLast = next.turn.parts[next.turn.parts.length - 1];

  if (!prevLast && !nextLast) return true;
  if (!prevLast || !nextLast) return false;
  if (prevLast.type !== nextLast.type) return false;

  // Compare type-specific streaming fields
  if (
    (nextLast.type === 'text' || nextLast.type === 'reasoning') &&
    (prevLast.type === 'text' || prevLast.type === 'reasoning')
  ) {
    return prevLast.text === nextLast.text;
  }

  if (nextLast.type === 'tool' && prevLast.type === 'tool') {
    return (
      prevLast.status === nextLast.status && prevLast.output === nextLast.output
    );
  }

  return true;
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
): { flatItems: FlatConversationVirtualItem[]; groupFlatIndex: number[] } {
  const items: FlatConversationVirtualItem[] = [];
  const groupFlatIndex: number[] = new Array(displayedGroups.length);

  displayedGroups.forEach((turn, turnIndex) => {
    groupFlatIndex[turnIndex] = items.length; // anchor: first flat item of this turn

    const nextTurn = displayedGroups[turnIndex + 1];
    const nextTurnId = nextTurn?.id;

    const isLastTurn = turnIndex === displayedGroups.length - 1;
    const isTurnStreaming = isStreaming && isLastTurn;

    if (turnIndex === 0) {
      items.push({
        id: `${turn.id}-spacer-first-item`,
        type: 'spacer-first-item',
      });
    }

    if (turn.role === 'user') {
      items.push({ id: turn.id, type: 'user', turn, forkMessageId: turn.id });
      items.push({ id: `${turn.id}-spacer`, type: 'spacer' });
    } else {
      const assistantTextResponse = turn.parts
        .filter((p) => p.type === 'text')
        .map((p) => p.text.trim())
        .filter(Boolean)
        .join('\n\n')
        .replace(/\n{3,}/g, '\n\n')
        .trim();

      const hasFooter = !isTurnStreaming;

      turn.parts.forEach((part, partIndex) => {
        const isLastPartInTurn = partIndex === turn.parts.length - 1;
        const isPartStreaming = isTurnStreaming && isLastPartInTurn;

        if (part.type === 'text' && !part.text?.trim() && !isPartStreaming)
          return;
        if (part.type === 'reasoning' && !part.text?.trim() && !isPartStreaming)
          return;

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

      if (hasFooter) {
        items.push({
          id: `${turn.id}-footer`,
          type: 'assistant-footer',
          turnId: turn.id,
          createdAt: formatDateTime(turn.createdAt),
          assistantTextResponse,
          nextTurnId,
        });
        items.push({ id: `${turn.id}-spacer-footer`, type: 'spacer-footer' });
      }
    }
  });

  return { flatItems: items, groupFlatIndex };
}
