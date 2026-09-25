import { Pencil } from '@gravity-ui/icons';
import { memo, useMemo } from 'react';

import { BaseTool } from '@/app/components/tool-call-view/tools/base-tool';
import { WritePart } from '@/app/components/tool-call-view/tools/tool-types';
import { useI18n } from '@/app/hooks/i18n';
import { getBasename, normalizePath } from '@/server/shared';

/**
 * Human-readable diff text for the copy button. Not a valid unified diff —
 * just `+` prefixed lines for quick reading.
 */
function generateDiffCode(content: string): string {
  if (!content) return '';
  return content
    .split('\n')
    .map((line) => `+ ${line}`)
    .join('\n');
}

/**
 * Builds a unified-diff patch string for Pierre's `PatchDiff`. A write is a
 * pure addition, so the old side is `/dev/null` with a `0,0` range — the
 * canonical "new file" shape that both `git diff` and Pierre's parser accept.
 */
function buildPatch(fileName: string, content: string): string {
  const lines = content ? content.split('\n') : [];
  const count = lines.length;
  const body = lines.map((line) => `+${line}`).join('\n');

  return [
    '--- /dev/null',
    `+++ b/${fileName}`,
    `@@ -0,0 +1,${count} @@`,
    body,
  ].join('\n');
}

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
    const { t } = useI18n();
    const path = normalizePath(part.input.filePath || '');
    const fileName = getBasename(path);

    const { diff, code, patch } = useMemo(() => {
      const content = part.input.content ?? '';

      if (!content) {
        return { diff: undefined, code: '', patch: undefined };
      }

      const additions = content.split('\n').length;

      return {
        diff: { additions, deletions: 0 },
        // Copy-friendly text — kept for clipboard / fallback rendering.
        code: generateDiffCode(content),
        // Valid unified diff for Pierre's PatchDiff.
        patch: buildPatch(fileName, content),
      };
    }, [fileName, part.input.content]);

    return (
      <BaseTool
        blockId={blockId}
        status={part.status}
        error={part.error}
        icon={Pencil}
        title={t.toolCall.writeFile}
        codeTitle={path}
        language='diff'
        preview={fileName}
        previewType='path'
        diff={diff}
        code={code}
        patch={patch}
        copyText={part.input.content ?? ''}
        isStreaming={isStreaming}
        dir={path}
        isFile
      />
    );
  },
);
