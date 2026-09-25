import { Terminal } from '@gravity-ui/icons';
import { memo } from 'react';

import { BaseTool } from '@/app/components/tool-call-view/tools/base-tool';
import { BashPart } from '@/app/components/tool-call-view/tools/tool-types';
import { useI18n } from '@/app/hooks/i18n';
import { formatToolOutput } from '@/app/lib/file-icons/tool-helpers';

export const BashToolView = memo(
  ({
    part,
    blockId,
    isStreaming,
  }: {
    part: BashPart;
    blockId: string;
    isStreaming: boolean;
  }) => {
    const { t } = useI18n();
    const command = part.input.command ?? '';
    const rawOutput = formatToolOutput(part.output) || t.toolCall.noOutput;

    return (
      <BaseTool
        blockId={blockId}
        status={part.status}
        error={part.error}
        duration={part.duration}
        icon={Terminal}
        title={t.toolCall.shellCommand}
        codeTitle={command}
        code={rawOutput}
        language='bash'
        preview={command}
        copyText={command ? t.toolCall.bash(command, rawOutput) : rawOutput}
        showLineNumbers={false}
        isStreaming={isStreaming}
        useDuration
      />
    );
  },
);
