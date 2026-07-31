'use client';
import { Avatar, Button, cn, Tooltip } from '@heroui/react';
import type { ComponentPropsWithRef, ReactElement, ReactNode } from 'react';
import { createContext, useContext } from 'react';
const Context = createContext(true);
const cls = (base: string, className: unknown): string =>
  cn(base, typeof className === 'string' ? className : undefined) ?? base;
const root = (base: string, slot: string) =>
  function Root({
    className,
    ...props
  }: ComponentPropsWithRef<'div'>): ReactElement {
    return (
      <Context value>
        <div className={cls(base, className)} data-slot={slot} {...props} />
      </Context>
    );
  };
type DivPart = (props: ComponentPropsWithRef<'div'>) => ReactElement;
export const ChatMessageUser: DivPart = root(
  'chat-message--user',
  'chat-message-user',
);
export const ChatMessageAssistant: DivPart = root(
  'chat-message--assistant',
  'chat-message-assistant',
);
const part = (base: string, slot: string) =>
  function Part({
    className,
    ...props
  }: ComponentPropsWithRef<'div'>): ReactElement {
    useContext(Context);
    return <div className={cls(base, className)} data-slot={slot} {...props} />;
  };
export const ChatMessageBubble: DivPart = part(
  'chat-message__bubble',
  'chat-message-bubble',
);
export const ChatMessageContent: DivPart = part(
  'chat-message__content',
  'chat-message-content',
);
export const ChatMessageActionsContainer: DivPart = part(
  'chat-message__actions',
  'chat-message-actions',
);
export const ChatMessageBody: DivPart = part(
  'chat-message__body',
  'chat-message-body',
);
export interface ChatMessageActionProps extends ComponentPropsWithRef<
  typeof Button
> {
  tooltip?: ReactNode;
}
export function ChatMessageAction({
  'aria-label': ariaLabel,
  children,
  className,
  tooltip,
  ...props
}: ChatMessageActionProps): ReactElement {
  useContext(Context);
  const button = (
    <Button
      isIconOnly
      className={cls('chat-message__action', className)}
      data-slot='chat-message-action'
      size='sm'
      variant='ghost'
      {...(ariaLabel === undefined ? {} : { 'aria-label': ariaLabel })}
      {...props}
    >
      {children}
    </Button>
  );
  return tooltip ? (
    <Tooltip delay={0}>
      <Tooltip.Trigger>{button}</Tooltip.Trigger>
      <Tooltip.Content>{tooltip}</Tooltip.Content>
    </Tooltip>
  ) : (
    button
  );
}
export interface ChatMessageAvatarProps extends Omit<
  ComponentPropsWithRef<'div'>,
  'children'
> {
  alt: string;
  fallback?: string;
  show?: boolean;
  src?: string;
}
export function ChatMessageAvatar({
  alt,
  className,
  fallback,
  show = true,
  src,
  ...props
}: ChatMessageAvatarProps): ReactElement {
  useContext(Context);
  return show ? (
    <div
      className={cls('chat-message__avatar', className)}
      data-slot='chat-message-avatar'
      {...props}
    >
      <Avatar className='size-8'>
        {src ? <Avatar.Image alt={alt} src={src} /> : null}
        {fallback ? <Avatar.Fallback>{fallback}</Avatar.Fallback> : null}
      </Avatar>
    </div>
  ) : (
    <div
      aria-hidden
      className={cls('chat-message__avatar-spacer', className)}
      data-slot='chat-message-avatar-spacer'
      {...props}
    />
  );
}
export interface ChatMessageComponent {
  Action: typeof ChatMessageAction;
  Actions: typeof ChatMessageActionsContainer;
  Assistant: typeof ChatMessageAssistant;
  Avatar: typeof ChatMessageAvatar;
  Body: typeof ChatMessageBody;
  Bubble: typeof ChatMessageBubble;
  Content: typeof ChatMessageContent;
  User: typeof ChatMessageUser;
}
export const ChatMessage: ChatMessageComponent = {
  Action: ChatMessageAction,
  Actions: ChatMessageActionsContainer,
  Assistant: ChatMessageAssistant,
  Avatar: ChatMessageAvatar,
  Body: ChatMessageBody,
  Bubble: ChatMessageBubble,
  Content: ChatMessageContent,
  User: ChatMessageUser,
};
