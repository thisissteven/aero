import { Terminal } from '@gravity-ui/icons';
import { memo } from 'react';

import { BaseTool } from '@/app/components/tool-call-view/tools/base-tool';
import { BashPart } from '@/app/components/tool-call-view/tools/tool-types';
import { formatToolOutput } from '@/app/lib/file-icons/tool-helpers';

export const BashToolView = memo(
  ({ part, blockId }: { part: BashPart; blockId: string }) => {
    const command = part.input.command ?? '';
    const rawOutput = formatToolOutput(part.output);
    return (
      <BaseTool
        blockId={blockId}
        status={part.status}
        error={part.error}
        duration={part.duration}
        icon={Terminal}
        title='Shell Command'
        codeTitle={command}
        code={rawOutput}
        language='bash'
        preview={command}
        copyText={command ? `$ ${command}\n\n${rawOutput}` : rawOutput}
        showLineNumbers={false}
      />
    );
  },
);
