import {
  AeroConversationTurn,
  AeroPart,
} from '@/server/services/harness/types';

const DEFAULT_FONT_SIZE = 16;
const PART_GAP = 8;
const TOOL_BASE_HEIGHT = 20;
const REASONING_BASE_HEIGHT = 12;

function getTextEstimateHeight(text: string, containerWidth: number) {
  const fontSize = DEFAULT_FONT_SIZE;
  const charWidth = fontSize * 0.52;
  const charsPerLine = Math.max(1, Math.floor(containerWidth / charWidth));
  const lines = Math.ceil(text.length / charsPerLine);
  const lineHeight = fontSize * 1.5;
  return Math.max(lineHeight, lines * lineHeight);
}

function getPartEstimateHeight(part: AeroPart, containerWidth: number) {
  switch (part.type) {
    case 'text':
      return getTextEstimateHeight(part.text, containerWidth);
    case 'tool':
      return TOOL_BASE_HEIGHT;
    case 'reasoning':
      return REASONING_BASE_HEIGHT;
    case 'file':
      return DEFAULT_FONT_SIZE * 1.5;
    default:
      return DEFAULT_FONT_SIZE * 1.5;
  }
}

export function getTurnEstimateSize(
  turn: AeroConversationTurn,
  containerWidth: number,
) {
  if (turn.parts.length === 0) return DEFAULT_FONT_SIZE * 1.5;

  const partsHeight = turn.parts.reduce(
    (total, part) => total + getPartEstimateHeight(part, containerWidth),
    0,
  );
  const gaps = Math.max(0, turn.parts.length - 1) * PART_GAP;
  return partsHeight + gaps;
}
