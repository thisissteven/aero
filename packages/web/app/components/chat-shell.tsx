import { useNavigate } from '@tanstack/react-router';
import type { ReactNode } from 'react';
import { useCallback } from 'react';

import { AppLayout, Resizable } from '@aero/ui';

import { useRestoreSessionStreams } from '@/app/hooks/api/stream-event';

import { ChatAsidePanel } from './chat-aside/chat-aside-panel';
import { ConnectedChatAside } from './chat-aside/connected-chat-aside';
import { ChatMainContentPanel } from './chat-main-content-panel';
import { ConnectedChatNavbar } from './chat-navbar/connected-chat-navbar';
import { ChatSidebar } from './chat-sidebar';
import { CommandPalette } from './command-palette';

export interface ChatShellProps {
  children: ReactNode;
}

export function ChatShell({ children }: ChatShellProps) {
  const navigate = useNavigate();

  const handleNavigate = useCallback(
    (href: string) => {
      navigate({ to: `/${href}` });
    },
    [navigate],
  );

  useRestoreSessionStreams();

  return (
    <div className='bg-background text-foreground flex h-screen w-screen overflow-hidden'>
      <div className='h-full min-w-0 flex-1'>
        <AppLayout
          asideToggleShortcut={null}
          toggleShortcut={null}
          navigate={handleNavigate}
          navbar={<ConnectedChatNavbar />}
          sidebar={<ChatSidebar />}
          sidebarResizable
          sidebarCollapsible='offcanvas'
          resizableAutoSaveId='app-layout:resizable-sidebar'
          sidebarMinSize='240px'
          sidebarDefaultSize='240px'
          sidebarMaxSize='480px'
          sidebarResizeBehavior='preserve-pixel-size'
        >
          <Resizable orientation='horizontal' autoSaveId='chat:side-panel'>
            <ChatMainContentPanel>{children}</ChatMainContentPanel>
            <ChatAsidePanel />
          </Resizable>
        </AppLayout>
      </div>

      <ConnectedChatAside />
      <CommandPalette />
    </div>
  );
}
