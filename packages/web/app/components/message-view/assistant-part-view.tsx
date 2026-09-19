// assistant-part-view.tsx

import { Markdown } from '@aero/ui';
import { memo } from 'react';

import { ReasoningBlock } from '@/app/components/message-view/reasoning-block';
import { ToolCallView } from '@/app/components/tool-call-view/tool-call-view';
import { AeroPart } from '@/server/services/harness/types';

export const AssistantPartView = memo(function AssistantPartView({
  turnId,
  part,
  partIndex,
  isPartStreaming,
}: {
  turnId: string;
  part: AeroPart;
  partIndex: number;
  isPartStreaming: boolean;
}) {
  const blockId = `${turnId}-part-${partIndex}`;

  switch (part.type) {
    case 'text': {
      return (
        <div className='relative py-1.5 px-0.5'>
          <Markdown
            id={blockId}
            streaming={isPartStreaming}
            streamRevealPreset='instant'
          >
            {part.text}
          </Markdown>
        </div>
      );
    }

    case 'reasoning': {
      return (
        <div className='relative min-h-[2.5rem]'>
          <ReasoningBlock
            blockId={blockId}
            text={part.text}
            isStreaming={isPartStreaming}
          />
        </div>
      );
    }

    case 'tool':
      return (
        <div className='relative min-h-[2.5rem] text-sm'>
          <ToolCallView
            part={part}
            blockId={blockId}
            isStreaming={isPartStreaming}
          />
        </div>
      );

    default:
      return null;
  }
});
