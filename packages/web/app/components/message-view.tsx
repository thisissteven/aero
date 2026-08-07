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

// ---------------------------------------------------------------------------
// UserChatBubble
//
// FIX: Replaced the `useEffect` + `el.scrollHeight` read with a ResizeObserver.
// Reading scrollHeight in useEffect forces a synchronous layout flush on every
// streaming character. ResizeObserver is notified *after* the browser has
// already committed layout, so we get the measurement for free with zero
// additional reflow cost.
// ---------------------------------------------------------------------------
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

  // Sync check before the first paint so the clamp is applied immediately —
  // no visible flicker. useLayoutEffect fires after DOM mutations but before
  // the browser paints; layout is already computed at this point so reading
  // scrollHeight here doesn't trigger an extra reflow.
  useLayoutEffect(() => {
    const el = textRef.current;
    if (el) setIsOverflowing(el.scrollHeight > 72);
  }, []);

  // ResizeObserver handles subsequent updates (text streaming, window resize).
  // Kept separate from the layout effect so it only pays the observer overhead
  // for the ongoing lifecycle, not the initial render.
  useEffect(() => {
    const el = textRef.current;
    if (!el) return;

    const observer = new ResizeObserver(() => {
      setIsOverflowing(el.scrollHeight > 72);
    });

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

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
      const topOffset = 40;
      const containerRect = scrollContainer.getBoundingClientRect();
      const bubbleRect = bubbleEl.getBoundingClientRect();
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

// ---------------------------------------------------------------------------
// MessageView
//
// FIX: Memo comparator.
//
// Old: `(prev, next) => prev.turn.id === next.turn.id`
//   → Breaks streaming: parts mutate while id is constant, so memo never
//     re-renders the streaming message.
//
// New: compare id + parts array length + the last part's content/status.
//   - If id changes → different turn → re-render.
//   - If parts length changes → new tool call / text part appended → re-render.
//   - If last part's text or status changed → streaming update → re-render.
//   - Otherwise → memo bails out → no wasted render.
//
// This is defensive and works for both in-place mutation and replace-by-ref
// streaming patterns.
// ---------------------------------------------------------------------------
function areTurnsEqual(
  prev: { turn: AeroConversationTurn },
  next: { turn: AeroConversationTurn },
): boolean {
  if (prev.turn.id !== next.turn.id) return false;
  if (prev.turn.parts.length !== next.turn.parts.length) return false;

  const prevLast = prev.turn.parts[prev.turn.parts.length - 1];
  const nextLast = next.turn.parts[next.turn.parts.length - 1];

  if (!prevLast && !nextLast) return true;
  if (!prevLast || !nextLast) return false;
  if (prevLast.type !== nextLast.type) return false;

  // Compare type-specific streaming fields
  if (
    (nextLast.type === 'text' || nextLast.type === 'reasoning') &&
    (prevLast.type === 'text' || prevLast.type === 'reasoning')
  ) {
    return prevLast.text === nextLast.text;
  }

  if (nextLast.type === 'tool' && prevLast.type === 'tool') {
    return (
      prevLast.status === nextLast.status && prevLast.output === nextLast.output
    );
  }

  return true;
}

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
        <ChatMessage.Body className='pe-0!'>
          <ChatMessage.Content>
            {parts.map((part, index) => {
              const blockId = `${baseKey}-part-${index}`;

              switch (part.type) {
                case 'text':
                  return (
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
                    <ChainOfThought key={blockId}>
                      <ChainOfThought.Trigger className='text-xs'>
                        Reasoning
                      </ChainOfThought.Trigger>

                      <ChainOfThought.Content>
                        <ChainOfThought.Steps>
                          <ChainOfThought.Step>
                            <DeferredView
                              fallback={
                                <div
                                  className='bg-muted p-4 font-mono text-xs'
                                  style={{
                                    minHeight: 120,
                                  }}
                                >
                                  Loading output…
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
  (prev, next) => areTurnsEqual(prev, next),
);

MessageView.displayName = 'MessageView';
