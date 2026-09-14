import { Typography } from '@aero/ui';
import { CircleTree } from '@gravity-ui/icons';
import { Icon } from '@gravity-ui/uikit';
import { useNavigate } from '@tanstack/react-router';
import { SubagentStatusItem } from '@/app/components/status-panel/subagent-status-item';
import { useSessionChildren, useSessionStatus } from '@/app/hooks/api/sessions';
import { useSessionId } from '@/app/providers/SessionIdProvider';
import { useStatusPanelStore } from '@/app/stores/status-panel-store';

export function SubagentStatus() {
  const isVisible = useStatusPanelStore((state) => state.visibleItems.subagent);

  if (!isVisible) return null;
  return <SubagentStatusContent />;
}

function SubagentStatusContent() {
  const sessionId = useSessionId();
  const { data: children = [] } = useSessionChildren(undefined, sessionId);
  const _navigate = useNavigate();

  const { data: sessionStatus } = useSessionStatus(undefined, sessionId);

  if (!children.length || !sessionStatus) return null;
  return (
    <div className='border-separator border-b p-3'>
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
        {children.map((session) => {
          const status = sessionStatus?.[session.id]?.type;
          return (
            <SubagentStatusItem
              key={session.id}
              session={session}
              status={status}
            />
          );
        })}
      </div>
    </div>
  );
}
