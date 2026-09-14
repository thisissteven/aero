import { cn } from '@aero/ui';
import { ArrowUturnCcwLeft } from '@gravity-ui/icons';
import { Icon } from '@gravity-ui/uikit';
import { useSideChatStore } from '@/app/components/chat-aside/side-chat/side-chat-store';
import { useSession } from '@/app/hooks/api/sessions';

export function OpenSubagentsList() {
  const sessionId = useSideChatStore((state) => state.sessionId);
  const setView = useSideChatStore((state) => state.setView);
  const setSessionId = useSideChatStore((state) => state.setSessionId);

  const { data: session } = useSession(undefined, sessionId);

  if (sessionId.length === 0 || !session) return null;

  return (
    <div className='absolute top-4 left-1/2 z-1 -translate-x-1/2 flex'>
      <button
        onClick={() => {
          setView('list');
        }}
        className={cn(
          'bg-surface rounded-full py-1 px-2 text-sm border border-separator shrink-0',
          session?.parentId && 'rounded-r-none border-r-0',
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
          className='bg-surface text-sm border border-separator shrink-0 rounded-full py-1 pl-2 pr-3 rounded-l-none'
        >
          Open parent session
        </button>
      )}
    </div>
  );
}
