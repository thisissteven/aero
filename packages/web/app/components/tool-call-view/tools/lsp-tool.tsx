import { AbbrSql } from '@gravity-ui/icons';
import { memo } from 'react';

import { BaseTool } from '@/app/components/tool-call-view/tools/base-tool';
import { LspPart } from '@/app/components/tool-call-view/tools/tool-types';
import { formatToolOutput } from '@/app/lib/file-icons/tool-helpers';

export const LspToolView = memo(
  ({
    part,
    blockId,
    isStreaming,
  }: {
    part: LspPart;
    blockId: string;
    isStreaming: boolean;
  }) => {
    const operation = part.input.operation || '';
    const path = part.input.path || '';
    const rawOutput = formatToolOutput(part.output);

    return (
      <BaseTool
        blockId={blockId}
        status={part.status}
        error={part.error}
        icon={AbbrSql}
        title='LSP Operation'
        codeTitle='LSP Operation'
        code={rawOutput}
        language='json'
        preview={path ? `${operation} ${path}` : operation}
        copyText={rawOutput}
        isStreaming={isStreaming}
      />
    );
  },
);
