import { Pencil } from '@gravity-ui/icons';
import { memo, useMemo } from 'react';

import { BaseTool } from '@/app/components/tool-call-view/tools/base-tool';
import { EditPart } from '@/app/components/tool-call-view/tools/tool-types';
import { getBasename, normalizePath } from '@/server/shared';

function getLineCount(str: string | undefined): number {
  if (!str) return 0;
  return str.split('\n').length;
}

/**
 * Human-readable diff text for the copy button. Not a valid unified diff —
 * just `-`/`+` prefixed lines for quick reading.
 */
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

/**
 * Builds a proper unified-diff patch string for Pierre's `PatchDiff`.
 *
 * Shape: `--- a/<file>` / `+++ b/<file>` / `@@ -a,N +b,M @@` / body. The
 * fragment is treated as the whole file, so line numbers start at 1 (or 0
 * when the side is empty), which is correct for a tool preview.
 */
function buildPatch(
  fileName: string,
  oldString: string = '',
  newString: string = '',
): string {
  const oldLines = oldString ? oldString.split('\n') : [];
  const newLines = newString ? newString.split('\n') : [];

  const oldCount = oldLines.length;
  const newCount = newLines.length;
  const oldStart = oldCount > 0 ? 1 : 0;
  const newStart = newCount > 0 ? 1 : 0;

  const body = [
    ...oldLines.map((line) => `-${line}`),
    ...newLines.map((line) => `+${line}`),
  ].join('\n');

  return [
    `--- a/${fileName}`,
    `+++ b/${fileName}`,
    `@@ -${oldStart},${oldCount} +${newStart},${newCount} @@`,
    body,
  ].join('\n');
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

    const { diff, code, patch } = useMemo(() => {
      const oldStr = part.input.oldString ?? '';
      const newStr = part.input.newString ?? '';

      const deletions = getLineCount(oldStr);
      const additions = getLineCount(newStr);

      const diffStats =
        additions > 0 || deletions > 0 ? { additions, deletions } : undefined;

      return {
        diff: diffStats,
        // Copy-friendly text — kept for clipboard / fallback rendering.
        code: generateDiffCode(oldStr, newStr),
        // Valid unified diff for Pierre's PatchDiff.
        patch: buildPatch(fileName, oldStr, newStr),
      };
    }, [fileName, part.input.oldString, part.input.newString]);

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
        patch={patch}
        copyText={code}
        isStreaming={isStreaming}
        dir={path}
        isFile
      />
    );
  },
);
