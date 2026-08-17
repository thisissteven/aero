import {
  ChevronsCollapseUpRight,
  ChevronsExpandUpRight,
  Xmark,
} from '@gravity-ui/icons';
import { Icon } from '@gravity-ui/uikit';
import { useLocation, useNavigate } from '@tanstack/react-router';
import type { ReactNode } from 'react';
import { useCallback, useMemo, useState } from 'react';

import { AppLayout, Resizable } from '@aero/ui';

import {
  ChatAside,
  collapsibleNav,
  type NavItemId,
} from '@/app/components/chat-aside';
import { useCommandPaletteStore } from '@/app/components/command-palette/command-palette-store';

import { ChatNavbar } from './chat-navbar';
import { ChatSidebar } from './chat-sidebar';
import { CommandPalette } from './command-palette';
import type { ChatActivePage } from '../data/chat';
import { resolveChatActivePage } from '../data/chat';

export interface ChatShellProps {
  children: ReactNode;
}

export function ChatShell({ children }: ChatShellProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const pathname = location.pathname;

  const [activeNavItem, setActiveNavItem] = useState<NavItemId | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  const handleNavigate = useCallback(
    (href: string) => {
      navigate({
        to: `/${href}`,
      });
    },
    [navigate],
  );

  const activePage = useMemo<ChatActivePage>(
    () => resolveChatActivePage(pathname),
    [pathname],
  );

  const setIsSearchOpen = useCommandPaletteStore((state) => state.setIsOpen);

  const activeNavData = useMemo(
    () => collapsibleNav.find((item) => item.id === activeNavItem),
    [activeNavItem],
  );

  const toggleNavItem = useCallback((id: NavItemId) => {
    setActiveNavItem((prev) => {
      if (prev === id) {
        setIsExpanded(false);
        return null;
      }
      return id;
    });
  }, []);

  const handleClose = useCallback(() => {
    setActiveNavItem(null);
    setIsExpanded(false);
  }, []);

  return (
    <div className='bg-background text-foreground flex h-screen w-screen overflow-hidden'>
      {/* AppLayout and ChatAside remain top-level flex siblings */}
      <div className='h-full min-w-0 flex-1'>
        <AppLayout
          navigate={handleNavigate}
          navbar={
            <ChatNavbar
              activePage={activePage}
              isAsideExpanded={!!activeNavItem}
            />
          }
          sidebar={
            <ChatSidebar
              pathname={pathname}
              onSearch={() => setIsSearchOpen(true)}
            />
          }
          sidebarResizable
          sidebarCollapsible='offcanvas'
          resizableAutoSaveId='app-layout:resizable-sidebar'
          sidebarMinSize='240px'
          sidebarDefaultSize='240px'
          sidebarMaxSize='480px'
          sidebarResizeBehavior='preserve-pixel-size'
        >
          {/* Resizable operates strictly inside AppLayout's main content area */}
          <Resizable orientation='horizontal' autoSaveId='chat:side-panel'>
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

            {/* Dynamic Aside Content Panel */}
            {activeNavItem && (
              <>
                {!isExpanded && (
                  <Resizable.Handle
                    type='line'
                    variant='primary'
                    className='w-[0.6px]'
                  />
                )}
                <Resizable.Panel
                  id='aside-panel'
                  defaultSize={isExpanded ? '100%' : '320px'}
                  minSize={isExpanded ? '100%' : '320px'}
                  maxSize={isExpanded ? '100%' : '640px'}
                  groupResizeBehavior='preserve-pixel-size'
                >
                  <aside className='flex h-full flex-col'>
                    {/* Header */}
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
                          onClick={() => setIsExpanded((prev) => !prev)}
                          className='p-1 opacity-80 transition hover:opacity-100'
                          title={isExpanded ? 'Collapse panel' : 'Expand panel'}
                          aria-label='Expand panel'
                        >
                          {isExpanded ? (
                            <Icon data={ChevronsCollapseUpRight} size={14} />
                          ) : (
                            <Icon data={ChevronsExpandUpRight} size={14} />
                          )}
                        </button>

                        <button
                          type='button'
                          onClick={handleClose}
                          className='p-1 opacity-80 transition hover:opacity-100'
                          title='Close panel'
                          aria-label='Close panel'
                        >
                          <Icon data={Xmark} size={15} />
                        </button>
                      </div>
                    </div>

                    {/* Content */}
                    <div className='text-muted flex flex-1 items-center justify-center p-6 text-center text-sm'>
                      Content body: {activeNavData?.label}
                    </div>
                  </aside>
                </Resizable.Panel>
              </>
            )}
          </Resizable>
        </AppLayout>
      </div>

      {/* Standalone Sibling Aside Navigation Bar */}
      <ChatAside activeItem={activeNavItem} onSelect={toggleNavItem} />

      <CommandPalette />
    </div>
  );
}
