'use client';

import {
  Button,
  cn,
  ScrollShadow,
  Spinner,
  TextArea,
  Tooltip,
} from '@heroui/react';
import {
  AlertCircleIcon,
  ArrowUp01Icon,
  Cancel01Icon,
  CornerDownRightIcon,
  DragDropVerticalIcon,
  MoreHorizontalIcon,
  StopIcon,
} from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { Reorder, useDragControls } from 'motion/react';
import type {
  ComponentPropsWithRef,
  KeyboardEvent,
  ReactElement,
  ReactNode,
} from 'react';
import {
  createContext,
  useCallback,
  useContext,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

export type PromptInputStatus = 'error' | 'ready' | 'streaming' | 'submitted';
export type PromptInputLayout = 'compact' | 'inline' | 'stacked';
export type PromptInputSize = 'lg' | 'md' | 'sm';
export type PromptInputVariant = 'primary' | 'secondary';
interface PromptContextValue {
  allowSubmitWhileRunning: boolean;
  disabled: boolean;
  expanded: boolean;
  layout: PromptInputLayout;
  lockInputOnRun: boolean;
  maxHeight: number | string;
  onStop?: (() => void) | undefined;
  onSubmit?: (() => void) | undefined;
  setExpanded: (value: boolean) => void;
  setValue: (value: string) => void;
  status: PromptInputStatus;
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  value: string;
  variant: PromptInputVariant;
}
const Context = createContext<PromptContextValue | null>(null);
const usePrompt = (): PromptContextValue => {
  const value = useContext(Context);
  if (!value)
    throw new Error(
      'PromptInput subcomponents must be used within PromptInput',
    );
  return value;
};
const cls = (base: string, className: unknown): string =>
  cn(base, typeof className === 'string' ? className : undefined) ?? base;
const running = (status: PromptInputStatus): boolean =>
  status === 'submitted' || status === 'streaming';
const TEXTAREA_MIN_HEIGHT = 48;
const TEXTAREA_CLASS =
  'prompt-input__textarea border-0 bg-transparent shadow-none outline-none ring-0 hover:border-transparent hover:bg-transparent focus:border-transparent focus:bg-transparent focus:shadow-none focus:ring-0 focus-visible:ring-0 data-[focused=true]:border-transparent data-[hovered=true]:border-transparent data-[focused=true]:bg-transparent data-[hovered=true]:bg-transparent data-[focused=true]:shadow-none data-[focused=true]:ring-0';

const cssNumber = (value: string): number => {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
};
const verticalPadding = (element: HTMLTextAreaElement): number => {
  const style = getComputedStyle(element);
  return cssNumber(style.paddingTop) + cssNumber(style.paddingBottom);
};
const lineHeight = (element: HTMLTextAreaElement): number => {
  const style = getComputedStyle(element);
  const parsed = Number.parseFloat(style.lineHeight);
  if (Number.isFinite(parsed) && parsed > 0) return parsed;
  const fontSize = Number.parseFloat(style.fontSize);
  return Number.isFinite(fontSize) && fontSize > 0 ? fontSize * 1.2 : 20;
};
const naturalScrollHeight = (element: HTMLTextAreaElement): number => {
  const { height, maxHeight, minHeight } = element.style;
  element.style.height = '0px';
  element.style.minHeight = '0px';
  element.style.maxHeight = 'none';
  const scrollHeight = element.scrollHeight;
  element.style.height = height;
  element.style.minHeight = minHeight;
  element.style.maxHeight = maxHeight;
  return scrollHeight;
};
const shouldExpandTextarea = (element: HTMLTextAreaElement): boolean => {
  if (element.value.includes('\n')) return true;
  if (element.clientWidth === 0) return false;
  const contentHeight = Math.max(
    0,
    naturalScrollHeight(element) - verticalPadding(element),
  );
  return contentHeight > lineHeight(element) * 1.5;
};
export interface PromptInputRootProps extends ComponentPropsWithRef<'div'> {
  allowSubmitWhileRunning?: boolean;
  isDisabled?: boolean;
  isPending?: boolean;
  layout?: PromptInputLayout;
  lockInputOnRun?: boolean;
  maxHeight?: number | string;
  onStop?: () => void;
  onSubmit?: () => void;
  onValueChange?: (value: string) => void;
  size?: PromptInputSize;
  status?: PromptInputStatus;
  value?: string;
  variant?: PromptInputVariant;
}
export function PromptInputRoot({
  allowSubmitWhileRunning = false,
  children,
  className,
  isDisabled = false,
  isPending = false,
  layout = 'stacked',
  lockInputOnRun = true,
  maxHeight = 240,
  onStop,
  onSubmit,
  onValueChange,
  size = 'md',
  status,
  value,
  variant = 'primary',
  ...props
}: PromptInputRootProps): ReactElement {
  const [localValue, setLocalValue] = useState(value ?? '');
  const [expanded, setExpanded] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const currentValue = value ?? localValue;
  const currentStatus = status ?? (isPending ? 'streaming' : 'ready');
  const setValue = useCallback(
    (next: string) => {
      if (value === undefined) setLocalValue(next);
      onValueChange?.(next);
    },
    [onValueChange, value],
  );
  const context = useMemo(
    () => ({
      allowSubmitWhileRunning,
      disabled: isDisabled,
      expanded,
      layout,
      lockInputOnRun,
      maxHeight,
      onStop,
      onSubmit,
      setExpanded,
      setValue,
      status: currentStatus,
      textareaRef,
      value: currentValue,
      variant,
    }),
    [
      allowSubmitWhileRunning,
      currentStatus,
      currentValue,
      expanded,
      isDisabled,
      layout,
      lockInputOnRun,
      maxHeight,
      onStop,
      onSubmit,
      setValue,
      variant,
    ],
  );
  return (
    <Context value={context}>
      <div
        className={cls(
          size === 'md' ? 'prompt-input' : `prompt-input prompt-input--${size}`,
          className,
        )}
        data-disabled={isDisabled || undefined}
        data-expanded={(layout !== 'stacked' && expanded) || undefined}
        data-layout={layout}
        data-pending={running(currentStatus) || undefined}
        data-slot='prompt-input'
        data-status={currentStatus}
        data-variant={variant}
        {...props}
      >
        {children}
      </div>
    </Context>
  );
}
export function PromptInputShell({
  children,
  className,
  onClick,
  ...props
}: ComponentPropsWithRef<'div'>): ReactElement {
  const state = usePrompt();
  return (
    // Clicking the non-interactive shell is a pointer convenience that forwards
    // focus to the keyboard-accessible textarea.
    // oxlint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions
    <div
      className={cls(
        `prompt-input__shell${state.layout === 'stacked' ? '' : ` prompt-input__shell--${state.layout}`} prompt-input__shell--${state.variant}`,
        className,
      )}
      data-slot='prompt-input-shell'
      onClick={(event) => {
        onClick?.(event);
        if (
          !state.disabled &&
          !(event.target as Element).closest(
            'button,a,input,select,textarea,[role="button"],[data-slot="prompt-input-toolbar"],[data-slot="prompt-input-queue"],[data-slot="chat-attachment-remove"]',
          )
        )
          state.textareaRef.current?.focus();
      }}
      {...props}
    >
      {children}
    </div>
  );
}
type DivProps = ComponentPropsWithRef<'div'>;
type DivPart = (props: DivProps) => ReactElement;
const divPart = (base: string, slot: string) =>
  function Part({ className, ...props }: DivProps): ReactElement {
    usePrompt();
    return <div className={cls(base, className)} data-slot={slot} {...props} />;
  };
export const PromptInputContent: DivPart = divPart(
  'prompt-input__content',
  'prompt-input-content',
);
export const PromptInputAttachments: DivPart = divPart(
  'prompt-input__attachments',
  'prompt-input-attachments',
);
export const PromptInputToolbar: DivPart = divPart(
  'prompt-input__toolbar',
  'prompt-input-toolbar',
);
export const PromptInputToolbarStart: DivPart = divPart(
  'prompt-input__toolbar-start',
  'prompt-input-toolbar-start',
);
export const PromptInputToolbarEnd: DivPart = divPart(
  'prompt-input__toolbar-end',
  'prompt-input-toolbar-end',
);
export function PromptInputFooter({
  className,
  ...props
}: ComponentPropsWithRef<'p'>): ReactElement {
  usePrompt();
  return (
    <p
      className={cls('prompt-input__footer', className)}
      data-slot='prompt-input-footer'
      {...props}
    />
  );
}
export interface PromptInputTextAreaProps extends ComponentPropsWithRef<
  typeof TextArea
> {
  disableAutosize?: boolean;
}
export function PromptInputTextArea({
  className,
  disableAutosize = false,
  onKeyDown,
  ...props
}: PromptInputTextAreaProps): ReactElement {
  const state = usePrompt();
  const { expanded, layout, maxHeight, setExpanded } = state;
  const resize = useCallback(
    (element: HTMLTextAreaElement | null) => {
      if (!element || disableAutosize) return;
      const value = element.value;
      if (layout !== 'stacked') {
        const hasAttachments = Boolean(
          element
            .closest('[data-slot="prompt-input-shell"]')
            ?.querySelector('[data-slot="prompt-input-attachments"] > *'),
        );
        const hasValue = value.length > 0;
        const shouldExpand =
          hasAttachments || (hasValue && shouldExpandTextarea(element));
        if (shouldExpand && !expanded) {
          setExpanded(true);
          return;
        }
        if (!hasValue && !hasAttachments && expanded) {
          setExpanded(false);
          return;
        }
        if (!expanded && !hasAttachments) {
          element.style.height = `${Math.max(
            TEXTAREA_MIN_HEIGHT,
            lineHeight(element) + verticalPadding(element),
          )}px`;
          return;
        }
      }
      element.style.height = 'auto';
      element.style.height =
        typeof maxHeight === 'number'
          ? `${Math.min(element.scrollHeight, maxHeight)}px`
          : `min(${element.scrollHeight}px, ${maxHeight})`;
    },
    [disableAutosize, expanded, layout, maxHeight, setExpanded],
  );
  useLayoutEffect(
    () => resize(state.textareaRef.current),
    [resize, state.textareaRef, state.value],
  );
  const keydown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      if (!running(state.status) || state.allowSubmitWhileRunning)
        state.onSubmit?.();
    }
    onKeyDown?.(event);
  };
  return (
    <TextArea
      ref={state.textareaRef}
      fullWidth
      aria-label={props['aria-label'] ?? 'Message input'}
      className={cls(TEXTAREA_CLASS, className)}
      data-slot='prompt-input-textarea'
      disabled={
        state.disabled || (state.lockInputOnRun && running(state.status))
      }
      placeholder={props.placeholder ?? 'What do you want to know?'}
      rows={1}
      value={state.value}
      onChange={(event) => {
        state.setValue(event.target.value);
        resize(event.target);
      }}
      onKeyDown={keydown}
      {...props}
    />
  );
}
const SendIcon = ({ status }: { status: PromptInputStatus }): ReactElement =>
  status === 'submitted' ? (
    <Spinner color='current' size='sm' />
  ) : status === 'streaming' ? (
    <HugeiconsIcon aria-hidden icon={StopIcon} size={16} strokeWidth={2} />
  ) : status === 'error' ? (
    <HugeiconsIcon
      aria-hidden
      icon={AlertCircleIcon}
      size={16}
      strokeWidth={2}
    />
  ) : (
    <HugeiconsIcon aria-hidden icon={ArrowUp01Icon} size={16} strokeWidth={2} />
  );
export interface PromptInputSendProps extends ComponentPropsWithRef<
  typeof Button
> {
  onStop?: () => void;
  status?: PromptInputStatus;
}
export function PromptInputSend({
  children,
  className,
  isDisabled,
  onPress,
  onStop,
  status,
  ...props
}: PromptInputSendProps): ReactElement {
  const state = usePrompt();
  const current = status ?? state.status;
  const stop = onStop ?? state.onStop;
  const isRunning = running(current);
  const submitWhileRunning =
    state.allowSubmitWhileRunning &&
    isRunning &&
    (isDisabled === false ||
      (isDisabled === undefined && Boolean(state.value.trim())));
  const canStop = isRunning && Boolean(stop) && !submitWhileRunning;
  const disabled =
    isDisabled ??
    (state.disabled ||
      (isRunning &&
        !canStop &&
        !(state.allowSubmitWhileRunning && state.value.trim())) ||
      (!isRunning && !state.value.trim()));
  return (
    <Button
      {...props}
      isIconOnly
      aria-label={props['aria-label'] ?? (canStop ? 'Stop' : 'Send message')}
      className={cls('prompt-input__send', className)}
      data-slot='prompt-input-send'
      data-status={current}
      isDisabled={disabled}
      size='sm'
      onPress={(event) => {
        if (canStop) {
          stop?.();
          onPress?.(event);
        } else {
          onPress?.(event);
          state.onSubmit?.();
        }
      }}
    >
      {children ?? <SendIcon status={submitWhileRunning ? 'ready' : current} />}
    </Button>
  );
}
export interface PromptInputActionProps extends ComponentPropsWithRef<
  typeof Button
> {
  tooltip?: ReactNode;
}
export function PromptInputAction({
  children,
  className,
  isDisabled,
  tooltip,
  variant = 'tertiary',
  ...props
}: PromptInputActionProps): ReactElement {
  const state = usePrompt();
  const button = (
    <Button
      {...props}
      isIconOnly
      className={cls('', className)}
      data-slot='prompt-input-action'
      isDisabled={
        state.disabled ||
        isDisabled ||
        (state.lockInputOnRun && running(state.status))
      }
      size='sm'
      variant={variant}
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
const QueueContext = createContext({ reorderEnabled: false });
export interface PromptInputQueueProps extends ComponentPropsWithRef<'div'> {
  actionsVisibility?: 'always' | 'hover';
}
export function PromptInputQueue({
  actionsVisibility = 'hover',
  className,
  ...props
}: PromptInputQueueProps): ReactElement {
  usePrompt();
  return (
    <div
      className={cls('prompt-input__queue', className)}
      data-actions-visibility={actionsVisibility}
      data-slot='prompt-input-queue'
      {...props}
    />
  );
}
export interface PromptInputQueueListProps<T> extends Omit<
  ComponentPropsWithRef<'ul'>,
  'onReorder'
> {
  axis?: 'x' | 'y';
  onReorder?: (values: T[]) => void;
  values?: T[];
}
export function PromptInputQueueList<T>({
  axis = 'y',
  children,
  className,
  onReorder,
  values,
  ...props
}: PromptInputQueueListProps<T>): ReactElement {
  usePrompt();
  const enabled =
    values !== undefined && onReorder !== undefined && values.length > 1;
  const contextValue = useMemo(() => ({ reorderEnabled: enabled }), [enabled]);

  return (
    <QueueContext value={contextValue}>
      <ScrollShadow
        className={cls('prompt-input__queue-list', className)}
        data-slot='prompt-input-queue-list'
        isEnabled={(values?.length ?? 0) > 1}
      >
        {enabled ? (
          <Reorder.Group
            as='ul'
            axis={axis}
            className='prompt-input__queue-list-items'
            values={values}
            onReorder={onReorder}
          >
            {children}
          </Reorder.Group>
        ) : (
          <ul className='prompt-input__queue-list-items' {...props}>
            {children}
          </ul>
        )}
      </ScrollShadow>
    </QueueContext>
  );
}
interface ItemContextValue {
  dragControls: ReturnType<typeof useDragControls>;
}
const ItemContext = createContext<ItemContextValue | null>(null);
export interface PromptInputQueueItemProps<T> extends Omit<
  ComponentPropsWithRef<'li'>,
  'value'
> {
  value?: T;
}
export function PromptInputQueueItem<T>({
  children,
  className,
  value,
  ...props
}: PromptInputQueueItemProps<T>): ReactElement {
  const state = usePrompt();
  const { reorderEnabled } = useContext(QueueContext);
  const controls = useDragControls();
  const contextValue = useMemo(() => ({ dragControls: controls }), [controls]);
  const content = (
    <ItemContext value={contextValue}>
      {reorderEnabled && value !== undefined ? (
        <Reorder.Item
          as='li'
          className={cls('prompt-input__queue-item', className)}
          data-slot='prompt-input-queue-item'
          drag={state.disabled ? false : 'y'}
          dragControls={controls}
          dragListener={false}
          value={value}
        >
          {children}
        </Reorder.Item>
      ) : (
        <li
          className={cls('prompt-input__queue-item', className)}
          data-slot='prompt-input-queue-item'
          {...props}
        >
          {children}
        </li>
      )}
    </ItemContext>
  );
  return content;
}
const queueDivPart = (base: string, slot: string) =>
  function Part({ className, ...props }: DivProps): ReactElement {
    usePrompt();
    return <div className={cls(base, className)} data-slot={slot} {...props} />;
  };
export const PromptInputQueueItemBody: DivPart = queueDivPart(
  'prompt-input__queue-item-body',
  'prompt-input-queue-item-body',
);
export const PromptInputQueueItemActions: DivPart = queueDivPart(
  'prompt-input__queue-item-actions',
  'prompt-input-queue-item-actions',
);
export const PromptInputQueueItemAttachments: DivPart = queueDivPart(
  'prompt-input__queue-item-attachments',
  'prompt-input-queue-item-attachments',
);
export function PromptInputQueueItemContent({
  className,
  ...props
}: ComponentPropsWithRef<'p'>): ReactElement {
  usePrompt();
  return (
    <p
      className={cls('prompt-input__queue-item-content', className)}
      data-slot='prompt-input-queue-item-content'
      {...props}
    />
  );
}
export function PromptInputQueueItemDescription({
  className,
  ...props
}: ComponentPropsWithRef<'p'>): ReactElement {
  usePrompt();
  return (
    <p
      className={cls('prompt-input__queue-item-description', className)}
      data-slot='prompt-input-queue-item-description'
      {...props}
    />
  );
}
export function PromptInputQueueItemIcon({
  children,
  className,
  ...props
}: ComponentPropsWithRef<'span'>): ReactElement {
  usePrompt();
  return (
    <span
      className={cls('prompt-input__queue-item-icon', className)}
      data-slot='prompt-input-queue-item-icon'
      {...props}
    >
      {children ?? (
        <HugeiconsIcon
          aria-hidden
          icon={CornerDownRightIcon}
          size={16}
          strokeWidth={2}
        />
      )}
    </span>
  );
}
export function PromptInputQueueItemHandle({
  children,
  className,
  isDisabled,
  onPointerDown,
  ...props
}: ComponentPropsWithRef<typeof Button>): ReactElement {
  const state = usePrompt();
  const reorder = useContext(QueueContext);
  const item = useContext(ItemContext);
  return (
    <Button
      {...props}
      className={cls('prompt-input__queue-item-handle', className)}
      data-reorder-enabled={reorder.reorderEnabled || undefined}
      data-slot='prompt-input-queue-item-handle'
      isDisabled={Boolean(
        state.disabled || !reorder.reorderEnabled || isDisabled,
      )}
      size='sm'
      variant='ghost'
      onPointerDown={(event) => {
        if (!state.disabled && reorder.reorderEnabled)
          item?.dragControls.start(event);
        onPointerDown?.(event);
      }}
    >
      {children ?? (
        <HugeiconsIcon
          aria-hidden
          icon={DragDropVerticalIcon}
          size={16}
          strokeWidth={2}
        />
      )}
    </Button>
  );
}
export interface QueueOverflowProps extends ComponentPropsWithRef<'span'> {
  hiddenCount: number;
  noun?: string;
}
export function PromptInputQueueItemAttachmentsOverflow({
  className,
  hiddenCount,
  noun = 'files',
  ...props
}: QueueOverflowProps): ReactElement | null {
  usePrompt();
  return hiddenCount <= 0 ? null : (
    <span
      className={cls(
        'prompt-input__queue-item-attachments-overflow',
        className,
      )}
      data-slot='prompt-input-queue-item-attachments-overflow'
      {...props}
    >
      +{hiddenCount} {noun}
    </span>
  );
}
type QueueButtonProps = ComponentPropsWithRef<typeof Button>;
type QueueButton = (props: QueueButtonProps) => ReactElement;
const queueButton = (slot: string, label: string, fallback: ReactNode) =>
  function QueueButton({
    children,
    isDisabled,
    ...props
  }: QueueButtonProps): ReactElement {
    const state = usePrompt();
    return (
      <Button
        {...props}
        isIconOnly
        aria-label={props['aria-label'] ?? label}
        data-slot={slot}
        isDisabled={Boolean(state.disabled || isDisabled)}
        size='sm'
        variant='ghost'
      >
        {children ?? fallback}
      </Button>
    );
  };
export const PromptInputQueueItemRemove: QueueButton = queueButton(
  'prompt-input-queue-item-remove',
  'Remove from queue',
  <HugeiconsIcon aria-hidden icon={Cancel01Icon} size={16} strokeWidth={2} />,
);
export const PromptInputQueueItemMore: QueueButton = queueButton(
  'prompt-input-queue-item-more',
  'More queue actions',
  <HugeiconsIcon
    aria-hidden
    icon={MoreHorizontalIcon}
    size={16}
    strokeWidth={2}
  />,
);
export function PromptInputQueueItemAction({
  children,
  isDisabled,
  isIconOnly = !children,
  ...props
}: QueueButtonProps): ReactElement {
  const state = usePrompt();
  return (
    <Button
      {...props}
      data-slot='prompt-input-queue-item-action'
      isDisabled={Boolean(state.disabled || isDisabled)}
      isIconOnly={isIconOnly}
      size='sm'
      variant='ghost'
    >
      {children}
    </Button>
  );
}
export function PromptInputQueueItemSteer({
  children,
  isDisabled,
  ...props
}: QueueButtonProps): ReactElement {
  const state = usePrompt();
  return (
    <Button
      {...props}
      data-slot='prompt-input-queue-item-steer'
      isDisabled={Boolean(state.disabled || isDisabled)}
      size='sm'
      variant='ghost'
    >
      {children ?? (
        <>
          <HugeiconsIcon
            aria-hidden
            icon={CornerDownRightIcon}
            size={16}
            strokeWidth={2}
          />
          Steer
        </>
      )}
    </Button>
  );
}
type QueueItemComponent = typeof PromptInputQueueItem & {
  Action: typeof PromptInputQueueItemAction;
  Actions: typeof PromptInputQueueItemActions;
  Attachments: typeof PromptInputQueueItemAttachments;
  AttachmentsOverflow: typeof PromptInputQueueItemAttachmentsOverflow;
  Body: typeof PromptInputQueueItemBody;
  Content: typeof PromptInputQueueItemContent;
  Description: typeof PromptInputQueueItemDescription;
  Handle: typeof PromptInputQueueItemHandle;
  Icon: typeof PromptInputQueueItemIcon;
  More: typeof PromptInputQueueItemMore;
  Remove: typeof PromptInputQueueItemRemove;
  Steer: typeof PromptInputQueueItemSteer;
};
const QueueItem: QueueItemComponent = Object.assign(PromptInputQueueItem, {
  Action: PromptInputQueueItemAction,
  Actions: PromptInputQueueItemActions,
  Attachments: PromptInputQueueItemAttachments,
  AttachmentsOverflow: PromptInputQueueItemAttachmentsOverflow,
  Body: PromptInputQueueItemBody,
  Content: PromptInputQueueItemContent,
  Description: PromptInputQueueItemDescription,
  Handle: PromptInputQueueItemHandle,
  Icon: PromptInputQueueItemIcon,
  More: PromptInputQueueItemMore,
  Remove: PromptInputQueueItemRemove,
  Steer: PromptInputQueueItemSteer,
});
type QueueComponent = typeof PromptInputQueue & {
  Item: QueueItemComponent;
  List: typeof PromptInputQueueList;
};
const Queue: QueueComponent = Object.assign(PromptInputQueue, {
  Item: QueueItem,
  List: PromptInputQueueList,
});
type PromptInputComponent = typeof PromptInputRoot & {
  Action: typeof PromptInputAction;
  Attachments: typeof PromptInputAttachments;
  Content: typeof PromptInputContent;
  Footer: typeof PromptInputFooter;
  Queue: QueueComponent;
  Root: typeof PromptInputRoot;
  Send: typeof PromptInputSend;
  Shell: typeof PromptInputShell;
  TextArea: typeof PromptInputTextArea;
  Toolbar: typeof PromptInputToolbar;
  ToolbarEnd: typeof PromptInputToolbarEnd;
  ToolbarStart: typeof PromptInputToolbarStart;
};
export const PromptInput: PromptInputComponent = Object.assign(
  PromptInputRoot,
  {
    Action: PromptInputAction,
    Attachments: PromptInputAttachments,
    Content: PromptInputContent,
    Footer: PromptInputFooter,
    Queue,
    Root: PromptInputRoot,
    Send: PromptInputSend,
    Shell: PromptInputShell,
    TextArea: PromptInputTextArea,
    Toolbar: PromptInputToolbar,
    ToolbarEnd: PromptInputToolbarEnd,
    ToolbarStart: PromptInputToolbarStart,
  },
);
