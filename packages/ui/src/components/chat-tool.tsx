'use client';
import { Button, cn, Disclosure } from '@heroui/react';
import {
  AlertCircleIcon,
  CancelCircleIcon,
  CheckmarkCircle02Icon,
  Wrench01Icon,
} from '@hugeicons/core-free-icons';
import { HugeiconsIcon, type IconSvgElement } from '@hugeicons/react';
import type { ComponentPropsWithRef, ReactElement, ReactNode } from 'react';
import {
  cloneElement,
  createContext,
  isValidElement,
  useContext,
  useMemo,
} from 'react';

import { CodeBlock } from './code-block';
import { TextShimmer } from './text-shimmer';
export type ChatToolState =
  | 'input-available'
  | 'input-streaming'
  | 'output-available'
  | 'output-error'
  | 'requires-action';
interface ToolContext {
  active: boolean;
  expandable: boolean;
  state: ChatToolState;
  toolName?: string | undefined;
}
const Context = createContext<ToolContext>({
  active: false,
  expandable: true,
  state: 'output-available',
});
const cls = (base: string, className: unknown): string =>
  cn(base, typeof className === 'string' ? className : undefined) ?? base;
const json = (value: unknown): string => {
  if (value === null) return 'null';
  if (value === undefined) return '';
  if (typeof value === 'string') return value;
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
};
const stateClass = (state: ChatToolState) =>
  state === 'input-streaming'
    ? 'streaming'
    : state === 'input-available'
      ? 'running'
      : state === 'output-error'
        ? 'error'
        : state === 'requires-action'
          ? 'requires-action'
          : 'complete';
export interface ChatToolRootProps extends ComponentPropsWithRef<
  typeof Disclosure
> {
  active?: boolean;
  approveLabel?: ReactNode;
  argsText?: string;
  errorText?: string;
  input?: unknown;
  isExpandable?: boolean;
  onApprove?: () => void;
  onReject?: () => void;
  output?: unknown;
  rejectLabel?: ReactNode;
  state: ChatToolState;
  toolCallId?: string;
  toolName?: string;
  triggerPrefix?: ReactNode;
}
export function ChatToolRoot({
  active,
  approveLabel,
  argsText,
  children,
  className,
  errorText,
  input,
  isExpandable,
  onApprove,
  onReject,
  output,
  rejectLabel,
  state,
  toolCallId,
  toolName,
  triggerPrefix,
  ...props
}: ChatToolRootProps): ReactElement {
  const isActive =
    active ?? (state === 'input-streaming' || state === 'input-available');
  const hasBody = Boolean(
    argsText?.trim() ||
    json(input) ||
    json(output) ||
    errorText ||
    (state === 'requires-action' && (onApprove || onReject)) ||
    toolCallId,
  );
  const expandable = isExpandable ?? (children ? true : hasBody);
  const contextValue = useMemo(
    () => ({ active: isActive, expandable, state, toolName }),
    [expandable, isActive, state, toolName],
  );

  return (
    <Context value={contextValue}>
      <Disclosure
        className={cls(`chat-tool chat-tool--${stateClass(state)}`, className)}
        data-active={isActive || undefined}
        data-expandable={expandable || undefined}
        data-slot='chat-tool'
        data-state={state}
        {...props}
      >
        {children ?? (
          <>
            <ChatToolTrigger>
              <ChatToolStatusIcon />
              {triggerPrefix || toolName ? (
                <span className='chat-tool__trigger-label'>
                  {triggerPrefix}
                  {toolName ? (
                    <span className='font-medium'>{toolName}</span>
                  ) : null}
                </span>
              ) : null}
            </ChatToolTrigger>
            {expandable ? (
              <ChatToolContent>
                <ChatToolArgs argsText={argsText} input={input} />
                <ChatToolResult value={output} />
                <ChatToolError errorText={errorText} />
                {state === 'requires-action' && (onApprove || onReject) ? (
                  <ChatToolApproval>
                    <ChatToolApprovalActions>
                      {onReject ? (
                        <ChatToolReject onPress={onReject}>
                          {rejectLabel}
                        </ChatToolReject>
                      ) : null}
                      {onApprove ? (
                        <ChatToolApprove onPress={onApprove}>
                          {approveLabel}
                        </ChatToolApprove>
                      ) : null}
                    </ChatToolApprovalActions>
                  </ChatToolApproval>
                ) : null}
                {toolCallId ? <ChatToolMeta toolCallId={toolCallId} /> : null}
              </ChatToolContent>
            ) : null}
          </>
        )}
      </Disclosure>
    </Context>
  );
}
export function ChatToolTrigger({
  children,
  className,
  isDisabled,
  ...props
}: Omit<ComponentPropsWithRef<typeof Disclosure.Trigger>, 'children'> & {
  children: ReactNode;
}): ReactElement {
  const state = useContext(Context);
  const content = state.active ? (
    <TextShimmer>{children}</TextShimmer>
  ) : (
    children
  );
  return (
    <Disclosure.Heading>
      <Disclosure.Trigger
        className={cls(
          `chat-tool__trigger${state.expandable ? '' : 'cursor-default'}`,
          className,
        )}
        data-expandable={state.expandable ? undefined : 'false'}
        data-slot='chat-tool-trigger'
        isDisabled={Boolean(isDisabled || !state.expandable)}
        {...props}
      >
        <span className='chat-tool__trigger-label'>{content}</span>
        {state.expandable ? (
          <Disclosure.Indicator className='text-muted size-3.5 shrink-0' />
        ) : null}
      </Disclosure.Trigger>
    </Disclosure.Heading>
  );
}
export function ChatToolStatusIcon({
  children,
  className,
}: {
  children?: ReactNode;
  className?: string;
}): ReactElement {
  const { state } = useContext(Context);
  const icon: IconSvgElement =
    state === 'output-available'
      ? CheckmarkCircle02Icon
      : state === 'output-error'
        ? CancelCircleIcon
        : state === 'requires-action'
          ? AlertCircleIcon
          : Wrench01Icon;
  const color =
    state === 'output-available'
      ? 'text-success'
      : state === 'output-error'
        ? 'text-danger'
        : state === 'requires-action'
          ? 'text-warning'
          : '';
  if (children && isValidElement(children))
    return cloneElement(
      children as ReactElement<{ className?: string; 'data-slot'?: string }>,
      {
        className: cls(`size-3.5 shrink-0 ${color}`, className),
        'data-slot': 'chat-tool-status-icon',
      },
    );
  return (
    <span className='chat-tool__status' data-slot='chat-tool-status'>
      <HugeiconsIcon
        aria-hidden
        className={cls(`size-3.5 shrink-0 ${color}`, className)}
        data-slot='chat-tool-status-icon'
        icon={icon}
        strokeWidth={2}
      />
    </span>
  );
}
export function ChatToolContent({
  children,
  className,
  ...props
}: ComponentPropsWithRef<typeof Disclosure.Content>): ReactElement | null {
  const state = useContext(Context);
  return state.expandable ? (
    <Disclosure.Content
      className={cls('chat-tool__content', className)}
      data-slot='chat-tool-content'
      {...props}
    >
      <Disclosure.Body>
        <div className='chat-tool__content-body'>{children}</div>
      </Disclosure.Body>
    </Disclosure.Content>
  ) : null;
}
interface ValueProps extends ComponentPropsWithRef<'div'> {
  label?: ReactNode;
}
export interface ArgsProps extends ValueProps {
  argsText?: string | undefined;
  input?: unknown;
}
export function ChatToolArgs({
  argsText,
  children,
  className,
  input,
  label,
  ...props
}: ArgsProps): ReactElement | null {
  const value = argsText ?? (input !== undefined ? json(input) : '');
  return children || value ? (
    <div
      className={cls('chat-tool__args', className)}
      data-slot='chat-tool-args'
      {...props}
    >
      {label ? <div className='chat-tool__args-label'>{label}</div> : null}
      {children ?? (
        <CodeBlock>
          <CodeBlock.Code code={value} language='json' />
        </CodeBlock>
      )}
    </div>
  ) : null;
}
export interface ResultProps extends ValueProps {
  value?: unknown;
}
export function ChatToolResult({
  children,
  className,
  label,
  value,
  ...props
}: ResultProps): ReactElement | null {
  const { state } = useContext(Context);
  if (state === 'output-error') return null;
  const text = value === undefined ? '' : json(value);
  return children || text ? (
    <div
      className={cls('chat-tool__result', className)}
      data-slot='chat-tool-result'
      {...props}
    >
      {label ? <div className='chat-tool__result-label'>{label}</div> : null}
      {children ?? (
        <CodeBlock>
          <CodeBlock.Code code={text} language='json' />
        </CodeBlock>
      )}
    </div>
  ) : null;
}
export interface ErrorProps extends ValueProps {
  errorText?: string | undefined;
}
export function ChatToolError({
  children,
  className,
  errorText,
  label,
  ...props
}: ErrorProps): ReactElement | null {
  const { state } = useContext(Context);
  return state !== 'output-error' && !errorText && !children ? null : (
    <div
      className={cls('chat-tool__error', className)}
      data-slot='chat-tool-error'
      {...props}
    >
      {label ? <div className='chat-tool__error-label'>{label}</div> : null}
      {children ?? errorText}
    </div>
  );
}
const div =
  (base: string, slot: string) =>
  (p: ComponentPropsWithRef<'div'>): ReactElement => (
    <div {...p} className={cls(base, p.className)} data-slot={slot} />
  );
type DivPart = (p: ComponentPropsWithRef<'div'>) => ReactElement;
export const ChatToolApproval: DivPart = div(
  'chat-tool__approval',
  'chat-tool-approval',
);
export const ChatToolApprovalActions: DivPart = div(
  'chat-tool__approval-actions',
  'chat-tool-approval-actions',
);
export function ChatToolApprove(
  p: ComponentPropsWithRef<typeof Button>,
): ReactElement {
  return (
    <Button size='sm' variant='primary' data-slot='chat-tool-approve' {...p} />
  );
}
export function ChatToolReject({
  variant = 'secondary',
  ...p
}: ComponentPropsWithRef<typeof Button>): ReactElement {
  return (
    <Button size='sm' variant={variant} data-slot='chat-tool-reject' {...p} />
  );
}
export function ChatToolMeta({
  className,
  toolCallId,
  ...props
}: ComponentPropsWithRef<'div'> & { toolCallId: string }): ReactElement {
  return (
    <div
      className={cls('chat-tool__meta', className)}
      data-slot='chat-tool-meta'
      {...props}
    >
      {toolCallId}
    </div>
  );
}
export function ChatToolGroupRoot({
  active = false,
  className,
  ...props
}: ComponentPropsWithRef<typeof Disclosure> & {
  active?: boolean;
}): ReactElement {
  return (
    <Disclosure
      className={cls('chat-tool-group', className)}
      data-active={active || undefined}
      data-slot='chat-tool-group'
      {...props}
    />
  );
}
export function ChatToolGroupTrigger({
  children,
  className,
  ...props
}: Omit<ComponentPropsWithRef<typeof Disclosure.Trigger>, 'children'> & {
  children: ReactNode;
}): ReactElement {
  return (
    <Disclosure.Heading>
      <Disclosure.Trigger
        className={cls('chat-tool-group__trigger', className)}
        data-slot='chat-tool-group-trigger'
        {...props}
      >
        <span className='chat-tool-group__trigger-label'>{children}</span>
        <Disclosure.Indicator className='text-muted size-3.5 shrink-0' />
      </Disclosure.Trigger>
    </Disclosure.Heading>
  );
}
export function ChatToolGroupContent({
  children,
  className,
  ...props
}: ComponentPropsWithRef<typeof Disclosure.Content>): ReactElement {
  return (
    <Disclosure.Content
      className={cls('chat-tool-group__content', className)}
      data-slot='chat-tool-group-content'
      {...props}
    >
      <Disclosure.Body>
        <div className='chat-tool-group__content-body'>{children}</div>
      </Disclosure.Body>
    </Disclosure.Content>
  );
}
type Tool = typeof ChatToolRoot & {
  Approval: typeof ChatToolApproval;
  ApprovalActions: typeof ChatToolApprovalActions;
  Approve: typeof ChatToolApprove;
  Args: typeof ChatToolArgs;
  Content: typeof ChatToolContent;
  Error: typeof ChatToolError;
  Meta: typeof ChatToolMeta;
  Reject: typeof ChatToolReject;
  Result: typeof ChatToolResult;
  Root: typeof ChatToolRoot;
  StatusIcon: typeof ChatToolStatusIcon;
  Trigger: typeof ChatToolTrigger;
};
export const ChatTool: Tool = Object.assign(ChatToolRoot, {
  Approval: ChatToolApproval,
  ApprovalActions: ChatToolApprovalActions,
  Approve: ChatToolApprove,
  Args: ChatToolArgs,
  Content: ChatToolContent,
  Error: ChatToolError,
  Meta: ChatToolMeta,
  Reject: ChatToolReject,
  Result: ChatToolResult,
  Root: ChatToolRoot,
  StatusIcon: ChatToolStatusIcon,
  Trigger: ChatToolTrigger,
});
type Group = typeof ChatToolGroupRoot & {
  Content: typeof ChatToolGroupContent;
  Root: typeof ChatToolGroupRoot;
  Trigger: typeof ChatToolGroupTrigger;
};
export const ChatToolGroup: Group = Object.assign(ChatToolGroupRoot, {
  Content: ChatToolGroupContent,
  Root: ChatToolGroupRoot,
  Trigger: ChatToolGroupTrigger,
});
