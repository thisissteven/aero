import { FileText } from '@gravity-ui/icons';
import { memo } from 'react';

import { BaseTool } from '@/app/components/tool-call-view/tools/base-tool';
import { ReadPart } from '@/app/components/tool-call-view/tools/tool-types';
import {
  formatReadToolOutput,
  getLanguageFromExtension,
} from '@/app/lib/file-icons/tool-helpers';
import { getBasename, normalizePath } from '@/server/shared';

export const ReadToolView = memo(
  ({
    part,
    blockId,
    isStreaming,
  }: {
    part: ReadPart;
    blockId: string;
    isStreaming: boolean;
  }) => {
    const path = normalizePath(part.input.path || part.input.filePath || '');
    const fileName = getBasename(path);
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
        preview={fileName}
        previewType='path'
        copyText={output}
        isStreaming={isStreaming}
        showLineNumbers
      />
    );
  },
);
