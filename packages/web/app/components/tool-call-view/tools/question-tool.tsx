import { FileQuestion } from '@gravity-ui/icons';
import { memo } from 'react';

import { BaseTool } from '@/app/components/tool-call-view/tools/base-tool';
import { QuestionPart } from '@/app/components/tool-call-view/tools/tool-types';
import { formatToolOutput } from '@/app/lib/file-icons/tool-helpers';

export const QuestionToolView = memo(
  ({ part, blockId }: { part: QuestionPart; blockId: string }) => {
    const questionText = part.input.question || '';
    const rawOutput = formatToolOutput(part.output);

    return (
      <BaseTool
        blockId={blockId}
        status={part.status}
        error={part.error}
        icon={FileQuestion}
        title='Question'
        codeTitle='Question'
        code={rawOutput}
        language='markdown'
        preview={questionText}
        copyText={
          questionText
            ? `Q: ${questionText}\n\nAnswer:\n${rawOutput}`
            : rawOutput
        }
      />
    );
  },
);
