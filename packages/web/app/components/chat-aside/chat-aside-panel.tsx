import {
  ChevronsCollapseUpRight,
  ChevronsExpandUpRight,
  Xmark,
} from '@gravity-ui/icons';
import { Icon } from '@gravity-ui/uikit';
import { useEffect, useMemo, useRef } from 'react';

import type { PanelImperativeHandle } from '@aero/ui';
import { Resizable } from '@aero/ui';

import { BrowserPanel } from '@/app/components/chat-aside/browser/browser-panel';
import { collapsibleNav } from '@/app/components/chat-aside/chat-aside';
import { ContextPanel } from '@/app/components/chat-aside/context/context-panel';
import { TerminalPanel } from '@/app/components/chat-aside/terminal/terminal-panel';
import { useChatPanelStore } from '@/app/stores/chat-panel-store';

export function ChatAsidePanel() {
  const isOpen = useChatPanelStore((s) => s.isOpen);
  const activeNavItem = useChatPanelStore((s) => s.activeNavItem);
  const isExpanded = useChatPanelStore((s) => s.isExpanded);
  const storeToggleExpanded = useChatPanelStore((s) => s.toggleExpanded);
  const closePanel = useChatPanelStore((s) => s.closePanel);

  const panelRef = useRef<PanelImperativeHandle | null>(null);
  const lastSizeRef = useRef<number | null>(null);

  const activeNavData = useMemo(
    () => collapsibleNav.find((item) => item.id === activeNavItem),
    [activeNavItem],
  );

  const handleToggleExpanded = () => {
    if (!isExpanded && panelRef.current) {
      // Store current pixel size before expanding
      lastSizeRef.current = panelRef.current.getSize().inPixels;
    }
    storeToggleExpanded();
  };

  useEffect(() => {
    if (!isExpanded && panelRef.current && lastSizeRef.current !== null) {
      const restoredSize = `${lastSizeRef.current}px`;

      // Wait for layout bounds (minSize/maxSize) to commit before resizing
      requestAnimationFrame(() => {
        panelRef.current?.resize(restoredSize);
      });
    }
  }, [isExpanded]);

  if (!isOpen || !activeNavItem) return null;

  return (
    <>
      {!isExpanded && <Resizable.Handle type='line' variant='primary' />}
      <Resizable.Panel
        handleRef={panelRef}
        id='aside-panel'
        defaultSize={isExpanded ? '100%' : '360px'}
        minSize={isExpanded ? '100%' : '320px'}
        maxSize={isExpanded ? '100%' : '70%'}
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
                onClick={handleToggleExpanded}
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

          <div className='relative h-full w-full'>
            {activeNavItem === 'terminal' ? (
              <TerminalPanel />
            ) : activeNavItem === 'browser' ? (
              <BrowserPanel />
            ) : activeNavItem === 'context' ? (
              <ContextPanel />
            ) : (
              <div className='text-muted flex flex-1 items-center justify-center p-6 text-center text-sm'>
                Content body: {activeNavData?.label}
              </div>
            )}
          </div>
        </aside>
      </Resizable.Panel>
    </>
  );
}
