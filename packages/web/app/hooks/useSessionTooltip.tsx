import { useRef } from 'react';

import { SessionItemMetadata } from '@/app/components/chat-sidebar/session/session-item-metadata';
import { useTooltipStore } from '@/app/providers/global-tooltip/global-tooltip-store';
import { AeroSessionSummary } from '@/server/services/harness/types';

export function useSessionTooltip<T extends HTMLElement = HTMLDivElement>(
  session: AeroSessionSummary,
) {
  const itemRef = useRef<T>(null);
  const showTooltip = useTooltipStore((s) => s.showTooltip);
  const hideTooltip = useTooltipStore((s) => s.hideTooltip);

  const handleMouseEnter = () => {
    if (itemRef.current) {
      const rect = itemRef.current.getBoundingClientRect();

      showTooltip({
        content: (
          <div className='p-2 space-y-1'>
            <p className='text-sm max-w-md'>{session.title}</p>
            <SessionItemMetadata session={session} />
          </div>
        ),
        rect,
        isInteractive: true,
      });
    }
  };

  return {
    itemRef,
    handleMouseEnter,
    handleMouseLeave: hideTooltip,
  };
}
