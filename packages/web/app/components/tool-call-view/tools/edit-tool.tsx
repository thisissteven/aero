import { Pencil } from '@gravity-ui/icons';
import { memo } from 'react';

import { BaseTool } from '@/app/components/tool-call-view/tools/base-tool';
import { EditPart } from '@/app/components/tool-call-view/tools/tool-types';

export const EditToolView = memo(
  ({
    part,
    blockId,
    isStreaming,
  }: {
    part: EditPart;
    blockId: string;
    isStreaming: boolean;
  }) => {
    const path = part.input.path || part.input.filePath || '';

    const additions = part.metadata?.filediff?.additions;
    const deletions = part.metadata?.filediff?.deletions;

    const diff =
      typeof additions === 'number' &&
      typeof deletions === 'number' &&
      (additions > 0 || deletions > 0)
        ? { additions, deletions }
        : undefined;

    return (
      <BaseTool
        blockId={blockId}
        status={part.status}
        error={part.error}
        icon={Pencil}
        title='Write File'
        codeTitle='Write File'
        language='diff'
        preview={path}
        previewType='path'
        diff={diff}
        code=''
        copyText=''
        isStreaming={isStreaming}
      />
    );
  },
);
