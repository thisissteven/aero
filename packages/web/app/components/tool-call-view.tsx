import { memo, useMemo } from 'react';

import { Disclosure } from '@aero/ui';

import type { AeroPart } from '../../server/services/harness/types';

function formatOutput(output: unknown): string {
  if (typeof output === 'string') return output;
  if (!output) return '';
  return JSON.stringify(output, null, 2);
}

function getInputField(input: unknown, key: string): string {
  if (typeof input === 'object' && input !== null && key in input) {
    return String((input as Record<string, unknown>)[key]);
  }
  return '';
}

export const ToolCallView = memo(
  function ToolCallView({
    part,
  }: {
    part: Extract<AeroPart, { type: 'tool' }>;
  }) {
    const { toolName, input, output, status } = part;
    const isCompleted = status === 'completed';

    const toolContent = useMemo(() => {
      const rawOutput = formatOutput(output);

      switch (toolName) {
        case 'bash': {
          const command = getInputField(input, 'command');
          return {
            title: command ? `bash: ${command}` : 'bash',
            code: rawOutput,
            language: 'bash',
            copyText: command ? `$ ${command}\n\n${rawOutput}` : rawOutput,
          };
        }

        case 'edit':
        case 'write': {
          const path =
            getInputField(input, 'path') || getInputField(input, 'filePath');
          const content =
            getInputField(input, 'content') || getInputField(input, 'newText');
          const oldText = getInputField(input, 'oldText');

          let code = '';
          if (oldText && content) {
            code = `// --- REMOVE ---\n${oldText}\n\n// +++ ADD +++\n${content}`;
          } else {
            code = content || rawOutput;
          }

          return {
            title: `${toolName}: ${path}`,
            code,
            language: 'diff',
            copyText: code,
          };
        }

        case 'apply_patch': {
          const patchText = getInputField(input, 'patchText') || rawOutput;
          return {
            title: 'apply_patch',
            code: patchText,
            language: 'diff',
            copyText: patchText,
          };
        }

        case 'read': {
          const path =
            getInputField(input, 'path') || getInputField(input, 'filePath');
          return {
            title: path ? `read: ${path}` : 'read',
            code: rawOutput,
            language: path ? path.split('.').pop() || 'text' : 'text',
            copyText: rawOutput,
          };
        }

        case 'grep': {
          const pattern =
            getInputField(input, 'pattern') || getInputField(input, 'query');
          const path = getInputField(input, 'path');
          return {
            title: pattern
              ? `grep "${pattern}"${path ? ` in ${path}` : ''}`
              : 'grep',
            code: rawOutput,
            language: 'log',
            copyText: rawOutput,
          };
        }

        case 'glob': {
          const pattern = getInputField(input, 'pattern');
          return {
            title: pattern ? `glob: ${pattern}` : 'glob',
            code: rawOutput,
            language: 'text',
            copyText: rawOutput,
          };
        }

        case 'lsp': {
          const operation = getInputField(input, 'operation');
          const path = getInputField(input, 'path');
          return {
            title: `lsp (${operation})${path ? `: ${path}` : ''}`,
            code: rawOutput,
            language: 'json',
            copyText: rawOutput,
          };
        }

        case 'skill': {
          const name =
            getInputField(input, 'name') || getInputField(input, 'skill');
          return {
            title: `skill: ${name}`,
            code: rawOutput,
            language: 'markdown',
            copyText: rawOutput,
          };
        }

        case 'webfetch': {
          const url = getInputField(input, 'url');
          return {
            title: url ? `webfetch: ${url}` : 'webfetch',
            code: rawOutput,
            language: 'markdown',
            copyText: rawOutput,
          };
        }

        case 'websearch': {
          const query = getInputField(input, 'query');
          return {
            title: query ? `websearch: "${query}"` : 'websearch',
            code: rawOutput,
            language: 'json',
            copyText: rawOutput,
          };
        }

        case 'question': {
          const header = getInputField(input, 'header');
          const questionText = getInputField(input, 'question');
          return {
            title: header ? `question: ${header}` : 'question',
            code: rawOutput,
            language: 'markdown',
            copyText: questionText
              ? `Q: ${questionText}\n\nAnswer:\n${rawOutput}`
              : rawOutput,
          };
        }

        case 'todowrite': {
          const todos =
            typeof input === 'object' && input !== null && 'todos' in input
              ? JSON.stringify(
                  (input as Record<string, unknown>).todos,
                  null,
                  2,
                )
              : rawOutput;
          return {
            title: 'todowrite',
            code: todos,
            language: 'json',
            copyText: todos,
          };
        }

        default: {
          return {
            title: toolName,
            code: rawOutput,
            language: 'json',
            copyText: `// Input:\n${
              typeof input === 'string' ? input : JSON.stringify(input, null, 2)
            }\n\n// Output:\n${rawOutput}`,
          };
        }
      }
    }, [toolName, input, output]);

    return (
      <div className='my-3'>
        <Disclosure defaultExpanded={false}>
          <Disclosure.Heading>
            <Disclosure.Trigger
              className='flex w-full items-center justify-between border px-3 py-2 font-mono text-xs transition-colors'
              style={{
                backgroundColor: 'var(--surface-secondary)',
                color: 'var(--muted)',
                borderColor: 'var(--border)',
                borderRadius: 'var(--radius)',
              }}
            >
              <span className='flex items-center gap-2 truncate'>
                <span>{toolContent.title}</span>
                <span>{isCompleted ? '✓' : '⏳'}</span>
              </span>
              <Disclosure.Indicator />
            </Disclosure.Trigger>
          </Disclosure.Heading>

          <Disclosure.Content className='mt-2'>
            <div>{`${part.input}${part.output}`}</div>
            {/* <DeferredView
              fallback={
                <pre className='bg-muted p-4 font-mono text-xs'>
                  {toolContent.code}
                </pre>
              }
            >
              <CodeBlock>
                <CodeBlock.Header>
                  <div className='text-muted min-w-0 font-mono text-xs break-all'>
                    {toolContent.title}
                  </div>
                  <CodeBlock.CopyButton
                    code={toolContent.copyText}
                    className='shrink-0'
                  />
                </CodeBlock.Header>
                <CodeBlock.Code
                  code={toolContent.code}
                  language={toolContent.language}
                  scrollOverflow
                />
              </CodeBlock>
            </DeferredView> */}
          </Disclosure.Content>
        </Disclosure>
      </div>
    );
  },
  (prev, next) =>
    prev.part.status === next.part.status &&
    prev.part.output === next.part.output &&
    prev.part.input === next.part.input,
);

ToolCallView.displayName = 'ToolCallView';
