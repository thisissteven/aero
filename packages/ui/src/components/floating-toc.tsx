'use client';

import { cn } from '@heroui/react';
import type {
  ComponentPropsWithRef,
  CSSProperties,
  PointerEvent as ReactPointerEvent,
  ReactElement,
  ReactNode,
  Ref,
} from 'react';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  composeRenderProps,
  Popover as RacPopover,
} from 'react-aria-components';

type Placement = 'left' | 'right';
type TriggerMode = 'hover' | 'press';
interface ContextValue {
  cancelClose: () => void;
  close: (immediate?: boolean) => void;
  isOpen: boolean;
  isPointerInsideRef: { current: boolean };
  open: (immediate?: boolean) => void;
  placement: Placement;
  setTrigger: (node: HTMLElement | null) => void;
  triggerMode: TriggerMode;
  triggerRef: { current: HTMLElement | null };
}
const Context = createContext<ContextValue | null>(null);
const useFloatingToc = () => {
  const context = useContext(Context);
  if (!context)
    throw new Error('FloatingToc parts must be used inside FloatingToc.Root');
  return context;
};
const setRefs =
  <T,>(...refs: Array<Ref<T> | undefined>) =>
  (value: T | null) => {
    for (const ref of refs) {
      if (typeof ref === 'function') ref(value);
      else if (ref) ref.current = value;
    }
  };

/**
 * Safely scrolls an element into view within its immediate scroll container
 * without bubbling up and shifting page/window containers.
 */
function scrollIntoParentView(
  element: HTMLElement | null,
  behavior: ScrollBehavior = 'smooth',
) {
  if (!element) return;

  // Find nearest scrollable parent element
  let parent = element.parentElement;
  while (parent) {
    const { overflowY } = window.getComputedStyle(parent);
    if (overflowY === 'auto' || overflowY === 'scroll') break;
    parent = parent.parentElement;
  }

  if (!parent) return;

  const elemRect = element.getBoundingClientRect();
  const parentRect = parent.getBoundingClientRect();

  // Calculate target position centered inside parent
  const targetTop =
    parent.scrollTop +
    (elemRect.top - parentRect.top) -
    parent.clientHeight / 2 +
    elemRect.height / 2;

  parent.scrollTo({
    top: Math.max(0, targetTop),
    behavior,
  });
}

export interface FloatingTocRootProps {
  children: ReactNode;
  closeDelay?: number;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  open?: boolean;
  openDelay?: number;
  placement?: Placement;
  triggerMode?: TriggerMode;
}
function FloatingTocRoot({
  children,
  closeDelay = 300,
  defaultOpen = false,
  onOpenChange,
  open: controlledOpen,
  openDelay = 200,
  placement = 'right',
  triggerMode = 'hover',
}: FloatingTocRootProps): ReactElement {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(defaultOpen);
  const isOpen = controlledOpen ?? uncontrolledOpen;
  const triggerRef = useRef<HTMLElement | null>(null);
  const isPointerInsideRef = useRef(false);
  const openTimer = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );
  const closeTimer = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );
  const setOpen = useCallback(
    (value: boolean) => {
      if (controlledOpen === undefined) setUncontrolledOpen(value);
      onOpenChange?.(value);
    },
    [controlledOpen, onOpenChange],
  );
  const clearTimers = useCallback(() => {
    clearTimeout(openTimer.current);
    clearTimeout(closeTimer.current);
  }, []);
  useEffect(() => clearTimers, [clearTimers]);
  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
        clearTimers();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [clearTimers, isOpen, setOpen]);
  const open = useCallback(
    (immediate = false) => {
      clearTimers();
      if (immediate || openDelay <= 0) setOpen(true);
      else openTimer.current = setTimeout(() => setOpen(true), openDelay);
    },
    [clearTimers, openDelay, setOpen],
  );
  const close = useCallback(
    (immediate = false) => {
      clearTimers();
      if (immediate || closeDelay <= 0) setOpen(false);
      else closeTimer.current = setTimeout(() => setOpen(false), closeDelay);
    },
    [clearTimers, closeDelay, setOpen],
  );
  const cancelClose = useCallback(() => clearTimeout(closeTimer.current), []);
  const value = useMemo(
    () => ({
      cancelClose,
      close,
      isOpen,
      isPointerInsideRef,
      open,
      placement,
      setTrigger: (node: HTMLElement | null) => {
        triggerRef.current = node;
      },
      triggerMode,
      triggerRef,
    }),
    [cancelClose, close, isOpen, open, placement, triggerMode],
  );
  return <Context value={value}>{children}</Context>;
}

export interface FloatingTocTriggerProps extends ComponentPropsWithRef<'span'> {}
function FloatingTocTrigger({
  className,
  onBlur,
  onClick,
  onFocus,
  onKeyDown,
  onPointerEnter,
  onPointerLeave,
  ref,
  ...props
}: FloatingTocTriggerProps): ReactElement {
  const context = useFloatingToc();
  const isHover = context.triggerMode === 'hover';
  return (
    <span
      {...props}
      className={cn('floating-toc__trigger', className)}
      data-placement={context.placement}
      data-slot='floating-toc-trigger'
      onBlur={
        isHover
          ? (event) => {
              if (!context.isPointerInsideRef.current) context.close();
              onBlur?.(event);
            }
          : onBlur
      }
      onClick={(event) => {
        if (isHover) context.open(true);
        else if (context.isOpen) context.close(true);
        else context.open(true);
        onClick?.(event);
      }}
      onFocus={
        isHover
          ? (event) => {
              context.open(true);
              onFocus?.(event);
            }
          : onFocus
      }
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          if (context.isOpen) context.close(true);
          else context.open(true);
        }
        onKeyDown?.(event);
      }}
      onPointerEnter={
        isHover
          ? (event) => {
              if (event.pointerType === 'mouse') context.open();
              onPointerEnter?.(event);
            }
          : onPointerEnter
      }
      onPointerLeave={
        isHover
          ? (event) => {
              if (event.pointerType === 'mouse') context.close();
              onPointerLeave?.(event);
            }
          : onPointerLeave
      }
      ref={setRefs(ref, context.setTrigger)}
      role='button'
      tabIndex={0}
    />
  );
}

export interface FloatingTocBarProps extends ComponentPropsWithRef<'span'> {
  active?: boolean;
  level?: number;
}
function FloatingTocBar({
  active,
  className,
  level,
  ref,
  style,
  ...props
}: FloatingTocBarProps): ReactElement {
  const innerRef = useRef<HTMLSpanElement | null>(null);

  useEffect(() => {
    if (active) {
      scrollIntoParentView(innerRef.current, 'smooth');
    }
  }, [active]);

  return (
    <span
      {...props}
      className={cn('floating-toc__bar', className)}
      data-active={active || undefined}
      data-slot='floating-toc-bar'
      ref={setRefs(ref, innerRef)}
      style={
        level != null && level > 1
          ? ({ ...style, '--floating-toc-level': level } as CSSProperties)
          : style
      }
    />
  );
}

export interface FloatingTocContentProps extends Omit<
  ComponentPropsWithRef<typeof RacPopover>,
  'isOpen' | 'triggerRef'
> {
  offset?: number;
}
function FloatingTocContent({
  className,
  offset = 8,
  onOpenChange,
  onPointerEnter,
  onPointerLeave,
  placement,
  ...props
}: FloatingTocContentProps): ReactElement {
  const context = useFloatingToc();
  const contentRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (context.isOpen && contentRef.current) {
      requestAnimationFrame(() => {
        const activeItem = contentRef.current?.querySelector<HTMLElement>(
          '[data-slot="floating-toc-item"][data-active="true"]',
        );
        if (activeItem) {
          scrollIntoParentView(activeItem, 'instant');
        }
      });
    }
  }, [context.isOpen]);

  return (
    <RacPopover
      {...props}
      className={composeRenderProps(
        className,
        (resolvedClassName) =>
          cn('floating-toc__content', resolvedClassName) ?? '',
      )}
      data-slot='floating-toc-content'
      isNonModal
      isOpen={context.isOpen}
      offset={offset}
      onOpenChange={(open) => {
        if (!open) context.close(true);
        onOpenChange?.(open);
      }}
      onPointerEnter={(event: ReactPointerEvent<HTMLDivElement>) => {
        context.isPointerInsideRef.current = true;
        context.cancelClose();
        onPointerEnter?.(event);
      }}
      onPointerLeave={(event: ReactPointerEvent<HTMLDivElement>) => {
        context.isPointerInsideRef.current = false;
        context.close();
        onPointerLeave?.(event);
      }}
      placement={placement ?? (context.placement === 'left' ? 'right' : 'left')}
      ref={contentRef}
      triggerRef={context.triggerRef}
    />
  );
}

export interface FloatingTocItemProps extends ComponentPropsWithRef<'button'> {
  active?: boolean;
  level?: number;
}
function FloatingTocItem({
  active,
  className,
  level,
  ref,
  style,
  type = 'button',
  ...props
}: FloatingTocItemProps): ReactElement {
  const innerRef = useRef<HTMLButtonElement | null>(null);

  // Inside FloatingTocItem
  useEffect(() => {
    if (active) {
      scrollIntoParentView(innerRef.current, 'smooth');
    }
  }, [active]);

  return (
    <button
      {...props}
      className={cn('floating-toc__item', className)}
      data-active={active || undefined}
      data-slot='floating-toc-item'
      ref={setRefs(ref, innerRef)}
      style={
        level != null && level > 1
          ? ({ ...style, '--floating-toc-level': level } as CSSProperties)
          : style
      }
      type={type}
    />
  );
}
type FloatingTocComponent = typeof FloatingTocRoot & {
  Bar: typeof FloatingTocBar;
  Content: typeof FloatingTocContent;
  Item: typeof FloatingTocItem;
  Root: typeof FloatingTocRoot;
  Trigger: typeof FloatingTocTrigger;
};
export const FloatingToc: FloatingTocComponent = Object.assign(
  FloatingTocRoot,
  {
    Bar: FloatingTocBar,
    Content: FloatingTocContent,
    Item: FloatingTocItem,
    Root: FloatingTocRoot,
    Trigger: FloatingTocTrigger,
  },
);
export {
  FloatingTocBar,
  FloatingTocContent,
  FloatingTocItem,
  FloatingTocRoot,
  FloatingTocTrigger,
};
