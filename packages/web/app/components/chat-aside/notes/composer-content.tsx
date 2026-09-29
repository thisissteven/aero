'use client';

import { cn } from '@aero/ui';

import { TOKEN_COLOR_MAP } from '@/app/components/smart-composer/smart-composer-dom';
import type { AeroComposerSegment } from '@/server/services/harness/types';

/** Read-only rendering of a composer segment list, tokens included. */
export function ComposerContent({
  segments,
  className,
}: {
  segments: AeroComposerSegment[];
  className?: string;
}) {
  return (
    <span className={className}>
      {segments.map((segment, index) =>
        segment.type === 'text' ? (
          <span key={index} className='whitespace-pre-wrap'>
            {segment.text}
          </span>
        ) : (
          <span
            key={index}
            className={cn(
              'bg-default mx-px inline-flex max-w-full items-center truncate rounded-md px-1 py-px text-xs font-medium',
              TOKEN_COLOR_MAP[segment.token.type],
            )}
            title={segment.token.label}
          >
            {segment.token.label}
          </span>
        ),
      )}
    </span>
  );
}
