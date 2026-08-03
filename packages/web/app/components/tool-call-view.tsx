import { memo } from 'react';

import { CodeBlock } from '@aero/ui';

import type { AeroPart } from '../../server/services/harness/types';

export const ToolCallView = memo(
  function ToolCallView({
    part,
  }: {
    part: Extract<AeroPart, { type: 'tool' }>;
  }) {
    const command =
      typeof part.input === 'object' &&
      part.input !== null &&
      'command' in part.input
        ? String(part.input.command)
        : '';

    const output =
      typeof part.output === 'string'
        ? part.output
        : JSON.stringify(part.output, null, 2);

    return (
      <div className='my-3'>
        <CodeBlock>
          <CodeBlock.Header>
            <span>
              {part.toolName}
              {part.status === 'completed' ? ' ✓' : ''}
            </span>
            <CodeBlock.CopyButton code={`${command}\n\n${output ?? ''}`} />
          </CodeBlock.Header>

          <CodeBlock.Code
            code={command ? `$ ${command}\n\n${output ?? ''}` : (output ?? '')}
            language='shell'
          />
        </CodeBlock>
      </div>
    );
  },
  (prev, next) => {
    // Prevent re-render if the execution contents match perfectly
    return (
      prev.part.status === next.part.status &&
      prev.part.output === next.part.output
    );
  },
);

ToolCallView.displayName = 'ToolCallView';
