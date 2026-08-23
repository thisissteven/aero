import { FileText } from '@gravity-ui/icons';
import { memo } from 'react';

import { BaseTool } from '@/app/components/tool-call-view/tools/base-tool';
import { ReadPart } from '@/app/components/tool-call-view/tools/tool-types';
import { formatToolOutput } from '@/app/lib/file-icons/tool-helpers';

export const ReadToolView = memo(
  ({ part, blockId }: { part: ReadPart; blockId: string }) => {
    const path = part.input.path || part.input.filePath || '';
    const rawOutput = formatToolOutput(part.output);

    return (
      <BaseTool
        blockId={blockId}
        status={part.status}
        error={part.error}
        icon={FileText}
        title='Read File'
        codeTitle='Read File'
        code={rawOutput}
        language='json'
        preview={path}
        previewType='read-path'
        copyText={rawOutput}
        showLineNumbers={false}
      />
    );
  },
);
