import { FilePlus } from '@gravity-ui/icons';
import { memo } from 'react';

import { BaseTool } from '@/app/components/tool-call-view/tools/base-tool';
import { PatchPart } from '@/app/components/tool-call-view/tools/tool-types';
import { useI18n } from '@/app/hooks/i18n';
import { formatToolOutput } from '@/app/lib/file-icons/tool-helpers';

export const PatchToolView = memo(
  ({
    part,
    blockId,
    isStreaming,
  }: {
    part: PatchPart;
    blockId: string;
    isStreaming: boolean;
  }) => {
    const { t } = useI18n();
    const rawOutput = formatToolOutput(part.output);
    const patchText = part.input.patchText || rawOutput;
    const preview =
      patchText.match(/^diff --git a\/(.+?) b\/(.+)$/m)?.[2] ??
      t.toolCall.patch;

    return (
      <BaseTool
        blockId={blockId}
        status={part.status}
        error={part.error}
        icon={FilePlus}
        title={t.toolCall.applyPatch}
        codeTitle={t.toolCall.applyPatch}
        code={patchText}
        language='diff'
        preview={preview}
        copyText={patchText}
        isStreaming={isStreaming}
      />
    );
  },
);
