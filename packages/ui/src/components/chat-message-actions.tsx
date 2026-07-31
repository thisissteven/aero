'use client';
import { cn } from '@heroui/react';
import {
  AnimatePresence,
  domAnimation,
  LazyMotion,
  m,
  useReducedMotion,
} from 'motion/react';
import type {
  ComponentPropsWithRef,
  ReactElement,
  ReactNode,
  SVGProps,
} from 'react';
import {
  cloneElement,
  isValidElement,
  useEffect,
  useRef,
  useState,
} from 'react';

import { ChatMessage } from './chat-message';
const cls = (base: string, className: unknown): string =>
  cn(base, typeof className === 'string' ? className : undefined) ?? base;
export function ChatMessageActionsRoot({
  className,
  ...props
}: ComponentPropsWithRef<'div'>): ReactElement {
  return (
    <ChatMessage.Actions
      className={cls('chat-message-actions', className)}
      data-slot='chat-message-actions'
      {...props}
    />
  );
}
type IconProps = ComponentPropsWithRef<'span'>;
const glyph =
  (path: string) =>
  (props: SVGProps<SVGSVGElement>): ReactElement => (
    <svg
      fill='none'
      height='16'
      viewBox='0 0 16 16'
      width='16'
      xmlns='http://www.w3.org/2000/svg'
      {...props}
    >
      <path
        clipRule='evenodd'
        d={path}
        fill='currentColor'
        fillRule='evenodd'
      />
    </svg>
  );
const CopyGlyph = glyph(
  'M12 2.5H8A1.5 1.5 0 0 0 6.5 4v1H8a3 3 0 0 1 3 3v1.5h1A1.5 1.5 0 0 0 13.5 8V4A1.5 1.5 0 0 0 12 2.5M11 11h1a3 3 0 0 0 3-3V4a3 3 0 0 0-3-3H8a3 3 0 0 0-3 3v1H4a3 3 0 0 0-3 3v4a3 3 0 0 0 3 3h4a3 3 0 0 0 3-3zM4 6.5h4A1.5 1.5 0 0 1 9.5 8v4A1.5 1.5 0 0 1 8 13.5H4A1.5 1.5 0 0 1 2.5 12V8A1.5 1.5 0 0 1 4 6.5',
);
const CheckGlyph = glyph(
  'M13.488 3.43a.75.75 0 0 1 .081 1.058l-6 7a.75.75 0 0 1-1.1.042l-3.5-3.5A.75.75 0 0 1 4.03 6.97l2.928 2.927 5.473-6.385a.75.75 0 0 1 1.057-.081',
);
const RegenerateGlyph = glyph(
  'M8 1.5a6.5 6.5 0 0 1 6.445 5.649.75.75 0 1 1-1.488.194A5.001 5.001 0 0 0 4.43 4.5h1.32a.75.75 0 0 1 0 1.5h-3A.75.75 0 0 1 2 5.25v-3a.75.75 0 1 1 1.5 0v1.06A6.48 6.48 0 0 1 8 1.5m5.25 13a.75.75 0 0 0 .75-.75v-3a.75.75 0 0 0-.75-.75h-3a.75.75 0 1 0 0 1.5h1.32a5.001 5.001 0 0 1-8.528-2.843.75.75 0 1 0-1.487.194 6.501 6.501 0 0 0 10.945 3.84v1.059c0 .414.336.75.75.75',
);
const MenuGlyph = glyph(
  'M3 9.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3M9.5 8a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0m5 0a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0',
);
const ThumbsUpGlyph = glyph(
  'm4 7 2.94-5.041a1.932 1.932 0 0 1 3.56 1.378L10.25 4.5 9.93 6h2.94a2 2 0 0 1 1.927 2.535l-.879 3.162A4 4 0 0 1 9.596 14.6L4.5 14zm5.771 6.11-3.863-.455-.379-5.3 2.708-4.64a.432.432 0 0 1 .796.308l-.571 2.663L8.073 7.5h4.796a.5.5 0 0 1 .482.634l-.879 3.162a2.5 2.5 0 0 1-2.7 1.814M2.748 7.447a.75.75 0 1 0-1.496.106l.5 7a.75.75 0 0 0 1.496-.106z',
);
const ThumbsDownGlyph = glyph(
  'm12 9-2.94 5.041a1.932 1.932 0 0 1-3.56-1.378l.25-1.163.321-1.5h-2.94a2 2 0 0 1-1.927-2.535l.879-3.162A4 4 0 0 1 6.404 1.4L11.5 2zM6.229 2.89l3.863.455.379 5.3-2.708 4.64a.432.432 0 0 1-.796-.308l.571-2.663.389-1.814H3.13a.5.5 0 0 1-.482-.634l.879-3.162a2.5 2.5 0 0 1 2.7-1.814m7.023 5.663a.75.75 0 1 0 1.496-.106l-.5-7a.75.75 0 0 0-1.496.106z',
);
const icon = (
  Fallback: (props: SVGProps<SVGSVGElement>) => ReactElement,
  slot: string,
) =>
  function Icon({ children, className, ...props }: IconProps): ReactElement {
    if (children && isValidElement(children))
      return cloneElement(
        children as ReactElement<{ className?: string; 'data-slot'?: string }>,
        {
          ...props,
          className: [
            'size-4',
            className,
            (children.props as { className?: string }).className,
          ]
            .filter(Boolean)
            .join(' '),
          'data-slot': slot,
        },
      );
    return (
      <Fallback
        aria-hidden
        className={cls('size-4', className)}
        data-slot={slot}
        {...(props as SVGProps<SVGSVGElement>)}
      />
    );
  };
export const ChatMessageActionsCopyIcon: (props: IconProps) => ReactElement =
  icon(CopyGlyph, 'chat-message-actions-copy-icon');
export const ChatMessageActionsCopiedIcon: (props: IconProps) => ReactElement =
  icon(CheckGlyph, 'chat-message-actions-copied-icon');
export const ChatMessageActionsRegenerateIcon: (
  props: IconProps,
) => ReactElement = icon(
  RegenerateGlyph,
  'chat-message-actions-regenerate-icon',
);
export const ChatMessageActionsMenuIcon: (props: IconProps) => ReactElement =
  icon(MenuGlyph, 'chat-message-actions-menu-icon');
export const ChatMessageActionsThumbsUpIcon: (
  props: IconProps,
) => ReactElement = icon(ThumbsUpGlyph, 'chat-message-actions-thumbs-up-icon');
export const ChatMessageActionsThumbsDownIcon: (
  props: IconProps,
) => ReactElement = icon(
  ThumbsDownGlyph,
  'chat-message-actions-thumbs-down-icon',
);
export interface ChatMessageActionsCopyProps extends ComponentPropsWithRef<
  typeof ChatMessage.Action
> {
  copiedIcon?: ReactNode;
  isCopied?: boolean;
}
export function ChatMessageActionsCopy({
  children,
  className,
  copiedIcon,
  isCopied,
  onPress,
  ...props
}: ChatMessageActionsCopyProps): ReactElement {
  const [localCopied, setLocalCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const controlled = isCopied !== undefined;
  const copied = isCopied ?? localCopied;
  const reduceMotion = useReducedMotion();
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );
  return (
    <ChatMessage.Action
      {...props}
      {...(className === undefined ? {} : { className })}
      onPress={(event) => {
        onPress?.(event);
        if (!controlled) {
          setLocalCopied(true);
          if (timer.current) clearTimeout(timer.current);
          timer.current = setTimeout(() => {
            setLocalCopied(false);
            timer.current = null;
          }, 2000);
        }
      }}
    >
      <LazyMotion features={domAnimation}>
        <AnimatePresence initial={false} mode='popLayout'>
          <m.span
            animate={
              reduceMotion
                ? { opacity: 1 }
                : { filter: 'blur(0px)', opacity: 1, scale: 1 }
            }
            className='flex size-4 items-center justify-center'
            data-slot='chat-message-actions-copy-icon-motion'
            exit={
              reduceMotion
                ? { opacity: 0 }
                : { filter: 'blur(4px)', opacity: 0, scale: 0.25 }
            }
            initial={
              reduceMotion
                ? { opacity: 0 }
                : { filter: 'blur(4px)', opacity: 0, scale: 0.25 }
            }
            key={copied ? 'check' : 'copy'}
            transition={
              reduceMotion
                ? { duration: 0.12 }
                : { bounce: 0, duration: 0.3, type: 'spring' }
            }
          >
            {copied ? (
              copiedIcon && isValidElement(copiedIcon) ? (
                copiedIcon
              ) : (
                <ChatMessageActionsCopiedIcon />
              )
            ) : children && isValidElement(children) ? (
              children
            ) : (
              <ChatMessageActionsCopyIcon />
            )}
          </m.span>
        </AnimatePresence>
      </LazyMotion>
    </ChatMessage.Action>
  );
}
type ActionProps = ComponentPropsWithRef<typeof ChatMessage.Action>;
export function ChatMessageActionsAction({
  className,
  ...props
}: ActionProps): ReactElement {
  return (
    <ChatMessage.Action
      {...props}
      {...(className === undefined ? {} : { className })}
    />
  );
}
const action = (Icon: (props: IconProps) => ReactElement) =>
  // oxlint-disable-next-line unicorn/consistent-function-scoping -- factory captures Icon.
  function Action({
    children,
    className,
    ...props
  }: ActionProps): ReactElement {
    return (
      <ChatMessage.Action
        {...props}
        {...(className === undefined ? {} : { className })}
      >
        {children && isValidElement(children) ? children : <Icon />}
      </ChatMessage.Action>
    );
  };
export const ChatMessageActionsRegenerate: (
  props: ActionProps,
) => ReactElement = action(ChatMessageActionsRegenerateIcon);
export const ChatMessageActionsMenu: (props: ActionProps) => ReactElement =
  action(ChatMessageActionsMenuIcon);
export const ChatMessageActionsThumbsUp: (props: ActionProps) => ReactElement =
  action(ChatMessageActionsThumbsUpIcon);
export const ChatMessageActionsThumbsDown: (
  props: ActionProps,
) => ReactElement = action(ChatMessageActionsThumbsDownIcon);
interface Component extends Function {
  Action: typeof ChatMessageActionsAction;
  Root: typeof ChatMessageActionsRoot;
  Copy: typeof ChatMessageActionsCopy;
  CopyIcon: typeof ChatMessageActionsCopyIcon;
  CopiedIcon: typeof ChatMessageActionsCopiedIcon;
  Regenerate: typeof ChatMessageActionsRegenerate;
  RegenerateIcon: typeof ChatMessageActionsRegenerateIcon;
  Menu: typeof ChatMessageActionsMenu;
  MenuIcon: typeof ChatMessageActionsMenuIcon;
  ThumbsUp: typeof ChatMessageActionsThumbsUp;
  ThumbsUpIcon: typeof ChatMessageActionsThumbsUpIcon;
  ThumbsDown: typeof ChatMessageActionsThumbsDown;
  ThumbsDownIcon: typeof ChatMessageActionsThumbsDownIcon;
}
export const ChatMessageActions = Object.assign(ChatMessageActionsRoot, {
  Action: ChatMessageActionsAction,
  CopiedIcon: ChatMessageActionsCopiedIcon,
  Copy: ChatMessageActionsCopy,
  CopyIcon: ChatMessageActionsCopyIcon,
  Menu: ChatMessageActionsMenu,
  MenuIcon: ChatMessageActionsMenuIcon,
  Regenerate: ChatMessageActionsRegenerate,
  RegenerateIcon: ChatMessageActionsRegenerateIcon,
  Root: ChatMessageActionsRoot,
  ThumbsDown: ChatMessageActionsThumbsDown,
  ThumbsDownIcon: ChatMessageActionsThumbsDownIcon,
  ThumbsUp: ChatMessageActionsThumbsUp,
  ThumbsUpIcon: ChatMessageActionsThumbsUpIcon,
}) as typeof ChatMessageActionsRoot & Component;
