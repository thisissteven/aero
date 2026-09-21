import { Chip } from '@aero/ui';
import { FaceRobot } from '@gravity-ui/icons';
import { useNavigate } from '@tanstack/react-router';
import { memo } from 'react';

import { BaseTool } from '@/app/components/tool-call-view/tools/base-tool';
import { SubagentPart } from '@/app/components/tool-call-view/tools/tool-types';
import { formatToolOutput } from '@/app/lib/file-icons/tool-helpers';
import { SessionIdProvider } from '@/app/providers/SessionIdProvider';

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
    const childSessionId = metadata.sessionId;

    const rawOutput = formatToolOutput(output);

    const preview = (
      <div className='flex items-center gap-2 overflow-hidden'>
        <span className='truncate'>{title}</span>
        <Chip
          size='sm'
          variant='primary'
          className='h-5 shrink-0 px-1.5 text-xs font-medium'
        >
          @{subagentType}
        </Chip>
      </div>
    );

    return (
      <SessionIdProvider value={childSessionId}>
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
      </SessionIdProvider>
    );
  },
);

SubagentToolView.displayName = 'SubagentToolView';
