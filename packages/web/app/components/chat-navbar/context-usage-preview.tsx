import { useParams } from '@tanstack/react-router';

import { Tooltip } from '@aero/ui';

import { IconButton } from '@/app/components/ui/icon-button';
import { useSessionContext } from '@/app/hooks/api/sessions';
import { formatCompactNumber } from '@/app/lib/number';
import { useChatPanelStore } from '@/app/stores/chat-panel-store';

interface PercentageCircleIconProps {
  percentage: number;
  size?: number | string;
}

export function PercentageCircleIcon({
  percentage = 0,
}: PercentageCircleIconProps) {
  const value = Math.min(100, Math.max(0, percentage));
  const radius = 8;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (value / 100) * circumference;

  return (
    <svg
      viewBox='0 0 20 20'
      style={{
        transform: 'rotate(-90deg)',
        display: 'inline-block',
      }}
    >
      {/* Background Track Circle */}
      <circle
        cx='10'
        cy='10'
        r={radius}
        fill='transparent'
        stroke='var(--muted, #e5e7eb)'
        strokeWidth='3'
      />
      {/* Active Fill Circle */}
      <circle
        cx='10'
        cy='10'
        r={radius}
        fill='transparent'
        stroke='var(--accent, currentColor)'
        strokeWidth='3'
        strokeDasharray={circumference}
        strokeDashoffset={strokeDashoffset}
        strokeLinecap='round'
        style={{ transition: 'stroke-dashoffset 0.3s ease' }}
      />
    </svg>
  );
}

export function ContextUsagePreview() {
  const toggleOpenRightPanel = useChatPanelStore(
    (state) => state.openClosePanelWithShortcut,
  );

  const { sessionId } = useParams({
    strict: false,
  });

  const { data } = useSessionContext(undefined, sessionId);

  if (!sessionId || !data) {
    return null;
  }

  return (
    <Tooltip delay={300}>
      <IconButton
        onPress={() => toggleOpenRightPanel('context')}
        isIconOnly={false}
        svgSize='sm'
      >
        <PercentageCircleIcon percentage={data.context.usedPercentage} />
        <span className='text-foreground/50'>
          {Math.round(data.context.usedPercentage)}%
        </span>
      </IconButton>
      <Tooltip.Content>
        <div className='p-0.5 text-sm'>
          <div className='flex gap-2'>
            <div>Used Tokens:</div>
            <div>{formatCompactNumber(data.context.used)}</div>
          </div>
          <div className='flex gap-2'>
            <div>Context Limit:</div>
            <div>{formatCompactNumber(data.context.limit)}</div>
          </div>
          <div className='flex gap-2'>
            <div>Output Limit:</div>
            <div>{formatCompactNumber(data.context.outputLimit)}</div>
          </div>
        </div>
      </Tooltip.Content>
    </Tooltip>
  );
}
