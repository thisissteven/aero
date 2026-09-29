import type { AeroComposerSegment } from '@/server/services/harness/types';

/** Plain-text projection of a composer segment list. */
export function composerTextFromSegments(
  segments: AeroComposerSegment[],
): string {
  return segments
    .map((segment) =>
      segment.type === 'text'
        ? segment.text
        : segment.token.label || segment.token.value,
    )
    .join('')
    .trim();
}
