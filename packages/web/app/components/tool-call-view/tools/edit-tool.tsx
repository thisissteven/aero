import { Pencil } from '@gravity-ui/icons';
import { memo } from 'react';

import { BaseTool } from '@/app/components/tool-call-view/tools/base-tool';
import { EditPart } from '@/app/components/tool-call-view/tools/tool-types';
import { formatToolOutput } from '@/app/lib/file-icons/tool-helpers';

export const EditToolView = memo(
  ({ part, blockId }: { part: EditPart; blockId: string }) => {
    const path = part.input.path || part.input.filePath || '';
    const content = part.input.content || part.input.newText || '';
    const oldText = part.input.oldText;
    const rawOutput = formatToolOutput(part.output);

    const code =
      oldText && content
        ? `// --- REMOVE ---\n${oldText}\n\n// +++ ADD +++\n${content}`
        : content || rawOutput;

    return (
      <BaseTool
        blockId={blockId}
        status={part.status}
        error={part.error}
        icon={Pencil}
        title='Write File'
        codeTitle='Write File'
        code={code}
        language='diff'
        preview={path}
        previewType='path'
        copyText={code}
      />
    );
  },
);
