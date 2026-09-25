import { Bars } from '@gravity-ui/icons';
import { memo } from 'react';

import { BaseTool } from '@/app/components/tool-call-view/tools/base-tool';
import { SearchPart } from '@/app/components/tool-call-view/tools/tool-types';
import { useI18n } from '@/app/hooks/i18n';
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
    const { t } = useI18n();
    const pattern = part.input.pattern || part.input.query || '';
    const path = part.input.path;
    const rawOutput = formatToolOutput(part.output);

    return (
      <BaseTool
        blockId={blockId}
        status={part.status}
        error={part.error}
        icon={Bars}
        title={t.toolCall.searchFiles}
        codeTitle={t.toolCall.pattern(pattern)}
        code={rawOutput}
        language='log'
        preview={path ? t.toolCall.patternInPath(pattern, path) : pattern}
        copyText={rawOutput}
        showLineNumbers={false}
        isStreaming={isStreaming}
        isItalicHeader
      />
    );
  },
);
