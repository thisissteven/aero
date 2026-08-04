import { useParams } from '@tanstack/react-router';

import { AppLayout, Navbar, Sidebar } from '@aero/ui';

import { formatCompactRelativeTime } from '@/lib';
import { useSession } from '@/hooks/api/sessions';

import type { ChatActivePage } from '../data/chat';

export interface ChatNavbarProps {
  activePage: ChatActivePage;
}

export function ChatNavbar({ activePage }: ChatNavbarProps) {
  const isNew = activePage.kind === 'new';
  const isSessions = activePage.kind === 'sessions';

  return (
    <Navbar maxWidth='full'>
      <Navbar.Header>
        <AppLayout.MenuToggle />
        <Sidebar.Trigger />
        {isNew && <NewNavbarContent />}
        {isSessions && <SessionsNavbarContent />}
        <Navbar.Spacer />
      </Navbar.Header>
    </Navbar>
  );
}

function NewNavbarContent() {
  return (
    <div className='flex min-w-0 flex-col'>
      <h1 className='text-foreground truncate text-sm font-semibold sm:text-base'>
        New Chat
      </h1>
      <span className='text-muted truncate text-xs'>
        Start a brand new conversation
      </span>
    </div>
  );
}

function SessionsNavbarContent() {
  const { sessionId } = useParams({
    strict: false,
  });
  const { data: session } = useSession(undefined, sessionId);

  if (!session) {
    return null;
  }

  return (
    <div className='flex min-w-0 flex-col'>
      <h1 className='text-foreground truncate text-sm font-semibold sm:text-base'>
        {session.title}
      </h1>
      <span className='text-muted truncate text-xs'>
        {formatCompactRelativeTime(session.updatedAt)}
      </span>
    </div>
  );
}
