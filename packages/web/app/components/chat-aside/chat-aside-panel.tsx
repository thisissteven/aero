import type { PanelImperativeHandle } from '@aero/ui';
import { Resizable, Skeleton } from '@aero/ui';
import {
  ChevronsCollapseUpRight,
  ChevronsExpandUpRight,
  Xmark,
} from '@gravity-ui/icons';
import { Icon } from '@gravity-ui/uikit';
import { useEffect, useMemo, useRef } from 'react';

import { BrowserPanel } from '@/app/components/chat-aside/browser/browser-panel';
import { ContextPanel } from '@/app/components/chat-aside/context/context-panel';
import { FileExplorerPanel } from '@/app/components/chat-aside/files/file-explorer-panel';
import { SideChatPanel } from '@/app/components/chat-aside/side-chat/side-chat-panel';
import { useSideChatStore } from '@/app/components/chat-aside/side-chat/side-chat-store';
import { TerminalPanel } from '@/app/components/chat-aside/terminal/terminal-panel';
import { SessionItemMetadata } from '@/app/components/chat-sidebar/session/session-item-metadata';
import { useSession } from '@/app/hooks/api/sessions';
import { collapsibleNav, NavItem } from '@/app/lib/constants';
import { useSidePanelStore } from '@/app/stores/side-panel-store';

export function ChatAsidePanel() {
  const isOpen = useSidePanelStore((s) => s.isOpen);
  const activeNavItem = useSidePanelStore((s) => s.activeNavItem);
  const isExpanded = useSidePanelStore((s) => s.isExpanded);
  const panelSize = useSidePanelStore((s) => s.panelSize);
  const setPanelSize = useSidePanelStore((s) => s.setPanelSize);
  const storeToggleExpanded = useSidePanelStore((s) => s.toggleExpanded);
  const closePanel = useSidePanelStore((s) => s.closePanel);

  const panelRef = useRef<PanelImperativeHandle | null>(null);

  const activeNavData = useMemo(
    () => collapsibleNav.find((item) => item.id === activeNavItem),
    [activeNavItem],
  );

  // Restore stored size whenever the panel enters the collapsed state —
  // either on first mount (refresh / open) or on expand → collapse.
  // defaultSize only applies at mount, so this effect covers both.
  useEffect(() => {
    if (!isOpen || !activeNavItem || isExpanded) return;
    const saved = useSidePanelStore.getState().panelSize;
    // Two rAFs: let the group measure, then the panel commit min/max.
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        panelRef.current?.resize(`${saved}px`);
      });
    });
  }, [isOpen, activeNavItem, isExpanded]);

  if (!isOpen || !activeNavItem) return null;

  return (
    <>
      {!isExpanded && <Resizable.Handle type='line' variant='primary' />}
      <Resizable.Panel
        handleRef={panelRef}
        id='aside-panel'
        defaultSize={isExpanded ? '100%' : `${panelSize}px`}
        minSize={isExpanded ? '100%' : '320px'}
        maxSize={isExpanded ? '100%' : '70%'}
        groupResizeBehavior='preserve-pixel-size'
        // The wrapper drops onResize when handleRef is set unless
        // `collapsible && (onCollapse || onExpand)`. Pass collapsible with
        // collapsedSize === minSize so this doesn't cause real collapsing.
        collapsible
        collapsedSize={isExpanded ? '100%' : '320px'}
        onCollapse={() => {}}
        onExpand={() => {}}
        onResize={() => {
          if (isExpanded || !panelRef.current) return;
          const px = panelRef.current.getSize().inPixels;
          if (px > 0) setPanelSize(px);
        }}
      >
        <aside className='flex h-full flex-col bg-surface/30 overflow-x-hidden'>
          <div className='border-separator flex h-12 shrink-0 items-center justify-between border-b px-3'>
            <div className='flex items-center gap-2 overflow-hidden'>
              <ChatAsideHeader activeNavData={activeNavData} />
            </div>

            <div className='flex items-center gap-1.5'>
              <button
                type='button'
                onClick={storeToggleExpanded}
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
            ) : activeNavItem === 'files' ? (
              <FileExplorerPanel />
            ) : activeNavItem === 'side-chat' ? (
              <SideChatPanel />
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

function ChatAsideHeader({ activeNavData }: { activeNavData?: NavItem }) {
  const isSubagentDetail =
    useSideChatStore((state) => state.view === 'detail') &&
    activeNavData?.id === 'side-chat';

  if (isSubagentDetail) {
    return <SubagentTitle />;
  }

  return (
    <>
      <span className='flex size-4 place-items-center'>
        {activeNavData?.icon}
      </span>
      <span className='text-sm font-medium'>{activeNavData?.label}</span>
    </>
  );
}

function SubagentTitle() {
  const sessionId = useSideChatStore((state) => state.sessionId);
  const { data: session, isLoading } = useSession(undefined, sessionId);

  if (isLoading) {
    return (
      <div className='space-y-1'>
        <Skeleton className='h-2 w-40 bg-default' />
        <Skeleton className='h-2 w-30 bg-default' />
      </div>
    );
  }

  if (!session) return null;

  return (
    <div className='min-w-0 mt-1.5'>
      <div className='text-xs font-medium truncate min-w-0'>
        {session?.title}
      </div>
      <SessionItemMetadata session={session} />
    </div>
  );
}
