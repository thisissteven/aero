import { CircleTree } from '@gravity-ui/icons';
import { Icon } from '@gravity-ui/uikit';
import { useNavigate, useParams } from '@tanstack/react-router';

import { Chip, Typography } from '@aero/ui';

import { ProviderLogo } from '@/app/components/provider-logo';
import { useSessionChildren, useSessionStatus } from '@/app/hooks/api/sessions';
import { formatCompactRelativeTime } from '@/app/lib';
import { useStatusPanelStore } from '@/app/stores/status-panel-store';

export function SubagentStatus() {
  const isVisible = useStatusPanelStore(
    (state) => state.visibleItems.contextSources,
  );

  if (!isVisible) return null;
  return <SubagentStatusContent />;
}

function SubagentStatusContent() {
  const { sessionId } = useParams({ strict: false });
  const { data: children = [] } = useSessionChildren(undefined, sessionId);
  const navigate = useNavigate();

  const { data: sessionStatus } = useSessionStatus(undefined, sessionId);

  if (!children.length || !sessionStatus) return null;
  return (
    <div className='border-separator dark:border-separator/50 border-b p-3'>
      <div className='mb-2.5 flex items-center justify-between gap-1'>
        <div className='flex items-center gap-1'>
          <Icon data={CircleTree} className='text-muted' size={14} />
          <Typography type='body-sm' className='text-foreground font-medium'>
            Subagents
          </Typography>
        </div>
        <Typography type='body-xs' className='text-muted'>
          {children.length}
        </Typography>
      </div>

      <div className='flex flex-col gap-1'>
        {children.map((child) => (
          <button
            key={child.id}
            type='button'
            onClick={() => navigate({ to: `/sessions/${child.id}` })}
            className='hover:bg-surface flex items-center justify-between gap-2 rounded-md px-2 py-1.5 text-left transition-colors'
          >
            <div className='min-w-0 flex-1 space-y-1'>
              <Typography
                type='body-xs'
                className='text-foreground truncate font-medium'
              >
                {child.title || 'Untitled'}
              </Typography>
              <div className='flex items-center justify-between gap-1'>
                <Typography
                  type='body-xs'
                  className='text-muted flex items-center justify-between gap-1 font-mono'
                >
                  {child.model && (
                    <>
                      <ProviderLogo
                        providerId={child.model.providerID}
                        alt={child.model.id}
                        className='size-3.5'
                      />
                      {child.model.id}
                    </>
                  )}
                </Typography>
                {sessionStatus?.[child.id]?.type === 'busy' && (
                  <Chip
                    variant='soft'
                    color='accent'
                    size='sm'
                    className='translate-x-1'
                  >
                    Working
                  </Chip>
                )}

                {!sessionStatus?.[child.id]?.type && (
                  <span className='text-muted text-xs'>
                    {formatCompactRelativeTime(child.updatedAt, true)}
                  </span>
                )}
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
