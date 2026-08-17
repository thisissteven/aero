import type { ReactNode } from 'react';

import { Resizable } from '@aero/ui';

import { useChatPanelStore } from '@/app/stores/chat-panel-store';

export function ChatMainContentPanel({ children }: { children: ReactNode }) {
  const isExpanded = useChatPanelStore((s) => s.isExpanded);

  return (
    <Resizable.Panel className='h-full min-w-0'>
      <div
        className={
          isExpanded
            ? 'pointer-events-none h-0 w-0 overflow-hidden opacity-0'
            : 'h-full w-full'
        }
      >
        {children}
      </div>
    </Resizable.Panel>
  );
}
