import { FileText } from '@gravity-ui/icons';
import { memo } from 'react';

import { BaseTool } from '@/app/components/tool-call-view/tools/base-tool';
import { ReadPart } from '@/app/components/tool-call-view/tools/tool-types';
import {
  formatReadToolOutput,
  getLanguageFromExtension,
} from '@/app/lib/file-icons/tool-helpers';

export const ReadToolView = memo(
  ({ part, blockId }: { part: ReadPart; blockId: string }) => {
    const path = part.input.path || part.input.filePath || '';
    const output = formatReadToolOutput(part.output);

    const language = getLanguageFromExtension(path);

    return (
      <BaseTool
        blockId={blockId}
        status={part.status}
        error={part.error}
        icon={FileText}
        title='Read File'
        codeTitle={path}
        code={output}
        language={language ?? 'text'}
        preview={path}
        previewType='read-path'
        copyText={output}
        showLineNumbers
      />
    );
  },
);
