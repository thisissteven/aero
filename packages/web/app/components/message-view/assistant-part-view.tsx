// assistant-part-view.tsx

import { memo } from 'react';
import { Markdown } from '@/app/components/markdown/markdown';
import { ReasoningBlock } from '@/app/components/message-view/reasoning-block';
import { ToolCallView } from '@/app/components/tool-call-view/tool-call-view';
import { AeroPart } from '@/server/services/harness/types';

export const AssistantPartView = memo(
  function AssistantPartView({
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
    switch (part.type) {
      case 'text': {
        return (
          <div className='relative py-1.5 px-0.5'>
            <Markdown
              id={part.id}
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
              blockId={part.id}
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
              blockId={part.id}
              isStreaming={isPartStreaming}
            />
          </div>
        );

      default:
        return null;
    }
  },
  (prev, next) => {
    // 1. Still streaming → always re-render so tokens appear.
    if (next.isPartStreaming) return false;

    // 2. Streaming just ended → one last render to capture the final state.
    if (prev.isPartStreaming !== next.isPartStreaming) return false;

    // 3. Settled part → only re-render if identity props changed.
    return prev.turnId === next.turnId && prev.partIndex === next.partIndex;
  },
);
