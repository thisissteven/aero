'use client';
import { cn, Spinner } from '@heroui/react';
import type { ComponentPropsWithRef, ReactElement } from 'react';
import { createContext, useContext } from 'react';
export type ChatLoaderSize = 'lg' | 'md' | 'sm';
const Context = createContext<ChatLoaderSize>('md');
const cls = (base: string, className: unknown): string =>
  cn(base, typeof className === 'string' ? className : undefined) ?? base;
export interface LoaderProps extends ComponentPropsWithRef<'span'> {
  label?: string;
  size?: ChatLoaderSize;
}
const aria = (label?: string) =>
  label
    ? { 'aria-label': label, role: 'status' as const }
    : { 'aria-hidden': true as const };
export function ChatLoaderDots({
  className,
  label,
  size = 'md',
  ...props
}: LoaderProps): ReactElement {
  const sizeClass = size === 'md' ? '' : ` chat-loader__dots--${size}`;
  const dotSizeClass = size === 'md' ? '' : ` chat-loader__dot--${size}`;
  return (
    <span
      className={cls(`chat-loader__dots${sizeClass}`, className)}
      data-slot='chat-loader-dots'
      {...aria(label)}
      {...props}
    >
      <span className={`chat-loader__dot${dotSizeClass}`} />
      <span className={`chat-loader__dot${dotSizeClass}`} />
      <span className={`chat-loader__dot${dotSizeClass}`} />
      {label ? <span className='sr-only'>{label}</span> : null}
    </span>
  );
}
export function ChatLoaderPulse({
  className,
  label,
  size = 'md',
  ...props
}: LoaderProps): ReactElement {
  const sizeClass = size === 'md' ? '' : ` chat-loader__pulse--${size}`;
  return (
    <span
      className={cls(`chat-loader__pulse${sizeClass}`, className)}
      data-slot='chat-loader-pulse'
      {...aria(label)}
      {...props}
    >
      {label ? <span className='sr-only'>{label}</span> : null}
    </span>
  );
}
export function ChatLoaderSpinner({
  className,
  label,
  size = 'md',
  ...props
}: LoaderProps): ReactElement {
  return (
    <span
      className={cls('chat-loader__spinner', className)}
      data-slot='chat-loader-spinner'
      {...aria(label)}
      {...props}
    >
      <Spinner size={size} />
      {label ? <span className='sr-only'>{label}</span> : null}
    </span>
  );
}
export interface ChatLoaderSkeletonProps extends ComponentPropsWithRef<'div'> {
  label?: string;
  size?: ChatLoaderSize;
}
export function ChatLoaderSkeleton({
  children,
  className,
  label,
  size = 'md',
  ...props
}: ChatLoaderSkeletonProps): ReactElement {
  return (
    <Context value={size}>
      <div
        aria-busy='true'
        aria-label={label}
        className={cls('chat-loader__skeleton', className)}
        data-slot='chat-loader-skeleton'
        role={label ? 'status' : undefined}
        {...props}
      >
        {children ?? (
          <>
            <ChatLoaderSkeletonAvatar />
            <ChatLoaderSkeletonBlock>
              <ChatLoaderSkeletonLine />
              <ChatLoaderSkeletonLine />
              <ChatLoaderSkeletonLine />
            </ChatLoaderSkeletonBlock>
          </>
        )}
      </div>
    </Context>
  );
}
export function ChatLoaderSkeletonAvatar({
  className,
  ...props
}: ComponentPropsWithRef<'div'>): ReactElement {
  const size = useContext(Context);
  const sizeClass =
    size === 'md' ? '' : ` chat-loader__skeleton-avatar--${size}`;
  return (
    <div
      className={cls(`chat-loader__skeleton-avatar${sizeClass}`, className)}
      data-slot='chat-loader-skeleton-avatar'
      {...props}
    />
  );
}
export function ChatLoaderSkeletonBlock({
  className,
  ...props
}: ComponentPropsWithRef<'div'>): ReactElement {
  return (
    <div
      className={cls('chat-loader__skeleton-block', className)}
      data-slot='chat-loader-skeleton-block'
      {...props}
    />
  );
}
export function ChatLoaderSkeletonLine({
  className,
  ...props
}: ComponentPropsWithRef<'div'>): ReactElement {
  const size = useContext(Context);
  const sizeClass = size === 'md' ? '' : ` chat-loader__skeleton-line--${size}`;
  return (
    <div
      className={cls(`chat-loader__skeleton-line${sizeClass}`, className)}
      data-slot='chat-loader-skeleton-line'
      {...props}
    />
  );
}
export interface ChatLoaderComponent {
  Dots: typeof ChatLoaderDots;
  Pulse: typeof ChatLoaderPulse;
  Skeleton: typeof ChatLoaderSkeleton;
  SkeletonAvatar: typeof ChatLoaderSkeletonAvatar;
  SkeletonBlock: typeof ChatLoaderSkeletonBlock;
  SkeletonLine: typeof ChatLoaderSkeletonLine;
  Spinner: typeof ChatLoaderSpinner;
}
export const ChatLoader: ChatLoaderComponent = {
  Dots: ChatLoaderDots,
  Pulse: ChatLoaderPulse,
  Skeleton: ChatLoaderSkeleton,
  SkeletonAvatar: ChatLoaderSkeletonAvatar,
  SkeletonBlock: ChatLoaderSkeletonBlock,
  SkeletonLine: ChatLoaderSkeletonLine,
  Spinner: ChatLoaderSpinner,
};
