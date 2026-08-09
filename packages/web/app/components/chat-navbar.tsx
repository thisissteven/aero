import { Archive, Ellipsis, Pencil } from '@gravity-ui/icons';
import { Icon } from '@gravity-ui/uikit';
import { useParams } from '@tanstack/react-router';

import {
  AppLayout,
  Dropdown,
  Label,
  Navbar,
  Separator,
  Sidebar,
} from '@aero/ui';

import {
  CopySessionId,
  DeleteSession,
  ExportMarkdown,
} from '@/app/components/chat-sidebar/session-actions';
import { useSession } from '@/app/hooks/api/sessions';
import { formatCompactRelativeTime } from '@/app/lib';

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
    <div className='flex items-start'>
      <div className='flex min-w-0 flex-col'>
        <h1 className='text-foreground truncate text-sm font-semibold sm:text-base'>
          {session.title}
        </h1>
        <span className='text-muted truncate text-xs'>
          {formatCompactRelativeTime(session.updatedAt)}
        </span>
      </div>
      <div>
        <Dropdown>
          <Dropdown.Trigger
            aria-label={`More actions for ${session.title}`}
            className='mt-1.5 ml-2'
          >
            <Icon
              data={Ellipsis}
              className='opacity-50 transition-opacity hover:opacity-100'
              style={{
                width: 14,
                height: 14,
              }}
            />
          </Dropdown.Trigger>
          <Dropdown.Popover
            className='w-44'
            crossOffset={12}
            placement='bottom end'
          >
            <Dropdown.Menu aria-label={`${session.title} actions`}>
              <Dropdown.Item>
                <Icon data={Pencil} />
                <Label>Rename</Label>
              </Dropdown.Item>
              <CopySessionId sessionId={session.id} />
              <ExportMarkdown sessionId={session.id} />
              <Separator />
              <Dropdown.Item>
                <Icon data={Archive} />
                <Label>Archive</Label>
              </Dropdown.Item>
              <DeleteSession sessionId={session.id} />
            </Dropdown.Menu>
          </Dropdown.Popover>
        </Dropdown>
      </div>
    </div>
  );
}
