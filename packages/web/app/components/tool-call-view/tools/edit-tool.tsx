import { Pencil } from '@gravity-ui/icons';
import { memo, useMemo } from 'react';

import { BaseTool } from '@/app/components/tool-call-view/tools/base-tool';
import { EditPart } from '@/app/components/tool-call-view/tools/tool-types';
import { getBasename, normalizePath } from '@/server/shared';

function getLineCount(str: string | undefined): number {
  if (!str) return 0;
  return str.split('\n').length;
}

function generateDiffCode(
  oldString: string = '',
  newString: string = '',
): string {
  const oldLines = oldString
    ? oldString.split('\n').map((line) => `- ${line}`)
    : [];
  const newLines = newString
    ? newString.split('\n').map((line) => `+ ${line}`)
    : [];
  return [...oldLines, ...newLines].join('\n');
}

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
    const path = normalizePath(part.input.filePath || '');
    const fileName = getBasename(path);

    const { diff, code } = useMemo(() => {
      const oldStr = part.input.oldString ?? '';
      const newStr = part.input.newString ?? '';

      const deletions = getLineCount(oldStr);
      const additions = getLineCount(newStr);

      const diffStats =
        additions > 0 || deletions > 0 ? { additions, deletions } : undefined;

      const diffCode = generateDiffCode(oldStr, newStr);

      return { diff: diffStats, code: diffCode };
    }, [part.input.oldString, part.input.newString]);

    return (
      <BaseTool
        blockId={blockId}
        status={part.status}
        error={part.error}
        icon={Pencil}
        title='Edit File'
        codeTitle={path}
        language='diff'
        preview={fileName}
        previewType='path'
        diff={diff}
        code={code}
        copyText={code}
        isStreaming={isStreaming}
      />
    );
  },
);
