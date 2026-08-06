import {
  AeroConversationTurn,
  AeroPart,
} from '@/server/services/harness/types';

// ---------------------------------------------------------------------------
// Base constants
// ---------------------------------------------------------------------------
const DEFAULT_FONT_SIZE = 16;
const PART_GAP = 8;

// Code block constants: header bar + top/bottom padding + scrollbar affordance
const CODE_BLOCK_CHROME = 48;
// Per code-fence line height (monospace, slightly tighter than prose)
const CODE_LINE_HEIGHT = DEFAULT_FONT_SIZE * 1.4;
// Heading multipliers relative to base line height
const HEADING_LINE_HEIGHT = DEFAULT_FONT_SIZE * 2.2;
// List item height (tighter than prose)
const LIST_ITEM_HEIGHT = DEFAULT_FONT_SIZE * 1.75;
// Prose line height
const PROSE_LINE_HEIGHT = DEFAULT_FONT_SIZE * 1.625; // leading-relaxed ≈ 1.625

// ---------------------------------------------------------------------------
// Text height estimator that accounts for markdown structure
// ---------------------------------------------------------------------------
function getTextEstimateHeight(text: string, containerWidth: number): number {
  if (!text) return PROSE_LINE_HEIGHT;

  const lines = text.split('\n');

  let totalHeight = 0;
  let inCodeFence = false;
  let codeFenceLines = 0;

  for (const line of lines) {
    // Code fence boundaries
    if (line.trimStart().startsWith('```')) {
      if (inCodeFence) {
        // Closing fence: commit code block height
        const codeHeight = codeFenceLines * CODE_LINE_HEIGHT;
        totalHeight += CODE_BLOCK_CHROME + codeHeight;
        inCodeFence = false;
        codeFenceLines = 0;
      } else {
        inCodeFence = true;
        // The header line itself counts as one code line
        codeFenceLines = 0;
      }
      continue;
    }

    if (inCodeFence) {
      codeFenceLines++;
      continue;
    }

    // ATX headings (#, ##, ###, …)
    const headingMatch = /^(#{1,6})\s/.exec(line);
    if (headingMatch) {
      totalHeight += HEADING_LINE_HEIGHT;
      continue;
    }

    // Unordered list items
    if (/^[\s]*[-*+]\s/.test(line)) {
      totalHeight += LIST_ITEM_HEIGHT;
      continue;
    }

    // Ordered list items
    if (/^[\s]*\d+\.\s/.test(line)) {
      totalHeight += LIST_ITEM_HEIGHT;
      continue;
    }

    // Horizontal rules / thematic breaks
    if (/^[-*_]{3,}\s*$/.test(line.trim())) {
      totalHeight += PROSE_LINE_HEIGHT;
      continue;
    }

    // Blank line (paragraph separator — add a small gap instead of full line)
    if (line.trim() === '') {
      totalHeight += PROSE_LINE_HEIGHT * 0.5;
      continue;
    }

    // Normal prose: wrap based on container width
    const charsPerLine = Math.max(
      1,
      Math.floor(containerWidth / (DEFAULT_FONT_SIZE * 0.52)),
    );
    const wrappedLines = Math.max(1, Math.ceil(line.length / charsPerLine));
    totalHeight += wrappedLines * PROSE_LINE_HEIGHT;
  }

  // Unclosed code fence (streaming in progress)
  if (inCodeFence) {
    const codeHeight = codeFenceLines * CODE_LINE_HEIGHT;
    totalHeight += CODE_BLOCK_CHROME + codeHeight;
  }

  return Math.max(PROSE_LINE_HEIGHT, totalHeight);
}

function getPartEstimateHeight(part: AeroPart, containerWidth: number): number {
  switch (part.type) {
    case 'text':
      return getTextEstimateHeight(part.text, containerWidth);
    case 'reasoning':
      // Reasoning section: collapsed trigger row only (users rarely open it
      // for size estimation purposes); actual size measured after mount.
      return DEFAULT_FONT_SIZE * 2.5;
    case 'tool':
      // Collapsed disclosure trigger row
      return DEFAULT_FONT_SIZE * 2.75;
    case 'file':
      return DEFAULT_FONT_SIZE * 1.75;
    default:
      return DEFAULT_FONT_SIZE * 1.75;
  }
}

export function getTurnEstimateSize(
  turn: AeroConversationTurn,
  containerWidth: number,
): number {
  if (!turn.parts || turn.parts.length === 0) return DEFAULT_FONT_SIZE * 3;

  const partsHeight = turn.parts.reduce(
    (total, part) => total + getPartEstimateHeight(part, containerWidth),
    0,
  );
  const gaps = Math.max(0, turn.parts.length - 1) * PART_GAP;
  // User bubble has a fixed 2-line-clamped minimum + padding
  const base = turn.role === 'user' ? DEFAULT_FONT_SIZE * 4 : 0;
  return Math.max(base, partsHeight + gaps);
}
