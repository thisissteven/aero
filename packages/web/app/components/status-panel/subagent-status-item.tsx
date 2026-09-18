import { Chip, Typography } from '@aero/ui';
import { useSideChatStore } from '@/app/components/chat-aside/side-chat/side-chat-store';
import { ProviderLogo } from '@/app/components/provider-logo';
import { useSessionTooltip } from '@/app/hooks/useSessionTooltip';
import { formatCompactRelativeTime } from '@/app/lib';
import { useSidePanelStore } from '@/app/stores/side-panel-store';
import {
  AeroSessionStatus,
  AeroSessionSummary,
} from '@/server/services/harness/types';
import { toPascalCase } from '@/server/shared';

export function SubagentStatusItem({
  session,
  status,
}: {
  session: AeroSessionSummary;
  status: AeroSessionStatus['type'] | undefined;
}) {
  const tooltipProps = useSessionTooltip<HTMLButtonElement>(session);

  return (
    <button
      type='button'
      onClick={() => {
        useSideChatStore.getState().setSessionId(session.id);
        useSidePanelStore.getState().setActiveNavItem('side-chat');
        useSidePanelStore.getState().setIsOpen(true);
      }}
      className='hover:bg-default/60 backdrop-blur-sm w-full overflow-hidden flex items-center justify-between gap-2 rounded-md px-2 py-1.5 text-left transition-colors'
      ref={tooltipProps.itemRef}
      onMouseEnter={tooltipProps.handleMouseEnter}
      onMouseLeave={tooltipProps.handleMouseLeave}
    >
      <div className='min-w-0 flex-1 space-y-1'>
        <Typography
          type='body-xs'
          className='text-foreground truncate font-medium'
        >
          {session.title || 'Untitled'}
        </Typography>
        <div className='flex items-center justify-between gap-1'>
          <Typography
            type='body-xs'
            className='text-muted flex items-center gap-1 min-w-0'
          >
            {session.model && (
              <>
                <ProviderLogo
                  providerId={session.model.providerID}
                  alt={session.model.id}
                  className='size-3.5 shrink-0'
                />
                <span className='truncate'>
                  {toPascalCase(session.model.id)}
                </span>
              </>
            )}
          </Typography>
          {status === 'busy' && (
            <Chip
              variant='soft'
              color='accent'
              size='sm'
              className='translate-x-1'
            >
              Working
            </Chip>
          )}

          {!status && (
            <span className='text-muted text-xs shrink-0'>
              {formatCompactRelativeTime(session.updatedAt, true)}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}
