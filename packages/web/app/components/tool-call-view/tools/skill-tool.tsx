import { Book } from '@gravity-ui/icons';
import { memo } from 'react';

import { BaseTool } from '@/app/components/tool-call-view/tools/base-tool';
import { SkillPart } from '@/app/components/tool-call-view/tools/tool-types';
import { formatToolOutput } from '@/app/lib/file-icons/tool-helpers';

export const SkillToolView = memo(
  ({
    part,
    blockId,
    isStreaming,
  }: {
    part: SkillPart;
    blockId: string;
    isStreaming: boolean;
  }) => {
    const name = part.input.name || part.input.skill || '';
    const rawOutput = formatToolOutput(part.output);

    return (
      <BaseTool
        blockId={blockId}
        status={part.status}
        error={part.error}
        icon={Book}
        title='Load Skill'
        codeTitle={`Skill loaded: ${name}`}
        code={rawOutput}
        language='markdown'
        preview={name}
        copyText={rawOutput}
        isStreaming={isStreaming}
      />
    );
  },
);
