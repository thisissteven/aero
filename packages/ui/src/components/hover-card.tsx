'use client';

import { cn } from '@heroui/react';
import type {
  ComponentPropsWithRef,
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
  OverlayArrow,
  Popover as RacPopover,
} from 'react-aria-components';

interface ContextValue {
  cancelClose: () => void;
  close: (immediate?: boolean) => void;
  isOpen: boolean;
  isPointerInsideRef: { current: boolean };
  open: (immediate?: boolean) => void;
  setTrigger: (node: HTMLElement | null) => void;
  triggerRef: { current: HTMLElement | null };
}
const Context = createContext<ContextValue | null>(null);
const useHoverCard = () => {
  const context = useContext(Context);
  if (!context)
    throw new Error('HoverCard parts must be used inside HoverCard.Root');
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

export interface HoverCardRootProps {
  children: ReactNode;
  closeDelay?: number;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  open?: boolean;
  openDelay?: number;
}
function HoverCardRoot({
  children,
  closeDelay = 300,
  defaultOpen = false,
  onOpenChange,
  open: controlledOpen,
  openDelay = 700,
}: HoverCardRootProps): ReactElement {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(defaultOpen);
  const isOpen = controlledOpen ?? uncontrolledOpen;
  const triggerRef = useRef<HTMLElement | null>(null),
    isPointerInsideRef = useRef(false);
  const openTimer = useRef<ReturnType<typeof setTimeout> | undefined>(
      undefined,
    ),
    closeTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
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
      setTrigger: (node: HTMLElement | null) => {
        triggerRef.current = node;
      },
      triggerRef,
    }),
    [cancelClose, close, isOpen, open],
  );
  return <Context value={value}>{children}</Context>;
}

export interface HoverCardTriggerProps extends ComponentPropsWithRef<'span'> {}
function HoverCardTrigger({
  className,
  onBlur,
  onFocus,
  onPointerEnter,
  onPointerLeave,
  ref,
  ...props
}: HoverCardTriggerProps): ReactElement {
  const context = useHoverCard();
  return (
    <span
      {...props}
      className={cn('hover-card__trigger', className)}
      data-slot='hover-card-trigger'
      onBlur={(event) => {
        if (!context.isPointerInsideRef.current) context.close();
        onBlur?.(event);
      }}
      onFocus={(event) => {
        context.open(true);
        onFocus?.(event);
      }}
      onPointerEnter={(event) => {
        if (event.pointerType === 'mouse') context.open();
        onPointerEnter?.(event);
      }}
      onPointerLeave={(event) => {
        if (event.pointerType === 'mouse') context.close();
        onPointerLeave?.(event);
      }}
      ref={setRefs(ref, context.setTrigger)}
    />
  );
}

export interface HoverCardContentProps extends Omit<
  ComponentPropsWithRef<typeof RacPopover>,
  'isOpen' | 'triggerRef'
> {
  offset?: number;
}
function HoverCardContent({
  className,
  offset = 8,
  onOpenChange,
  onPointerEnter,
  onPointerLeave,
  placement = 'top',
  ...props
}: HoverCardContentProps): ReactElement {
  const context = useHoverCard();
  return (
    <RacPopover
      {...props}
      className={composeRenderProps(
        className,
        (resolvedClassName) =>
          cn('hover-card__content', resolvedClassName) ?? '',
      )}
      data-slot='hover-card-content'
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
      placement={placement}
      triggerRef={context.triggerRef}
    />
  );
}

export interface HoverCardArrowProps extends ComponentPropsWithRef<
  typeof OverlayArrow
> {}
function HoverCardArrow({
  children,
  className,
  ...props
}: HoverCardArrowProps): ReactElement {
  return (
    <OverlayArrow
      {...props}
      className={composeRenderProps(
        className,
        (resolvedClassName) => cn('hover-card__arrow', resolvedClassName) ?? '',
      )}
      data-slot='hover-card-arrow'
    >
      {children ?? (
        <svg
          fill='none'
          height='12'
          viewBox='0 0 12 12'
          width='12'
          xmlns='http://www.w3.org/2000/svg'
        >
          <path d='M0 0C5.48483 8 6.5 8 12 0Z' />
        </svg>
      )}
    </OverlayArrow>
  );
}

type HoverCardComponent = typeof HoverCardRoot & {
  Arrow: typeof HoverCardArrow;
  Content: typeof HoverCardContent;
  Root: typeof HoverCardRoot;
  Trigger: typeof HoverCardTrigger;
};
export const HoverCard: HoverCardComponent = Object.assign(HoverCardRoot, {
  Arrow: HoverCardArrow,
  Content: HoverCardContent,
  Root: HoverCardRoot,
  Trigger: HoverCardTrigger,
});
export { HoverCardArrow, HoverCardContent, HoverCardRoot, HoverCardTrigger };
