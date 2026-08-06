import {
  memo,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import {
  ChainOfThought,
  ChatMessage,
  ChatMessageActions,
  cn,
  Markdown,
} from '@aero/ui';

import { DeferredView } from '@/app/components/deferred-view';
import { ToolCallView } from '@/app/components/tool-call-view';
import { AeroConversationTurn } from '@/server/services/harness/types';

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

const UserChatBubble = memo(function UserChatBubble({
  text,
}: {
  text: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const [isOverflowing, setIsOverflowing] = useState(false);

  const bubbleRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLDivElement>(null);
  const shouldScrollOnCollapseRef = useRef(false);

  useEffect(() => {
    const el = textRef.current;
    if (!el) return;
    setIsOverflowing(el.scrollHeight > 72);
  }, [text]);

  const handleToggle = () => {
    if (expanded) {
      shouldScrollOnCollapseRef.current = true;
    }
    setExpanded((prev) => !prev);
  };

  useLayoutEffect(() => {
    if (!shouldScrollOnCollapseRef.current || expanded || !bubbleRef.current)
      return;

    shouldScrollOnCollapseRef.current = false;

    const bubbleEl = bubbleRef.current;
    const scrollContainer = bubbleEl.closest<HTMLElement>('.overflow-y-auto');

    if (scrollContainer) {
      // Offset from the top edge of the scroll viewport (e.g. 40px padding)
      const topOffset = 40;

      const containerRect = scrollContainer.getBoundingClientRect();
      const bubbleRect = bubbleEl.getBoundingClientRect();

      // Calculate exact scroll delta needed
      const targetScrollTop =
        scrollContainer.scrollTop +
        (bubbleRect.top - containerRect.top) -
        topOffset;

      scrollContainer.scrollTo({
        top: Math.max(0, targetScrollTop),
        behavior: 'instant',
      });
    } else {
      bubbleEl.scrollIntoView({ behavior: 'instant', block: 'start' });
    }
  }, [expanded]);

  return (
    <ChatMessage.User ref={bubbleRef}>
      <ChatMessage.Bubble className='max-w-4/5'>
        <div className='relative'>
          <div
            ref={textRef}
            className={cn(
              'wrap-break-word',
              !expanded && isOverflowing && 'line-clamp-2',
            )}
          >
            {text}
          </div>

          {isOverflowing && (
            <button
              className='text-muted mt-1 text-xs opacity-80 transition hover:opacity-100'
              onClick={handleToggle}
            >
              {expanded ? 'Show less' : 'Show more'}
            </button>
          )}
        </div>
      </ChatMessage.Bubble>
    </ChatMessage.User>
  );
});

export const MessageView = memo(
  function MessageView({ turn }: { turn: AeroConversationTurn }) {
    const parts = turn.parts;
    const baseKey = turn.id;
    const isUser = turn.role === 'user';

    const copyText = useMemo(() => {
      if (isUser) return '';

      return parts
        .filter((part) => part.type === 'text')
        .map((part) => part.text.trim())
        .filter(Boolean)
        .join('\n\n')
        .replace(/\n{3,}/g, '\n\n')
        .trim();
    }, [parts, isUser]);

    const handleCopy = useCallback(async () => {
      if (!copyText) return;
      await navigator.clipboard.writeText(copyText);
    }, [copyText]);

    if (isUser) {
      const text = parts
        .filter((part) => part.type === 'text')
        .map((part) => part.text)
        .join('');

      return <UserChatBubble text={text} />;
    }

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
                    // <div key={blockId}>{part.text}</div>
                    <Markdown
                      id={blockId}
                      key={blockId}
                      isFile={handleIsWorktreeFile}
                      onFileClick={handleOpenFileInEditor}
                    >
                      {part.text}
                    </Markdown>
                  );

                case 'reasoning':
                  return (
                    // <div key={blockId}>{part.text}</div>
                    <ChainOfThought key={blockId}>
                      <ChainOfThought.Trigger className='text-xs'>
                        Reasoning
                      </ChainOfThought.Trigger>

                      <ChainOfThought.Content>
                        <ChainOfThought.Steps>
                          <ChainOfThought.Step>
                            <DeferredView
                              fallback={
                                <div className='text-foreground font-sans text-sm leading-relaxed whitespace-pre-wrap opacity-80'>
                                  {part.text}
                                </div>
                              }
                            >
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
              onPress={handleCopy}
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
  (prev, next) => prev.turn.id === next.turn.id,
);

MessageView.displayName = 'MessageView';
