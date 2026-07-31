'use client';

import { Button, cn, IconChevronDown, Tooltip } from '@heroui/react';
import type {
  ComponentPropsWithRef,
  ReactElement,
  ReactNode,
  Ref,
  UIEvent,
} from 'react';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

export type ChatConversationScrollBehavior = 'instant' | 'smooth';

interface ScrollState {
  hasOverflow: boolean;
  isAtBottom: boolean;
}

interface ChatConversationContextValue extends ScrollState {
  measureScrollState: (options?: { preserveAtBottom?: boolean }) => void;
  resize: ChatConversationScrollBehavior;
  scrollToBottom: (behavior?: ChatConversationScrollBehavior) => void;
}

const Context = createContext<ChatConversationContextValue | null>(null);
const threshold = 4;
const initialState: ScrollState = { hasOverflow: false, isAtBottom: true };
const hasOverflow = (element: HTMLDivElement): boolean =>
  element.scrollHeight - element.clientHeight > threshold;
const isAtBottom = (element: HTMLDivElement): boolean =>
  !hasOverflow(element) ||
  element.scrollHeight - element.scrollTop - element.clientHeight <= threshold;
const measure = (element: HTMLDivElement): ScrollState => ({
  hasOverflow: hasOverflow(element),
  isAtBottom: isAtBottom(element),
});
const sameState = (left: ScrollState, right: ScrollState): boolean =>
  left.hasOverflow === right.hasOverflow &&
  left.isAtBottom === right.isAtBottom;
const browserBehavior = (
  behavior: ChatConversationScrollBehavior,
): ScrollBehavior => (behavior === 'smooth' ? 'smooth' : 'auto');

const mergeRefs =
  <T,>(...refs: Array<Ref<T> | undefined>): Ref<T> =>
  (value) => {
    for (const ref of refs) {
      if (typeof ref === 'function') ref(value);
      else if (ref) ref.current = value;
    }
  };

export interface ChatConversationRootProps extends Omit<
  ComponentPropsWithRef<'div'>,
  'children'
> {
  children: ReactNode;
  /** Scroll behavior used on initial mount. @default "smooth" */
  initial?: ChatConversationScrollBehavior;
  /** Scroll behavior used when content grows while already at the bottom. @default "smooth" */
  resize?: ChatConversationScrollBehavior;
}

export function ChatConversationRoot({
  children,
  className,
  initial = 'smooth',
  onScroll,
  ref,
  resize = 'smooth',
  ...props
}: ChatConversationRootProps): ReactElement {
  const rootRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<number | null>(null);
  const stateRef = useRef(initialState);
  const programmaticScrollRef = useRef(false);
  const previousScrollTopRef = useRef(0);
  const composedRef = useMemo(() => mergeRefs(ref, rootRef), [ref]);
  const [scrollState, setScrollState] = useState(initialState);

  const updateState = useCallback((next: ScrollState) => {
    stateRef.current = next;
    setScrollState((current) => (sameState(current, next) ? current : next));
  }, []);

  const measureScrollState = useCallback(
    ({ preserveAtBottom = false }: { preserveAtBottom?: boolean } = {}) => {
      const root = rootRef.current;
      if (!root) return;
      const next = measure(root);
      updateState({
        hasOverflow: next.hasOverflow,
        isAtBottom:
          preserveAtBottom && stateRef.current.isAtBottom
            ? true
            : next.isAtBottom,
      });
    },
    [updateState],
  );

  const cancelFrame = useCallback(() => {
    if (frameRef.current !== null) {
      window.cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    }
  }, []);

  const scrollToBottom = useCallback(
    (behavior: ChatConversationScrollBehavior = resize) => {
      const root = rootRef.current;
      if (!root) return;
      cancelFrame();
      programmaticScrollRef.current = true;
      frameRef.current = window.requestAnimationFrame(() => {
        frameRef.current = null;
        root.scrollTo({
          behavior: browserBehavior(behavior),
          top: root.scrollHeight,
        });
      });
    },
    [cancelFrame, resize],
  );

  useEffect(() => cancelFrame, [cancelFrame]);

  useLayoutEffect(() => {
    previousScrollTopRef.current = rootRef.current?.scrollTop ?? 0;
    measureScrollState({ preserveAtBottom: true });
    scrollToBottom(initial);
  }, [initial, measureScrollState, scrollToBottom]);

  useEffect(() => {
    const root = rootRef.current;
    if (!root || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(() => {
      const wasAtBottom = stateRef.current.isAtBottom;
      measureScrollState({ preserveAtBottom: true });
      if (wasAtBottom) scrollToBottom(resize);
    });
    observer.observe(root);
    return () => observer.disconnect();
  }, [measureScrollState, resize, scrollToBottom]);

  const handleScroll = useCallback(
    (event: UIEvent<HTMLDivElement>) => {
      onScroll?.(event);
      const root = event.currentTarget;
      const scrolledUp = root.scrollTop < previousScrollTopRef.current - 1;
      previousScrollTopRef.current = root.scrollTop;

      if (programmaticScrollRef.current && !scrolledUp) {
        const atBottom = isAtBottom(root);
        if (atBottom) programmaticScrollRef.current = false;
        updateState({
          hasOverflow: hasOverflow(root),
          isAtBottom: atBottom || stateRef.current.isAtBottom,
        });
        return;
      }

      programmaticScrollRef.current = false;
      updateState(measure(root));
    },
    [onScroll, updateState],
  );

  const context = useMemo(
    () => ({
      hasOverflow: scrollState.hasOverflow,
      isAtBottom: scrollState.isAtBottom,
      measureScrollState,
      resize,
      scrollToBottom,
    }),
    [
      measureScrollState,
      resize,
      scrollState.hasOverflow,
      scrollState.isAtBottom,
      scrollToBottom,
    ],
  );

  return (
    <Context value={context}>
      <div
        ref={composedRef}
        className={cn('chat-conversation', className)}
        data-slot='chat-conversation'
        role='log'
        onScroll={handleScroll}
        {...props}
      >
        {children}
      </div>
    </Context>
  );
}

export interface ChatConversationContentProps extends ComponentPropsWithRef<'div'> {
  children: ReactNode;
}

export function ChatConversationContent({
  children,
  className,
  ref,
  ...props
}: ChatConversationContentProps): ReactElement {
  const context = useContext(Context);
  const contentRef = useRef<HTMLDivElement>(null);
  const composedRef = useMemo(() => mergeRefs(ref, contentRef), [ref]);
  const wasAtBottom = context?.isAtBottom ?? true;
  const measureScrollState = context?.measureScrollState;
  const resize = context?.resize ?? 'smooth';
  const scrollToBottom = context?.scrollToBottom;

  useLayoutEffect(() => {
    measureScrollState?.({ preserveAtBottom: wasAtBottom });
    if (wasAtBottom) scrollToBottom?.(resize);
  }, [measureScrollState, resize, scrollToBottom, wasAtBottom]);

  useEffect(() => {
    const content = contentRef.current;
    if (!content || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(() => {
      measureScrollState?.({ preserveAtBottom: wasAtBottom });
      if (wasAtBottom) scrollToBottom?.(resize);
    });
    observer.observe(content);
    return () => observer.disconnect();
  }, [measureScrollState, resize, scrollToBottom, wasAtBottom]);

  return (
    <div
      ref={composedRef}
      className={cn('chat-conversation__content', className)}
      data-slot='chat-conversation-content'
      {...props}
    >
      {children}
    </div>
  );
}

export function ChatConversationScrollAnchor({
  className,
  ...props
}: ComponentPropsWithRef<'div'>): ReactElement {
  return (
    <div
      aria-hidden='true'
      className={cn('chat-conversation__scroll-anchor', className)}
      data-slot='chat-conversation-scroll-anchor'
      {...props}
    />
  );
}

export interface ChatConversationScrollButtonProps extends ComponentPropsWithRef<
  typeof Button
> {
  tooltip?: ReactNode;
}

export function ChatConversationScrollButton({
  'aria-label': ariaLabel,
  className,
  isDisabled,
  tooltip,
  ...props
}: ChatConversationScrollButtonProps): ReactElement | null {
  const context = useContext(Context);
  if (!context) return null;
  const visible = context.hasOverflow && !context.isAtBottom;
  const button = (
    <Button
      isIconOnly
      aria-hidden={visible ? undefined : true}
      className={
        cn('chat-conversation__scroll-button', className) ??
        'chat-conversation__scroll-button'
      }
      data-slot='chat-conversation-scroll-button'
      size='sm'
      variant='secondary'
      onPress={() => context.scrollToBottom('smooth')}
      {...props}
      {...(ariaLabel ? { 'aria-label': ariaLabel } : {})}
      {...(!visible || isDisabled ? { isDisabled: true } : {})}
    >
      <IconChevronDown className='size-4' />
    </Button>
  );

  return (
    <div
      aria-hidden={visible ? undefined : true}
      className='chat-conversation__scroll-button-container'
      data-slot='chat-conversation-scroll-button-container'
      data-state={visible ? 'visible' : 'hidden'}
    >
      {tooltip ? (
        <Tooltip delay={0}>
          <Tooltip.Trigger>{button}</Tooltip.Trigger>
          <Tooltip.Content placement='top'>{tooltip}</Tooltip.Content>
        </Tooltip>
      ) : (
        button
      )}
    </div>
  );
}

export interface ChatConversationComponent {
  (props: ChatConversationRootProps): ReactElement;
  Content: typeof ChatConversationContent;
  Root: typeof ChatConversationRoot;
  ScrollAnchor: typeof ChatConversationScrollAnchor;
  ScrollButton: typeof ChatConversationScrollButton;
}

export const ChatConversation = Object.assign(ChatConversationRoot, {
  Content: ChatConversationContent,
  Root: ChatConversationRoot,
  ScrollAnchor: ChatConversationScrollAnchor,
  ScrollButton: ChatConversationScrollButton,
}) as ChatConversationComponent;
