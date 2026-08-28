// assistant-part-view.tsx
import { memo } from 'react';

import { ChatMessage, Markdown } from '@aero/ui';

import { ReasoningBlock } from '@/app/components/message-view/reasoning-block';
import { ToolCallView } from '@/app/components/tool-call-view/tool-call-view';
import { AeroPart } from '@/server/services/harness/types';

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

export const AssistantPartView = memo(function AssistantPartView({
  turnId,
  part,
  partIndex,
  isPartStreaming,
}: {
  turnId: string;
  part: AeroPart;
  partIndex: number;
  isPartStreaming: boolean;
}) {
  const blockId = `${turnId}-part-${partIndex}`;

  switch (part.type) {
    case 'text': {
      return (
        <ChatMessage.Assistant className='group'>
          <ChatMessage.Body className='pe-0'>
            <ChatMessage.Content>
              <div className='relative min-h-[1.5rem]'>
                <Markdown
                  id={blockId}
                  isFile={handleIsWorktreeFile}
                  onFileClick={handleOpenFileInEditor}
                  streaming={isPartStreaming}
                >
                  {part.text}
                </Markdown>
              </div>
            </ChatMessage.Content>
          </ChatMessage.Body>
        </ChatMessage.Assistant>
      );
    }

    case 'reasoning': {
      return (
        <ChatMessage.Assistant className='group py-0'>
          <ChatMessage.Body className='pe-0'>
            <ChatMessage.Content>
              <div className='relative min-h-[2.5rem]'>
                <ReasoningBlock
                  blockId={blockId}
                  isFile={handleIsWorktreeFile}
                  onFileClick={handleOpenFileInEditor}
                  text={part.text}
                  isStreaming={isPartStreaming}
                />
              </div>
            </ChatMessage.Content>
          </ChatMessage.Body>
        </ChatMessage.Assistant>
      );
    }

    case 'tool':
      return (
        <ChatMessage.Assistant className='group py-0'>
          <ChatMessage.Body className='pe-0'>
            <ChatMessage.Content>
              <ToolCallView
                part={part}
                blockId={blockId}
                isStreaming={isPartStreaming}
              />
            </ChatMessage.Content>
          </ChatMessage.Body>
        </ChatMessage.Assistant>
      );

    default:
      return null;
  }
});
