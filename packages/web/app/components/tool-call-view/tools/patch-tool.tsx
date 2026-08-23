import { FilePlus } from '@gravity-ui/icons';
import { memo } from 'react';

import { BaseTool } from '@/app/components/tool-call-view/tools/base-tool';
import { PatchPart } from '@/app/components/tool-call-view/tools/tool-types';
import { formatToolOutput } from '@/app/lib/file-icons/tool-helpers';

export const PatchToolView = memo(
  ({ part, blockId }: { part: PatchPart; blockId: string }) => {
    const rawOutput = formatToolOutput(part.output);
    const patchText = part.input.patchText || rawOutput;
    const preview =
      patchText.match(/^diff --git a\/(.+?) b\/(.+)$/m)?.[2] ?? 'Patch';

    return (
      <BaseTool
        blockId={blockId}
        status={part.status}
        error={part.error}
        icon={FilePlus}
        title='Apply Patch'
        codeTitle='Apply Patch'
        code={patchText}
        language='diff'
        preview={preview}
        copyText={patchText}
      />
    );
  },
);
