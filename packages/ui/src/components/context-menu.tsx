'use client';
import {
  cn,
  DropdownItem,
  DropdownItemIndicator,
  DropdownSection,
  DropdownSubmenuIndicator,
  DropdownSubmenuTrigger,
} from '@heroui/react';
import type {
  ComponentPropsWithRef,
  ReactElement,
  ReactNode,
  TouchEvent as ReactTouchEvent,
} from 'react';
import {
  cloneElement,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Menu, Popover, Separator } from 'react-aria-components';

interface State {
  anchorRef: React.RefObject<HTMLDivElement | null>;
  close: () => void;
  disabled: boolean;
  open: (x: number, y: number) => void;
  isOpen: boolean;
  popoverRef: React.RefObject<HTMLDivElement | null>;
  triggerRef: React.RefObject<HTMLDivElement | null>;
}
const Context = createContext<State | null>(null);
const useStateContext = () => {
  const x = useContext(Context);
  if (!x) throw new Error('ContextMenu parts must be inside ContextMenu');
  return x;
};
export interface ContextMenuRootProps {
  children: ReactNode;
  defaultOpen?: boolean;
  isDisabled?: boolean;
  onOpenChange?: (open: boolean) => void;
  open?: boolean;
}
export function ContextMenuRoot({
  children,
  defaultOpen = false,
  isDisabled = false,
  onOpenChange,
  open,
}: ContextMenuRootProps): ReactElement {
  const [local, setLocal] = useState(defaultOpen);
  const isOpen = open ?? local;
  const setOpen = useCallback(
    (value: boolean) => {
      if (open === undefined) setLocal(value);
      onOpenChange?.(value);
    },
    [onOpenChange, open],
  );
  const anchorRef = useRef<HTMLDivElement>(null),
    triggerRef = useRef<HTMLDivElement>(null),
    popoverRef = useRef<HTMLDivElement>(null);
  const handleOpen = useCallback(
    (x: number, y: number) => {
      if (isDisabled) return;
      const anchor = anchorRef.current,
        trigger = triggerRef.current;
      if (anchor && trigger) {
        const r = trigger.getBoundingClientRect();
        anchor.style.left = `${x - r.left}px`;
        anchor.style.top = `${y - r.top}px`;
      }
      setOpen(true);
    },
    [isDisabled, setOpen],
  );
  const close = useCallback(() => setOpen(false), [setOpen]);
  useEffect(() => {
    if (!isOpen) return;
    const handler = (event: Event) => {
      if (!popoverRef.current?.contains(event.target as Node)) close();
    };
    window.addEventListener('scroll', handler, true);
    return () => window.removeEventListener('scroll', handler, true);
  }, [close, isOpen]);
  const value = useMemo(
    () => ({
      anchorRef,
      close,
      disabled: isDisabled,
      open: handleOpen,
      isOpen,
      popoverRef,
      triggerRef,
    }),
    [close, handleOpen, isDisabled, isOpen],
  );
  return <Context value={value}>{children}</Context>;
}
export interface ContextMenuTriggerProps extends ComponentPropsWithRef<'div'> {
  children: ReactNode;
}
export function ContextMenuTrigger({
  children,
  className,
  ...props
}: ContextMenuTriggerProps): ReactElement {
  const state = useStateContext();
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const touch = useRef<{ x: number; y: number } | null>(null);
  useEffect(() => () => clearTimeout(timer.current), []);
  const finish = () => {
    clearTimeout(timer.current);
    touch.current = null;
  };
  const move = (e: ReactTouchEvent) => {
    if (!touch.current || e.touches.length !== 1) return;
    const p = e.touches.item(0);
    if (!p) return;
    if (
      Math.abs(p.clientX - touch.current.x) > 10 ||
      Math.abs(p.clientY - touch.current.y) > 10
    )
      clearTimeout(timer.current);
  };
  return (
    <div
      {...props}
      ref={state.triggerRef}
      className={cn('context-menu__trigger', className)}
      data-slot='context-menu-trigger'
      onContextMenu={(e) => {
        e.preventDefault();
        e.stopPropagation();
        if (state.isOpen) state.close();
        else state.open(e.clientX, e.clientY);
      }}
      onTouchCancel={finish}
      onTouchEnd={finish}
      onTouchMove={move}
      onTouchStart={(e) => {
        if (e.touches.length !== 1) return;
        const p = e.touches.item(0);
        if (!p) return;
        touch.current = { x: p.clientX, y: p.clientY };
        timer.current = setTimeout(() => state.open(p.clientX, p.clientY), 500);
      }}
    >
      {children}
      <div
        ref={state.anchorRef}
        aria-hidden='true'
        style={{
          height: 0,
          pointerEvents: 'none',
          position: 'absolute',
          width: 0,
        }}
      />
    </div>
  );
}
interface InternalPopoverProps {
  _nested?: boolean;
}
export interface ContextMenuPopoverProps extends Omit<
  ComponentPropsWithRef<typeof Popover>,
  'children' | 'isOpen' | 'triggerRef'
> {
  children: ReactNode;
  offset?: number;
}
export function ContextMenuPopover({
  _nested = false,
  children,
  className,
  offset = 2,
  placement,
  ...props
}: ContextMenuPopoverProps & InternalPopoverProps): ReactElement {
  const state = useStateContext();
  return _nested ? (
    <Popover
      {...props}
      className={
        cn(
          'context-menu__popover',
          typeof className === 'string' ? className : undefined,
        ) ?? 'context-menu__popover'
      }
      data-slot='context-menu-popover'
      offset={offset}
      {...(placement === undefined ? {} : { placement })}
    >
      {children}
    </Popover>
  ) : (
    <Popover
      {...props}
      ref={state.popoverRef}
      className={
        cn(
          'context-menu__popover',
          typeof className === 'string' ? className : undefined,
        ) ?? 'context-menu__popover'
      }
      data-slot='context-menu-popover'
      isOpen={state.isOpen}
      offset={offset}
      placement={placement ?? 'bottom start'}
      triggerRef={state.anchorRef}
      onOpenChange={(value) => {
        if (!value) state.close();
      }}
    >
      {children}
    </Popover>
  );
}
export type ContextMenuMenuProps<T extends object = object> =
  ComponentPropsWithRef<typeof Menu<T>>;
export function ContextMenuMenu<T extends object = object>({
  className,
  onClose,
  ...props
}: ContextMenuMenuProps<T>): ReactElement {
  const state = useStateContext();
  return (
    <Menu
      {...props}
      className={
        cn(
          'context-menu__menu',
          typeof className === 'string' ? className : undefined,
        ) ?? 'context-menu__menu'
      }
      data-slot='context-menu-menu'
      onClose={onClose ?? state.close}
    />
  );
}
export type ContextMenuSeparatorProps = ComponentPropsWithRef<typeof Separator>;
export function ContextMenuSeparator({
  className,
  ...props
}: ContextMenuSeparatorProps): ReactElement {
  return (
    <Separator
      {...props}
      className={
        cn(
          'context-menu__separator',
          typeof className === 'string' ? className : undefined,
        ) ?? 'context-menu__separator'
      }
      data-slot='context-menu-separator'
    />
  );
}
export function ContextMenuSubmenuTrigger({
  children,
  ...props
}: ComponentPropsWithRef<typeof DropdownSubmenuTrigger>): ReactElement {
  const parts = children as ReactElement[];
  const trigger = parts[0];
  const popover = parts[1];
  if (!trigger || !popover)
    throw new Error(
      'ContextMenu.SubmenuTrigger requires trigger and popover children',
    );

  return (
    <DropdownSubmenuTrigger {...props}>
      {[
        trigger,
        cloneElement(popover, { _nested: true } as InternalPopoverProps),
      ]}
    </DropdownSubmenuTrigger>
  );
}
type ContextMenuComponent = typeof ContextMenuRoot & {
  Item: typeof DropdownItem;
  ItemIndicator: typeof DropdownItemIndicator;
  Menu: typeof ContextMenuMenu;
  Popover: typeof ContextMenuPopover;
  Root: typeof ContextMenuRoot;
  Section: typeof DropdownSection;
  Separator: typeof ContextMenuSeparator;
  SubmenuIndicator: typeof DropdownSubmenuIndicator;
  SubmenuTrigger: typeof ContextMenuSubmenuTrigger;
  Trigger: typeof ContextMenuTrigger;
};
export const ContextMenu: ContextMenuComponent = Object.assign(
  ContextMenuRoot,
  {
    Item: DropdownItem,
    ItemIndicator: DropdownItemIndicator,
    Menu: ContextMenuMenu,
    Popover: ContextMenuPopover,
    Root: ContextMenuRoot,
    Section: DropdownSection,
    Separator: ContextMenuSeparator,
    SubmenuIndicator: DropdownSubmenuIndicator,
    SubmenuTrigger: ContextMenuSubmenuTrigger,
    Trigger: ContextMenuTrigger,
  },
);
