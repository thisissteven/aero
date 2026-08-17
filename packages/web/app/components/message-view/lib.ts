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
    }
  | {
      id: string;
      type: 'spacer';
    };
