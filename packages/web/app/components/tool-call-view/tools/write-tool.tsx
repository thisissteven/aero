import { Pencil } from '@gravity-ui/icons';
import { memo, useMemo } from 'react';

import { BaseTool } from '@/app/components/tool-call-view/tools/base-tool';
import { WritePart } from '@/app/components/tool-call-view/tools/tool-types';
import { getBasename, normalizePath } from '@/server/shared';

export const WriteToolView = memo(
  ({
    part,
    blockId,
    isStreaming,
  }: {
    part: WritePart;
    blockId: string;
    isStreaming: boolean;
  }) => {
    const path = normalizePath(part.input.filePath || '');
    const fileName = getBasename(path);

    const { diff, code } = useMemo(() => {
      const content = part.input.content ?? '';

      if (!content) {
        return { diff: undefined, code: '' };
      }

      const lines = content.split('\n');
      const additions = lines.length;

      // Add '+' prefix to every line for standard diff syntax highlighting
      const formattedDiffCode = lines.map((line) => `+ ${line}`).join('\n');

      return {
        diff: { additions, deletions: 0 },
        code: formattedDiffCode,
      };
    }, [part.input.content]);

    return (
      <BaseTool
        blockId={blockId}
        status={part.status}
        error={part.error}
        icon={Pencil}
        title='Write File'
        codeTitle={path}
        language='diff'
        preview={fileName}
        previewType='path'
        diff={diff}
        code={code}
        copyText={part.input.content ?? ''}
        isStreaming={isStreaming}
      />
    );
  },
);
