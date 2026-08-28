import { Wrench } from '@gravity-ui/icons';
import { memo } from 'react';

import { BaseTool } from '@/app/components/tool-call-view/tools/base-tool';
import { GenericToolPart } from '@/app/components/tool-call-view/tools/tool-types';
import { toTitleCase } from '@/app/lib/file';
import { formatToolOutput } from '@/app/lib/file-icons/tool-helpers';

export const GenericToolView = memo(
  ({
    part,
    blockId,
    isStreaming,
  }: {
    part: GenericToolPart;
    blockId: string;
    isStreaming: boolean;
  }) => {
    const rawOutput = formatToolOutput(part.output);
    const inputStr =
      typeof part.input === 'string'
        ? part.input
        : JSON.stringify(part.input, null, 2);
    const title = toTitleCase(part.toolName);

    return (
      <BaseTool
        blockId={blockId}
        status={part.status}
        error={part.error}
        icon={Wrench}
        title={title}
        codeTitle={title}
        code={rawOutput}
        language='json'
        copyText={`// Input:\n${inputStr}\n\n// Output:\n${rawOutput}`}
        isStreaming={isStreaming}
      />
    );
  },
);
