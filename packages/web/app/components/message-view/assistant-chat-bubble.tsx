import { Clock, CodeFork, Pin, Volume } from '@gravity-ui/icons';
import { Icon } from '@gravity-ui/uikit';
import { memo, useMemo } from 'react';

import { ChatMessage, Markdown, Tooltip } from '@aero/ui';

import { MessageActionsCopy } from '@/app/components/message-view/message-actions';
import { ReasoningBlock } from '@/app/components/message-view/reasoning-block';
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

    return (
      <ChatMessage.Assistant className='group'>
        <ChatMessage.Body className='pe-0'>
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
                    <ReasoningBlock
                      key={blockId}
                      blockId={blockId}
                      isFile={handleIsWorktreeFile}
                      onFileClick={handleOpenFileInEditor}
                      text={part.text}
                    />
                  );

                case 'tool':
                  return <ToolCallView key={blockId} part={part} />;

                default:
                  return null;
              }
            })}
          </ChatMessage.Content>
          <div className='flex w-full justify-start gap-3 pr-3 pb-3'>
            <div className='text-muted flex items-center gap-1 text-xs opacity-100'>
              <Icon data={Clock} size={12} className='opacity-80' />
              {formatDateTime(turn.createdAt)}
            </div>
            <Tooltip delay={300}>
              <Tooltip.Trigger>
                <Icon
                  data={Volume}
                  size={16}
                  className='opacity-50 transition hover:opacity-80'
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
                  className='opacity-50 transition hover:opacity-80'
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
                  className='opacity-50 transition hover:opacity-80'
                />
              </Tooltip.Trigger>

              <Tooltip.Content>
                <span>Pin into context (survives compaction)</span>
              </Tooltip.Content>
            </Tooltip>
            <MessageActionsCopy copyText={copyText} />
          </div>
        </ChatMessage.Body>
      </ChatMessage.Assistant>
    );
  },
  (prev, next) => areTurnsEqual(prev, next),
);
