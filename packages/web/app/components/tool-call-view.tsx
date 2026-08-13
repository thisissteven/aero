import {
  AbbrSql,
  Bars,
  Book,
  FileMagnifier,
  FilePlus,
  FileQuestion,
  FileText,
  Globe,
  ListCheck,
  Pencil,
  Terminal,
  Wrench,
} from '@gravity-ui/icons';
import { Icon } from '@gravity-ui/uikit';
import { memo, useMemo } from 'react';

import {
  AdaptiveCodeBlockCode,
  Alert,
  cn,
  CodeBlock,
  Disclosure,
} from '@aero/ui';

import { DeferredView } from '@/app/components/deferred-view';
import { FileTypeIcon } from '@/app/components/file-type-icon';
import { toTitleCase } from '@/app/lib/file';

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
    const { toolName, input, output, status, error, duration } = part;

    const toolContent = useMemo(() => {
      const rawOutput = formatOutput(output);

      switch (toolName) {
        case 'bash': {
          const command = getInputField(input, 'command');
          return {
            iconData: Terminal,
            title: 'Shell Command',
            codeTitle: command,
            code: rawOutput,
            language: 'bash',
            preview: command,
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
            iconData: Pencil,
            title: 'Write File',
            codeTitle: 'Write File',
            code,
            language: 'diff',
            copyText: code,
            preview: path,
          };
        }

        case 'apply_patch': {
          const patchText = getInputField(input, 'patchText') || rawOutput;

          return {
            iconData: FilePlus,
            title: 'Apply Patch',
            codeTitle: 'Apply Patch',
            code: patchText,
            language: 'diff',
            copyText: patchText,
            preview:
              patchText.match(/^diff --git a\/(.+?) b\/(.+)$/m)?.[2] ?? 'Patch',
          };
        }

        case 'grep': {
          const pattern =
            getInputField(input, 'pattern') || getInputField(input, 'query');
          const path = getInputField(input, 'path');

          return {
            iconData: Bars,
            title: 'Search Files',
            codeTitle: `Pattern: ${pattern}`,
            code: rawOutput,
            language: 'log',
            copyText: rawOutput,
            preview: path ? `${pattern} in ${path}` : pattern,
          };
        }

        case 'glob': {
          const pattern = getInputField(input, 'pattern');

          return {
            iconData: FileMagnifier,
            title: 'Find Files',
            codeTitle: `Pattern: ${pattern}`,
            code: rawOutput,
            language: 'text',
            copyText: rawOutput,
            preview: pattern,
          };
        }

        case 'lsp': {
          const operation = getInputField(input, 'operation');
          const path = getInputField(input, 'path');

          return {
            iconData: AbbrSql,
            title: 'LSP Operation',
            codeTitle: 'LSP Operation',
            code: rawOutput,
            language: 'json',
            copyText: rawOutput,
            preview: path ? `${operation} ${path}` : operation,
          };
        }

        case 'skill': {
          const name =
            getInputField(input, 'name') || getInputField(input, 'skill');

          return {
            iconData: Book,
            title: 'Load Skill',
            codeTitle: 'Load Skill',
            code: rawOutput,
            language: 'markdown',
            copyText: rawOutput,
            preview: name,
          };
        }

        case 'webfetch': {
          const url = getInputField(input, 'url');

          return {
            iconData: Globe,
            title: 'Web Fetch',
            codeTitle: 'Web Fetch',
            code: rawOutput,
            language: 'markdown',
            copyText: rawOutput,
            preview: url,
          };
        }

        case 'websearch': {
          const query = getInputField(input, 'query');

          return {
            iconData: Globe,
            title: 'Web Search',
            codeTitle: 'Web Search',
            code: rawOutput,
            language: 'json',
            copyText: rawOutput,
            preview: query,
          };
        }

        case 'question': {
          const questionText = getInputField(input, 'question');

          return {
            iconData: FileQuestion,
            title: 'Question',
            codeTitle: 'Question',
            code: rawOutput,
            language: 'markdown',
            copyText: questionText
              ? `Q: ${questionText}\n\nAnswer:\n${rawOutput}`
              : rawOutput,
            preview: questionText,
          };
        }

        case 'todowrite': {
          const todoValue =
            typeof input === 'object' && input !== null && 'todos' in input
              ? (input as Record<string, unknown>).todos
              : [];

          const todos = JSON.stringify(todoValue, null, 2);

          return {
            iconData: ListCheck,
            title: 'Update To do List',
            codeTitle: 'Update To do List',
            code: todos,
            language: 'json',
            copyText: todos,
            preview: Array.isArray(todoValue)
              ? `${todoValue.length} tasks`
              : 'Update tasks',
          };
        }

        case 'read': {
          const path =
            getInputField(input, 'path') || getInputField(input, 'filePath');

          return {
            iconData: FileText,
            title: 'Read File',
            codeTitle: 'Read File',
            language: 'json',
            preview: path,
          };
        }

        default: {
          return {
            iconData: Wrench,
            title: toTitleCase(toolName),
            codeTitle: toTitleCase(toolName),
            code: rawOutput,
            language: 'json',
            copyText: `// Input:\n${
              typeof input === 'string' ? input : JSON.stringify(input, null, 2)
            }\n\n// Output:\n${rawOutput}`,
            preview: undefined,
          };
        }
      }
    }, [toolName, input, output]);

    const hasContent = toolContent.copyText && toolContent.code;

    return (
      <Disclosure defaultExpanded={false}>
        <Disclosure.Heading>
          <Disclosure.Trigger
            className={cn(
              'group/tool -mb-2 flex h-10 w-full! min-w-0 disabled:opacity-100',
              status === 'error' && 'text-danger',
              status === 'completed' && 'text-muted/70',
            )}
            isDisabled={!hasContent && !error}
          >
            <div className='flex min-w-0 flex-1 items-center gap-2'>
              <div className='relative shrink-0'>
                <Disclosure.Indicator className='size-3 -rotate-90 opacity-0 transition group-hover/tool:opacity-100 data-[expanded=true]:rotate-0 data-[expanded=true]:opacity-100' />
                <Icon
                  data={toolContent.iconData}
                  className='absolute inset-0 transition group-hover/tool:opacity-0 group-has-[svg[data-expanded=true]]/tool:opacity-0'
                  style={{
                    width: 12,
                    height: 12,
                  }}
                />
              </div>
              <span className='flex items-center justify-start gap-2 truncate'>
                <span
                  className={cn(
                    status === 'error' && 'text-danger',
                    status === 'completed' && 'text-foreground',
                  )}
                >
                  {toolContent.title}
                </span>
                {toolName === 'read' && toolContent.preview && (
                  <FileTypeIcon filePath={toolContent.preview} />
                )}
                {duration && toolName === 'bash' && (
                  <span className='text-muted/70'>{duration}s</span>
                )}
                <p
                  className={cn(
                    'text-muted/70 flex-1 truncate text-left transition-opacity group-has-[svg[data-expanded=true]]/tool:opacity-0',

                    // 'max-w-4/5 min-w-[200px]'
                  )}
                >
                  {toolContent.preview}
                </p>
              </span>
            </div>
          </Disclosure.Trigger>
        </Disclosure.Heading>

        <Disclosure.Content className='mt-2 pl-0'>
          <DeferredView>
            <div className='border-default ml-2 border-l pl-5'>
              {error && (
                <div>
                  <div className='text-muted/70 pt-2 text-xs'>
                    {toolContent.preview}
                  </div>
                  <Alert
                    status='danger'
                    className='bg-transparent p-0 pt-4 shadow-none'
                  >
                    <Alert.Content>
                      <Alert.Description className='text-danger'>
                        {error}
                      </Alert.Description>
                    </Alert.Content>
                  </Alert>
                </div>
              )}
              {hasContent && (
                <CodeBlock className='bg-transparent'>
                  <CodeBlock.Header>
                    <div
                      className={cn(
                        'text-muted min-w-0 font-mono text-xs break-all',
                        toolName === 'glob' && 'italic',
                        toolName === 'grep' && 'italic',
                      )}
                    >
                      {toolContent.codeTitle}
                    </div>
                    <CodeBlock.CopyButton
                      code={toolContent.copyText}
                      className='shrink-0'
                    />
                  </CodeBlock.Header>
                  <AdaptiveCodeBlockCode
                    code={toolContent.code}
                    language={toolContent.language}
                    scrollOverflow={toolContent.code.includes('\n')}
                    showLineNumbers={toolName === 'bash' ? false : true}
                  />
                </CodeBlock>
              )}
            </div>
          </DeferredView>
        </Disclosure.Content>
      </Disclosure>
    );
  },
  (prev, next) => prev.part.id === next.part.id,
  // prev.part.status === next.part.status &&
  // prev.part.output === next.part.output &&
  // prev.part.input === next.part.input,
);

ToolCallView.displayName = 'ToolCallView';
