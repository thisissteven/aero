import { cn } from '@aero/ui';
import { ArrowUturnCcwLeft } from '@gravity-ui/icons';
import { Icon } from '@gravity-ui/uikit';
import { useSideChatStore } from '@/app/components/chat-aside/side-chat/side-chat-store';
import { useSession } from '@/app/hooks/api/sessions';
import { useI18n } from '@/app/hooks/i18n';

export function OpenSubagentsList() {
  const sessionId = useSideChatStore((state) => state.sessionId);
  const { t } = useI18n();
  const setView = useSideChatStore((state) => state.setView);
  const setSessionId = useSideChatStore((state) => state.setSessionId);

  const { data: session } = useSession(undefined, sessionId);

  if (sessionId.length === 0 || !session) return null;

  return (
    <div className='absolute top-4 left-1/2 z-1 -translate-x-1/2 w-full flex justify-center'>
      <div className='bg-surface rounded-full border border-separator overflow-hidden flex items-center'>
        <button
          onClick={() => {
            setView('list');
          }}
          className={cn(
            'py-1 px-2 text-sm shrink-0 active:opacity-50',
            session?.parentId && 'border-r border-separator',
          )}
        >
          <Icon data={ArrowUturnCcwLeft} />
        </button>
        {session?.parentId && (
          <button
            onClick={() => {
              setView('detail');
              if (session?.parentId) {
                setSessionId(session.parentId);
              }
            }}
            className='text-sm shrink-0 py-1 pl-2 pr-3 rounded-l-none active:opacity-50'
          >
            {t.chatFeed.openParentSession}
          </button>
        )}
      </div>
    </div>
  );
}
