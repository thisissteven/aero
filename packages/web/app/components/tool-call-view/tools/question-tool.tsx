import { FileQuestion } from '@gravity-ui/icons';
import { memo, useMemo } from 'react';

import { BaseTool } from '@/app/components/tool-call-view/tools/base-tool';
import { QuestionPart } from '@/app/components/tool-call-view/tools/tool-types';
import { formatToolOutput } from '@/app/lib/file-icons/tool-helpers';

export const QuestionToolView = memo(
  ({
    part,
    blockId,
    isStreaming,
  }: {
    part: QuestionPart;
    blockId: string;
    isStreaming: boolean;
  }) => {
    // 1. Extract questions and answers
    const questions = part.input?.questions || [];
    const answers = part.metadata?.answers || [];

    // 2. Format into (Question)\n(Answer)\n\n structure
    const formattedMarkdown = useMemo(() => {
      if (!questions.length) {
        return formatToolOutput(part.output);
      }

      return questions
        .map((q, index) => {
          // Extract answer from metadata if available, or fallback to parsing part.output
          const answerList = answers[index];
          const answerText = Array.isArray(answerList)
            ? answerList.join(', ')
            : answerList || 'No answer provided';

          return `Q: ${q.question}\n> ANSWER: ${answerText}`;
        })
        .join('\n\n');
    }, [questions, answers, part.output]);

    const previewText = questions.map((q) => q.question).join('\n') || '';

    const title = `Asked ${questions.length} question${questions.length > 1 ? 's' : ''}`;

    return (
      <BaseTool
        blockId={blockId}
        status={part.status}
        error={part.error}
        icon={FileQuestion}
        title={title}
        codeTitle='Questions'
        code={formattedMarkdown}
        language='markdown'
        preview={previewText}
        copyText={formattedMarkdown}
        isStreaming={isStreaming}
      />
    );
  },
);
