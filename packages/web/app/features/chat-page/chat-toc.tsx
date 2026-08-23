import React, { useMemo } from 'react';

import { FloatingToc } from '@aero/ui';

import { useSessionToc } from '@/app/hooks/api/sessions';
import { Route } from '@/app/routes/_app/sessions/$sessionId';

export const ChatTocSection = React.memo(function ChatTocSection({
  activeGroupIndex,
  onSelectTocItem,
}: {
  activeGroupIndex: number;
  onSelectTocItem: (groupIndex: number) => void;
}) {
  const { sessionId } = Route.useParams();
  const { data: tocItems = [] } = useSessionToc(undefined, sessionId);

  const activeTocIndex = useMemo(() => {
    if (!tocItems.length) return -1;
    let activeIdx = 0;
    for (let i = 0; i < tocItems.length; i++) {
      const item = tocItems[i];
      if (item && item.groupIndex <= activeGroupIndex) {
        activeIdx = i;
      } else {
        break;
      }
    }
    return activeIdx;
  }, [tocItems, activeGroupIndex]);

  if (!tocItems.length) return null;

  return (
    <div className='absolute top-1/2 right-6 z-40 translate-y-[calc(-50%-42px)]'>
      <FloatingToc placement='right' triggerMode='hover'>
        <FloatingToc.Trigger aria-label='Table of contents'>
          {tocItems.map((tocItem, idx) => (
            <FloatingToc.Bar
              key={tocItem.id}
              active={idx === activeTocIndex}
              onClick={() => onSelectTocItem(tocItem.groupIndex)}
            />
          ))}
        </FloatingToc.Trigger>

        <FloatingToc.Content>
          {tocItems.map((tocItem, idx) => (
            <FloatingToc.Item
              key={tocItem.id}
              active={idx === activeTocIndex}
              onClick={() => onSelectTocItem(tocItem.groupIndex)}
            >
              <span className='block max-w-[200px] truncate'>
                {tocItem.label}
              </span>
            </FloatingToc.Item>
          ))}
        </FloatingToc.Content>
      </FloatingToc>
    </div>
  );
});
