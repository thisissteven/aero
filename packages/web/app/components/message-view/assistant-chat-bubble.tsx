import {
  Clock,
  CodeFork,
  Copy,
  Hourglass,
  Pin,
  Volume,
} from '@gravity-ui/icons';
import { Icon } from '@gravity-ui/uikit';
import { memo, useCallback, useMemo } from 'react';

import {
  ChainOfThought,
  ChatMessage,
  DisclosureIndicator,
  Markdown,
  ScrollShadow,
  Tooltip,
} from '@aero/ui';

import { DeferredView } from '@/app/components/deferred-view';
import { ToolCallView } from '@/app/components/tool-call-view';
import { formatDateTime } from '@/app/lib/date';
import { AeroConversationTurn } from '@/server/services/harness/types';

import { areTurnsEqual } from './lib';

const MOCK_WORKTREE_FILES = new Set([
  'src/components/tool-call-view.tsx',
  'src/components/code-block.tsx',
  'package.json',
  'tsconfig.json',
  'README.md',
  'packages/ui/src/styles/globals.css',
]);

const handleIsWorktreeFile = (cleanText: string): boolean => {
  const trimmed = cleanText.trim();
  if (MOCK_WORKTREE_FILES.has(trimmed)) return true;

  for (const file of MOCK_WORKTREE_FILES) {
    if (file.endsWith(trimmed)) return true;
  }
  return false;
};

const handleOpenFileInEditor = (path: string) => path;

export const AssistantChatBubble = memo(
  function AssistantChatBubble({ turn }: { turn: AeroConversationTurn }) {
    const parts = turn.parts;
    const baseKey = turn.id;

    const copyText = useMemo(() => {
      return parts
        .filter((part) => part.type === 'text')
        .map((part) => part.text.trim())
        .filter(Boolean)
        .join('\n\n')
        .replace(/\n{3,}/g, '\n\n')
        .trim();
    }, [parts]);

    const handleCopy = useCallback(async () => {
      if (!copyText) return;
      await navigator.clipboard.writeText(copyText);
    }, [copyText]);

    return (
      <ChatMessage.Assistant className='group'>
        <ChatMessage.Body className='pe-0!'>
          <ChatMessage.Content>
            {parts.map((part, index) => {
              const blockId = `${baseKey}-part-${index}`;

              switch (part.type) {
                case 'text':
                  if (!part.text) return null;
                  return (
                    <div key={blockId} className='py-2'>
                      <Markdown
                        id={blockId}
                        isFile={handleIsWorktreeFile}
                        onFileClick={handleOpenFileInEditor}
                      >
                        {part.text}
                      </Markdown>
                    </div>
                  );

                case 'reasoning':
                  return (
                    <ChainOfThought key={blockId}>
                      <ChainOfThought.Trigger
                        icon={
                          <div className='relative shrink-0'>
                            <DisclosureIndicator className='size-3 -rotate-90 opacity-0 transition group-hover/cot:opacity-100 data-[expanded=true]:rotate-0 data-[expanded=true]:opacity-100' />
                            <Icon
                              data={Hourglass}
                              className='absolute inset-0 transition group-hover/cot:opacity-0 group-has-[svg[data-expanded=true]]/cot:opacity-0'
                              style={{
                                width: 12,
                                height: 12,
                              }}
                            />
                          </div>
                        }
                        preview={part.text.slice(0, 150)}
                      >
                        <span className='text-foreground'>Thinking</span>
                      </ChainOfThought.Trigger>

                      <ChainOfThought.Content>
                        <ScrollShadow className='max-h-[40vh]' offset={2}>
                          <ChainOfThought.Steps>
                            <ChainOfThought.Step>
                              <DeferredView>
                                <Markdown
                                  id={`${blockId}-reason`}
                                  isFile={handleIsWorktreeFile}
                                  onFileClick={handleOpenFileInEditor}
                                >
                                  {part.text}
                                </Markdown>
                              </DeferredView>
                            </ChainOfThought.Step>
                          </ChainOfThought.Steps>
                        </ScrollShadow>
                      </ChainOfThought.Content>
                    </ChainOfThought>
                  );

                case 'tool':
                  return <ToolCallView key={blockId} part={part} />;

                default:
                  return null;
              }
            })}
          </ChatMessage.Content>
          <div className='flex w-full justify-start gap-3 pr-3 pb-3'>
            <div className='flex items-center gap-1 text-xs opacity-50'>
              <Icon data={Clock} size={12} />
              {formatDateTime(turn.createdAt)}
            </div>
            <Tooltip delay={300}>
              <Tooltip.Trigger>
                <Icon
                  data={Volume}
                  size={16}
                  className='opacity-50 transition hover:opacity-100'
                />
              </Tooltip.Trigger>

              <Tooltip.Content>
                <span>Read aloud</span>
              </Tooltip.Content>
            </Tooltip>
            <Tooltip delay={300}>
              <Tooltip.Trigger>
                <Icon
                  data={CodeFork}
                  size={16}
                  className='opacity-50 transition hover:opacity-100'
                />
              </Tooltip.Trigger>

              <Tooltip.Content>
                <span>Fork from here</span>
              </Tooltip.Content>
            </Tooltip>
            <Tooltip delay={300}>
              <Tooltip.Trigger>
                <Icon
                  data={Pin}
                  size={16}
                  className='opacity-50 transition hover:opacity-100'
                />
              </Tooltip.Trigger>

              <Tooltip.Content>
                <span>Pin into context (survives compaction)</span>
              </Tooltip.Content>
            </Tooltip>
            <Tooltip delay={300}>
              <Tooltip.Trigger>
                <Icon
                  data={Copy}
                  size={16}
                  className='opacity-50 transition hover:opacity-100'
                />
              </Tooltip.Trigger>

              <Tooltip.Content>
                <span>Copy message</span>
              </Tooltip.Content>
            </Tooltip>
          </div>
        </ChatMessage.Body>
      </ChatMessage.Assistant>
    );
  },
  (prev, next) => areTurnsEqual(prev, next),
);
