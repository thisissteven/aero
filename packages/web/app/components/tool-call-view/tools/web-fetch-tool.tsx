import { Globe } from '@gravity-ui/icons';
import { memo } from 'react';

import { BaseTool } from '@/app/components/tool-call-view/tools/base-tool';
import { WebFetchPart } from '@/app/components/tool-call-view/tools/tool-types';
import { formatToolOutput } from '@/app/lib/file-icons/tool-helpers';

export const WebFetchToolView = memo(
  ({ part, blockId }: { part: WebFetchPart; blockId: string }) => {
    const url = part.input.url || '';
    const rawOutput = formatToolOutput(part.output);

    return (
      <BaseTool
        blockId={blockId}
        status={part.status}
        error={part.error}
        icon={Globe}
        title='Web Fetch'
        codeTitle='Web Fetch'
        code={rawOutput}
        language='markdown'
        preview={url}
        copyText={rawOutput}
      />
    );
  },
);
