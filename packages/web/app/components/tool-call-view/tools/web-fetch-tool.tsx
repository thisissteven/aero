import { Globe } from '@gravity-ui/icons';
import { memo } from 'react';

import { BaseTool } from '@/app/components/tool-call-view/tools/base-tool';
import { WebFetchPart } from '@/app/components/tool-call-view/tools/tool-types';
import { formatToolOutput } from '@/app/lib/file-icons/tool-helpers';

export const WebFetchToolView = memo(
  ({
    part,
    blockId,
    isStreaming,
  }: {
    part: WebFetchPart;
    blockId: string;
    isStreaming: boolean;
  }) => {
    const url = part.input.url || '';
    const format = part.input.format || 'text';
    const rawOutput = formatToolOutput(part.output);

    return (
      <BaseTool
        blockId={blockId}
        status={part.status}
        error={part.error}
        icon={Globe}
        title='Web Fetch'
        codeTitle={url}
        code={rawOutput}
        language={format}
        preview={
          <span className='bg-surface-secondary text-muted min-w-0 truncate rounded-full px-1.5 py-0.5 text-[10px] font-medium tabular-nums'>
            {url}
          </span>
        }
        copyText={rawOutput}
        isStreaming={isStreaming}
        showLineNumbers={false}
      />
    );
  },
);
