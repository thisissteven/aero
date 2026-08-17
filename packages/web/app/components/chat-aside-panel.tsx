import {
  ChevronsCollapseUpRight,
  ChevronsExpandUpRight,
  Xmark,
} from '@gravity-ui/icons';
import { Icon } from '@gravity-ui/uikit';
import { useMemo } from 'react';

import { Resizable } from '@aero/ui';

import { collapsibleNav } from '@/app/components/chat-aside';
import { useChatPanelStore } from '@/app/stores/chat-panel-store';

export function ChatAsidePanel() {
  const activeNavItem = useChatPanelStore((s) => s.activeNavItem);
  const isExpanded = useChatPanelStore((s) => s.isExpanded);
  const toggleExpanded = useChatPanelStore((s) => s.toggleExpanded);
  const closePanel = useChatPanelStore((s) => s.closePanel);

  const activeNavData = useMemo(
    () => collapsibleNav.find((item) => item.id === activeNavItem),
    [activeNavItem],
  );

  if (!activeNavItem) return null;

  return (
    <>
      {!isExpanded && (
        <Resizable.Handle type='line' variant='primary' className='w-[0.6px]' />
      )}
      <Resizable.Panel
        id='aside-panel'
        defaultSize={isExpanded ? '100%' : '320px'}
        minSize={isExpanded ? '100%' : '320px'}
        maxSize={isExpanded ? '100%' : '640px'}
        groupResizeBehavior='preserve-pixel-size'
      >
        <aside className='flex h-full flex-col'>
          <div className='border-separator flex h-12 shrink-0 items-center justify-between border-b px-3'>
            <div className='flex items-center gap-2'>
              <span className='flex size-4 place-items-center'>
                {activeNavData?.icon}
              </span>
              <span className='text-sm font-medium'>
                {activeNavData?.label}
              </span>
            </div>

            <div className='flex items-center gap-1.5'>
              <button
                type='button'
                onClick={toggleExpanded}
                className='p-1 opacity-80 transition hover:opacity-100'
                title={isExpanded ? 'Collapse panel' : 'Expand panel'}
                aria-label='Expand panel'
              >
                <Icon
                  data={
                    isExpanded ? ChevronsCollapseUpRight : ChevronsExpandUpRight
                  }
                  size={14}
                />
              </button>

              <button
                type='button'
                onClick={closePanel}
                className='p-1 opacity-80 transition hover:opacity-100'
                title='Close panel'
                aria-label='Close panel'
              >
                <Icon data={Xmark} size={15} />
              </button>
            </div>
          </div>

          <div className='text-muted flex flex-1 items-center justify-center p-6 text-center text-sm'>
            Content body: {activeNavData?.label}
          </div>
        </aside>
      </Resizable.Panel>
    </>
  );
}
