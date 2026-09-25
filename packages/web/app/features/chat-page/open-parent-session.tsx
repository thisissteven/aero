import { Button } from '@aero/ui';
import { ArrowUturnCcwLeft } from '@gravity-ui/icons';
import { Icon } from '@gravity-ui/uikit';
import { useNavigate } from '@tanstack/react-router';
import { useSession } from '@/app/hooks/api/sessions';
import { useI18n } from '@/app/hooks/i18n';

export function OpenParentSession({ sessionId }: { sessionId: string }) {
  const { t } = useI18n();
  const { data: session } = useSession(undefined, sessionId);
  const navigate = useNavigate();

  if (!session || !session?.parentId) return null;

  return (
    <div className='absolute top-4 left-1/2 z-1 -translate-x-1/2 overflow-hidden'>
      <Button
        variant='outline'
        isIconOnly={false}
        onPress={() => {
          navigate({ to: `/sessions/${session.parentId}` });
        }}
        size='sm'
        className='backdrop-blur-sm'
      >
        <Icon data={ArrowUturnCcwLeft} />
        {t.chatFeed.openParentSession}
      </Button>
    </div>
  );
}
