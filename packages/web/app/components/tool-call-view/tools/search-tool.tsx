import { Bars } from '@gravity-ui/icons';
import { memo } from 'react';

import { BaseTool } from '@/app/components/tool-call-view/tools/base-tool';
import { SearchPart } from '@/app/components/tool-call-view/tools/tool-types';
import { formatToolOutput } from '@/app/lib/file-icons/tool-helpers';

export const SearchToolView = memo(
  ({
    part,
    blockId,
    isStreaming,
  }: {
    part: SearchPart;
    blockId: string;
    isStreaming: boolean;
  }) => {
    const pattern = part.input.pattern || part.input.query || '';
    const path = part.input.path;
    const rawOutput = formatToolOutput(part.output);

    return (
      <BaseTool
        blockId={blockId}
        status={part.status}
        error={part.error}
        icon={Bars}
        title='Search Files'
        codeTitle={`Pattern: ${pattern}`}
        code={rawOutput}
        language='log'
        preview={path ? `${pattern} in ${path}` : pattern}
        copyText={rawOutput}
        showLineNumbers={false}
        isStreaming={isStreaming}
        isItalicHeader
      />
    );
  },
);
