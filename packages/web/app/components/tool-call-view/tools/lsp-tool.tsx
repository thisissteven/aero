import { AbbrSql } from '@gravity-ui/icons';
import { memo } from 'react';

import { BaseTool } from '@/app/components/tool-call-view/tools/base-tool';
import { LspPart } from '@/app/components/tool-call-view/tools/tool-types';
import { useI18n } from '@/app/hooks/i18n';
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
    const { t } = useI18n();
    const operation = part.input.operation || '';
    const path = part.input.path || '';
    const rawOutput = formatToolOutput(part.output);

    return (
      <BaseTool
        blockId={blockId}
        status={part.status}
        error={part.error}
        icon={AbbrSql}
        title={t.toolCall.lspOperation}
        codeTitle={t.toolCall.lspOperation}
        code={rawOutput}
        language='json'
        preview={path ? t.toolCall.patternInPath(operation, path) : operation}
        copyText={rawOutput}
        isStreaming={isStreaming}
      />
    );
  },
);
