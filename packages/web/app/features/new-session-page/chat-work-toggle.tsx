import { Segment } from '@aero/ui';

import { useNewSessionStore } from '@/app/features/new-session-page/new-session-store';
import { useChatInputExpanded } from '@/app/hooks/api/settings';
import { NEW_SESSION_PAGE_SESSION_ID } from '@/server/shared';

export function ChatWorkToggle() {
  const state = useNewSessionStore((state) => state.state);
  const setState = useNewSessionStore((state) => state.setState);

  const { data } = useChatInputExpanded(NEW_SESSION_PAGE_SESSION_ID);
  const enabled = data?.value ?? false;

  if (enabled) return null;

  return (
    <div className='absolute top-4 left-1/2 mx-auto w-fit -translate-x-1/2'>
      <Segment
        selectedKey={state}
        onSelectionChange={(key) => setState(key as 'chat' | 'work')}
      >
        <Segment.Item id='chat'>Chat</Segment.Item>
        <Segment.Item id='work'>Work</Segment.Item>
      </Segment>
    </div>
  );
}
