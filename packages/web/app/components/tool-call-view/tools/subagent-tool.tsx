import { FaceRobot } from '@gravity-ui/icons';
import { useNavigate } from '@tanstack/react-router';
import { memo } from 'react';

import { Chip } from '@aero/ui';

import { BaseTool } from '@/app/components/tool-call-view/tools/base-tool';
import { SubagentPart } from '@/app/components/tool-call-view/tools/tool-types';
import { formatToolOutput } from '@/app/lib/file-icons/tool-helpers';

export const SubagentToolView = memo(
  ({
    part,
    blockId,
    isStreaming,
  }: {
    part: SubagentPart;
    blockId: string;
    isStreaming: boolean;
  }) => {
    const { input, metadata, status, duration, error, output } = part;
    const subagentType = input?.subagent_type ?? 'subagent';
    const title =
      part.title || input?.description || input?.command || 'Running Subagent';
    const childSessionId = metadata?.sessionId;

    const navigate = useNavigate();
    const rawOutput = formatToolOutput(output);

    const preview = (
      <div className='flex items-center gap-2 overflow-hidden'>
        <span className='truncate'>{title}</span>
        <Chip
          size='sm'
          variant='primary'
          className='h-5 shrink-0 px-1.5 text-[10px] font-medium capitalize'
        >
          @{subagentType}
        </Chip>
      </div>
    );

    return (
      <div
        className='cursor-pointer'
        onClick={() => {
          navigate({
            to: `/sessions/${childSessionId}`,
          });
        }}
      >
        <BaseTool
          blockId={blockId}
          status={status}
          error={error}
          duration={duration}
          icon={FaceRobot}
          title='Subagent'
          preview={preview}
          codeTitle={title}
          code={rawOutput || 'No output'}
          language='text'
          copyText={rawOutput}
          isStreaming={isStreaming}
          useDuration
        />
      </div>
    );
  },
);

SubagentToolView.displayName = 'SubagentToolView';
