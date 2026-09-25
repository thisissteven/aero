import { FileMagnifier } from '@gravity-ui/icons';
import { memo } from 'react';

import { BaseTool } from '@/app/components/tool-call-view/tools/base-tool';
import { GlobPart } from '@/app/components/tool-call-view/tools/tool-types';
import { useI18n } from '@/app/hooks/i18n';
import { formatToolOutput } from '@/app/lib/file-icons/tool-helpers';

export const GlobToolView = memo(
  ({
    part,
    blockId,
    isStreaming,
  }: {
    part: GlobPart;
    blockId: string;
    isStreaming: boolean;
  }) => {
    const { t } = useI18n();
    const pattern = part.input.pattern || '';
    const rawOutput = formatToolOutput(part.output);

    return (
      <BaseTool
        blockId={blockId}
        status={part.status}
        error={part.error}
        icon={FileMagnifier}
        title={t.toolCall.findFiles}
        codeTitle={t.toolCall.pattern(pattern)}
        code={rawOutput}
        language='text'
        preview={pattern}
        copyText={rawOutput}
        isStreaming={isStreaming}
        isItalicHeader
      />
    );
  },
);
