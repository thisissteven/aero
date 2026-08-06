import {
  AeroConversationTurn,
  AeroPart,
} from '../../server/services/harness/types';

const DEFAULT_FONT_SIZE = 16;
const PART_GAP = 8;

const TOOL_BASE_HEIGHT = 20;
const REASONING_BASE_HEIGHT = 12;

function getTextEstimateHeight(text: string) {
  const container = document.getElementById('chat-container');

  // fallback if not mounted yet
  const width = container?.clientWidth ?? 600;

  const fontSize = DEFAULT_FONT_SIZE;

  // Average character width for 16px sans-serif.
  // ~0.5-0.55em is a good approximation.
  const charWidth = fontSize * 0.52;

  const charsPerLine = Math.max(1, Math.floor(width / charWidth));

  const lines = Math.ceil(text.length / charsPerLine);

  // line-height default browser-ish estimate
  const lineHeight = fontSize * 1.5;

  return Math.max(lineHeight, lines * lineHeight);
}

function getPartEstimateHeight(part: AeroPart) {
  const scale = DEFAULT_FONT_SIZE / 16;

  switch (part.type) {
    case 'text':
      return getTextEstimateHeight(part.text);

    case 'tool':
      return TOOL_BASE_HEIGHT * scale;

    case 'reasoning':
      return REASONING_BASE_HEIGHT * scale;

    case 'file':
      // assuming file chips/list items behave like a single row
      return DEFAULT_FONT_SIZE * 1.5;

    default:
      return DEFAULT_FONT_SIZE * 1.5;
  }
}

export function getTurnEstimateSize(turn: AeroConversationTurn) {
  if (turn.parts.length === 0) {
    return DEFAULT_FONT_SIZE * 1.5;
  }

  const partsHeight = turn.parts.reduce(
    (total, part) => total + getPartEstimateHeight(part),
    0,
  );

  const gaps = Math.max(0, turn.parts.length - 1) * PART_GAP;

  return partsHeight + gaps;
}
