import { Globe } from '@gravity-ui/icons';
import { memo } from 'react';

import { BaseTool } from '@/app/components/tool-call-view/tools/base-tool';
import { WebSearchPart } from '@/app/components/tool-call-view/tools/tool-types';
import { formatToolOutput } from '@/app/lib/file-icons/tool-helpers';

export const WebSearchToolView = memo(
  ({
    part,
    blockId,
    isStreaming,
  }: {
    part: WebSearchPart;
    blockId: string;
    isStreaming: boolean;
  }) => {
    const query = part.input.query || '';
    const rawOutput = formatToolOutput(part.output);

    return (
      <BaseTool
        blockId={blockId}
        status={part.status}
        error={part.error}
        icon={Globe}
        title='Web Search'
        codeTitle='Web Search'
        code={rawOutput}
        language='json'
        preview={query}
        copyText={rawOutput}
        isStreaming={isStreaming}
      />
    );
  },
);
