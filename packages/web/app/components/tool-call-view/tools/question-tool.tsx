import { FileQuestion } from '@gravity-ui/icons';
import { memo, useMemo } from 'react';

import { BaseTool } from '@/app/components/tool-call-view/tools/base-tool';
import { QuestionPart } from '@/app/components/tool-call-view/tools/tool-types';
import { formatToolOutput } from '@/app/lib/file-icons/tool-helpers';

/**
 * Parses tool output like:
 * 'User has answered your questions: "What's your favorite food?"="Sushi", "What's your favorite activity?"="Reading, Hiking".'
 * into a key-value Map of question -> answer string.
 */
function parseOutputAnswers(output?: string): Map<string, string> {
  const answerMap = new Map<string, string>();
  if (!output || typeof output !== 'string') return answerMap;

  // Matches pattern: "Question text"="Answer text"
  const regex = /"([^"]+)"\s*=\s*"([^"]+)"/g;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(output)) !== null) {
    const [, question, answer] = match;
    answerMap.set(question.trim(), answer.trim());
  }

  return answerMap;
}

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
    // 1. Extract questions, metadata answers, and raw output safely
    const questions = part.input?.questions || [];
    const metadataAnswers = part.metadata?.answers || [];
    const output = part.output;
    const status = part.status;
    const error = part.error;

    // 2. Format into (Question)\n(Answer)\n\n structure
    const formattedMarkdown = useMemo(() => {
      if (!questions.length) {
        return formatToolOutput(output);
      }

      // Parse output string fallback
      const parsedAnswersMap = parseOutputAnswers(output);

      return questions
        .map((q, index) => {
          let answerText = 'No answer provided';

          // Strategy A: Metadata answers array
          const metaAnswer = metadataAnswers[index];
          if (Array.isArray(metaAnswer) && metaAnswer.length > 0) {
            answerText = metaAnswer.join(', ');
          }
          // Strategy B: Parse from raw output string using full question text
          else if (parsedAnswersMap.has(q.question)) {
            answerText = parsedAnswersMap.get(q.question)!;
          }

          return `Q: ${q.question}\n> ANSWER: ${answerText}`;
        })
        .join('\n\n');
    }, [questions, metadataAnswers, output]);

    const previewText = questions.map((q) => q.question).join('\n') || '';
    const title = `Asked ${questions.length} question${questions.length > 1 ? 's' : ''}`;

    return (
      <BaseTool
        blockId={blockId}
        status={status}
        error={error}
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

QuestionToolView.displayName = 'QuestionToolView';
