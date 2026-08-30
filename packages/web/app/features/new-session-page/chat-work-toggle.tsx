import { Segment } from '@aero/ui';

import { useNewSessionStore } from '@/app/features/new-session-page/new-session-store';

export function ChatWorkToggle() {
  const state = useNewSessionStore((state) => state.state);
  const setState = useNewSessionStore((state) => state.setState);

  return (
    <div className='mx-auto mt-4 w-fit'>
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
