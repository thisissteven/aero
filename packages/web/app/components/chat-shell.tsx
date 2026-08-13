import {
  ArrowRightArrowLeft,
  CircleDashed,
  CircleTree,
  CodePullRequest,
  Comment,
  File,
  FileCode,
  Globe,
  Terminal,
} from '@gravity-ui/icons';
import { Icon } from '@gravity-ui/uikit';
import { useLocation, useNavigate } from '@tanstack/react-router';
import type { ReactNode } from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { AppLayout, Tooltip, Typography } from '@aero/ui';

import { ChatNavbar } from './chat-navbar';
import { ChatSearchDialog } from './chat-search-dialog';
import { ChatSidebar } from './chat-sidebar';
import type { ChatActivePage } from '../data/chat';
import { resolveChatActivePage } from '../data/chat';

export interface ChatShellProps {
  children: ReactNode;
}

const collapsibleNav = [
  {
    icon: <Icon data={CircleTree} size={18} />,
    label: 'Git',
    description: 'Commits, branches, and pull requests',
  },
  {
    icon: <Icon data={CircleDashed} size={18} />,
    label: 'Context',
    description: 'Session context and token usage',
  },
  {
    icon: <Icon data={CodePullRequest} size={18} />,
    label: 'Pull Request',
    description:
      'Create, review, and merge the pull request for the current branch',
  },
  {
    icon: <Icon data={ArrowRightArrowLeft} size={18} />,
    label: 'Changes',
    description: 'Review working changes',
  },
  {
    icon: <Icon data={FileCode} size={18} />,
    label: 'Files',
    description: 'Edit project files',
  },
  {
    icon: <Icon data={Terminal} size={18} />,
    label: 'Terminal',
    description: 'Built-in terminal',
  },
  {
    icon: <Icon data={File} size={18} />,
    label: 'Project notes',
    description: 'Notes, todos, and plans for the project',
  },
  {
    icon: <Icon data={Globe} size={18} />,
    label: 'Browser',
    description: 'Built-in web browser',
  },
  {
    icon: <Icon data={Comment} size={18} />,
    label: 'Chat',
    description: 'Session opened side by side',
  },
] as const;

export function ChatShell({ children }: ChatShellProps) {
  const navigate = useNavigate();
  const location = useLocation();

  const pathname = location.pathname;

  const [isSearchOpen, setIsSearchOpen] = useState(false);

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

  const onSelect = useCallback(
    (callback: () => void) => {
      setIsSearchOpen(false);
      callback();
    },
    [navigate],
  );

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const isMac =
        typeof navigator !== 'undefined' &&
        /Mac|iPhone|iPad/.test(navigator.platform);

      const modifier = isMac ? event.metaKey : event.ctrlKey;

      if (modifier && (event.key === 'k' || event.key === 'K')) {
        event.preventDefault();
        setIsSearchOpen((open) => !open);
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  return (
    <AppLayout
      navigate={handleNavigate}
      navbar={<ChatNavbar activePage={activePage} />}
      sidebar={
        <ChatSidebar
          pathname={pathname}
          onSearch={() => setIsSearchOpen(true)}
        />
      }
      // aside
      // asideResizable
      // asideMinSize='48px'
      // asideDefaultSize='48px'
      // asideMaxSize='480px'
      // asideResizeBehavior='preserve-pixel-size'
      sidebarResizable
      sidebarCollapsible='offcanvas'
      resizableAutoSaveId='app-layout:resizable-sidebar'
      sidebarMinSize='240px'
      sidebarDefaultSize='240px'
      sidebarMaxSize='480px'
      sidebarResizeBehavior='preserve-pixel-size'
    >
      <div className='flex h-full w-full'>
        <div className='flex-1'>{children}</div>
        <div className='h-full w-8 max-sm:hidden'>
          {collapsibleNav.map((item) => (
            <Tooltip key={item.label} delay={300}>
              <Tooltip.Trigger aria-label={item.label}>
                <div className='px-1 py-1.5 opacity-50 transition hover:opacity-100'>
                  {item.icon}
                </div>
              </Tooltip.Trigger>

              <Tooltip.Content placement='left'>
                <Typography
                  type='body-sm'
                  className='text-accent-soft-foreground'
                >
                  {item.label}
                </Typography>
                <Typography type='body-xs' className='leading-4 break-normal'>
                  {item.description}
                </Typography>
              </Tooltip.Content>
            </Tooltip>
          ))}
        </div>
      </div>

      <ChatSearchDialog
        isOpen={isSearchOpen}
        onOpenChange={setIsSearchOpen}
        onSelect={onSelect}
      />
    </AppLayout>
  );
}
