import { memo, useLayoutEffect, useMemo, useRef, useState } from 'react';

import {
  ChainOfThought,
  ChatMessage,
  ChatMessageActions,
  cn,
  Markdown,
  Skeleton,
} from '@aero/ui';

import { ToolCallView } from '@/components/tool-call-view';

import type { AeroMessage } from '../../server/services/harness/types';

export type ConversationItem =
  | { role: 'user'; messages: AeroMessage[] }
  | { role: 'assistant'; messages: AeroMessage[] };

function MessageSkeleton({ role }: { role: ConversationItem['role'] }) {
  if (role === 'user') {
    return (
      <div className='flex justify-end'>
        <Skeleton className='h-12 w-48 rounded-2xl' />
      </div>
    );
  }

  return (
    <div className='space-y-3'>
      <Skeleton className='h-4 w-3/4 rounded-lg' />
      <Skeleton className='h-4 w-1/2 rounded-lg' />
      <Skeleton className='h-4 w-2/3 rounded-lg' />
    </div>
  );
}

function UserChatBubble({ text }: { text: string }) {
  const [expanded, setExpanded] = useState(false);
  const [isOverflowing, setIsOverflowing] = useState(false);
  const textRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const el = textRef.current;
    if (!el) return;

    const lineHeight = parseFloat(getComputedStyle(el).lineHeight);
    const maxHeight = lineHeight * 3; // allow 3 lines before considering it overflow

    setIsOverflowing(el.scrollHeight > maxHeight);
  }, [text]);

  return (
    <ChatMessage.User>
      <ChatMessage.Bubble className='max-w-4/5'>
        <div className='relative'>
          <div
            ref={textRef}
            className={cn(
              'wrap-break-word',
              // while still clamping it to 2 lines
              !expanded && isOverflowing && 'line-clamp-2',
            )}
          >
            {text}
          </div>

          {isOverflowing && (
            <button
              className='text-muted text-xs opacity-80 transition hover:opacity-100'
              onClick={() => setExpanded((v) => !v)}
            >
              {expanded ? 'Show less' : 'Show more'}
            </button>
          )}
        </div>
      </ChatMessage.Bubble>
    </ChatMessage.User>
  );
}

// 1. Placeholder mock worktree file list
const MOCK_WORKTREE_FILES = new Set([
  'src/components/tool-call-view.tsx',
  'src/components/code-block.tsx',
  'package.json',
  'tsconfig.json',
  'README.md',
  'packages/ui/src/styles/globals.css',
]);

// 2. Placeholder file click handler
function openFileInEditor(path: string) {
  return path;
}

// Helper function to check if text resembles a filename in the worktree
const isWorktreeFile = (text: string): boolean => {
  const cleanText = text.trim();

  // Exact match against worktree
  if (MOCK_WORKTREE_FILES.has(cleanText)) return true;

  // Partial/suffix match (e.g. `tool-call-view.tsx` matching `src/components/tool-call-view.tsx`)
  for (const file of MOCK_WORKTREE_FILES) {
    if (file.endsWith(cleanText) || file.endsWith(`/${cleanText}`)) {
      return true;
    }
  }

  return false;
};

export const MessageView = memo(
  function MessageView({
    group,
    hidden,
  }: {
    group: ConversationItem;
    hidden?: boolean;
  }) {
    const messages = group.messages;

    const parts = messages.flatMap((message) => message.parts);

    if (hidden) {
      return <MessageSkeleton role={group.role} />;
    }

    if (group.role === 'user') {
      const text = parts
        .filter((part) => part.type === 'text')
        .map((part) => part.text)
        .join('');

      return <UserChatBubble text={text} />;
    }

    const baseKey = messages.map((m) => m.id).join('-');

    const copyText = useMemo(
      () =>
        parts
          .filter((part) => part.type === 'text')
          .map((part) => part.text.trim())
          .filter(Boolean)
          .join('\n\n')
          .replace(/\n{3,}/g, '\n\n')
          .trim(),
      [parts],
    );

    return (
      <ChatMessage.Assistant>
        <ChatMessage.Avatar
          className='max-xl:hidden'
          alt='Assistant'
          fallback='AI'
        />

        <ChatMessage.Body>
          <ChatMessage.Content>
            {parts.map((part, index) => {
              const blockId = `${baseKey}-part-${index}`;

              switch (part.type) {
                case 'text':
                  return (
                    <Markdown
                      id={blockId}
                      key={blockId}
                      isFile={(path) => isWorktreeFile(path)}
                      onFileClick={(path) => openFileInEditor(path)}
                    >
                      {part.text}
                    </Markdown>
                  );

                case 'reasoning':
                  return (
                    <ChainOfThought key={blockId}>
                      <ChainOfThought.Trigger className='text-xs'>
                        Reasoning
                      </ChainOfThought.Trigger>

                      <ChainOfThought.Content>
                        <ChainOfThought.Steps>
                          <ChainOfThought.Step>
                            <Markdown
                              id={`${blockId}-reason`}
                              isFile={(path) => isWorktreeFile(path)}
                              onFileClick={(path) => openFileInEditor(path)}
                            >
                              {part.text}
                            </Markdown>
                          </ChainOfThought.Step>
                        </ChainOfThought.Steps>
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

          <ChatMessageActions>
            <ChatMessageActions.Copy
              aria-label='Copy'
              tooltip='Copy'
              onPress={async () => {
                if (!copyText) return;

                await navigator.clipboard.writeText(copyText);
              }}
            />
            <ChatMessageActions.Regenerate
              aria-label='Regenerate'
              tooltip='Regenerate'
            />
          </ChatMessageActions>
        </ChatMessage.Body>
      </ChatMessage.Assistant>
    );
  },
  (prev, next) => {
    if (prev.hidden !== next.hidden) return false;

    if (prev.group.role !== next.group.role) return false;
    if (prev.group.messages.length !== next.group.messages.length) return false;

    return prev.group.messages.every((msg, idx) => {
      const nextMsg = next.group.messages[idx];

      return msg.id === nextMsg.id && msg.createdAt === nextMsg.createdAt;
    });
  },
);

MessageView.displayName = 'MessageView';
