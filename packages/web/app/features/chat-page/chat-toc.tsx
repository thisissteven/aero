import { FloatingToc } from '@aero/ui';
import React, { useMemo } from 'react';

import { useSessionScroll } from '@/app/features/chat-page/chat-feed/chat-store';
import { useSessionToc } from '@/app/hooks/api/sessions';
import { useI18n } from '@/app/hooks/i18n';
import { useSessionId } from '@/app/providers/SessionIdProvider';

export const ChatTocSection = React.memo(function ChatTocSection({
  onSelectTocItem,
}: {
  onSelectTocItem: (groupIndex: number) => void;
}) {
  const sessionId = useSessionId();
  const { t } = useI18n();
  const { data: tocItems = [] } = useSessionToc(undefined, sessionId);

  // Subscribe ONLY to activeGroupIndex. ChatPage no longer re-renders per scroll.
  const activeGroupIndex = useSessionScroll(
    sessionId,
    (s) => s.activeGroupIndex,
  );

  const activeTocIndex = useMemo(() => {
    if (!tocItems.length) return -1;
    let activeIdx = 0;
    for (let i = 0; i < tocItems.length; i++) {
      const item = tocItems[i];
      if (item && item.groupIndex <= activeGroupIndex) activeIdx = i;
      else break;
    }
    return activeIdx;
  }, [tocItems, activeGroupIndex]);

  if (!tocItems.length) return null;

  return (
    <div className='absolute top-1/2 right-2 z-1 translate-y-[calc(-50%-42px)]'>
      <FloatingToc placement='right' triggerMode='hover'>
        <FloatingToc.Trigger aria-label={t.chatFeed.tableOfContentsAria}>
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
