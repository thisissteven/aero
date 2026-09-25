import { Segment } from '@aero/ui';

import { useNewSessionStore } from '@/app/features/new-session-page/new-session-store';
import { useChatInputExpanded } from '@/app/hooks/api/settings';
import { useI18n } from '@/app/hooks/i18n';

export function ChatWorkToggle() {
  const state = useNewSessionStore((state) => state.state);
  const setState = useNewSessionStore((state) => state.setState);

  const enabled = useChatInputExpanded();

  const { t } = useI18n();

  if (enabled) return null;

  return (
    <div className='absolute top-4 left-1/2 mx-auto w-fit -translate-x-1/2'>
      <Segment
        selectedKey={state}
        onSelectionChange={(key) => setState(key as 'chat' | 'work')}
      >
        <Segment.Item id='chat'>{t.newSession.chat}</Segment.Item>
        <Segment.Item id='work'>{t.newSession.work}</Segment.Item>
      </Segment>
    </div>
  );
}
