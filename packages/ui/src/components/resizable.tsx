'use client';

import { cn } from '@heroui/react';
import type { ReactElement, ReactNode, Ref } from 'react';
import { createContext, useCallback, useContext, useRef } from 'react';
import type {
  GroupImperativeHandle,
  GroupProps,
  LayoutStorage,
  PanelImperativeHandle,
  PanelProps,
  SeparatorProps,
} from 'react-resizable-panels';
import {
  Group,
  Panel,
  Separator,
  useDefaultLayout,
} from 'react-resizable-panels';

type Orientation = 'horizontal' | 'vertical';
type HandleType = 'drag' | 'handle' | 'line' | 'pill';
type Variant = 'primary' | 'secondary' | 'tertiary';

const Context = createContext<Orientation | null>(null);
function useOrientation(): Orientation {
  const value = useContext(Context);
  if (!value)
    throw new Error(
      'Resizable subcomponents must be rendered inside <Resizable>.',
    );
  return value;
}

const memoryStorage: LayoutStorage = { getItem: () => null, setItem: () => {} };
const browserStorage: LayoutStorage = {
  getItem: (key) => {
    if (typeof window === 'undefined') return null;
    try {
      return window.localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  setItem: (key, value) => {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(key, value);
    } catch {
      /* storage may be unavailable */
    }
  },
};

export interface CookieStorageOptions {
  fallbackStorage?: LayoutStorage;
  maxAge?: number;
  path?: string;
  sameSite?: 'lax' | 'none' | 'strict';
  secure?: boolean;
}

/**
 * Creates synchronous storage that mirrors layouts to a cookie and a fallback
 * storage provider. Cookie values can be read during SSR to avoid layout shift.
 */
export function createCookieStorage({
  fallbackStorage = browserStorage,
  maxAge = 60 * 60 * 24 * 365,
  path = '/',
  sameSite = 'lax',
  secure,
}: CookieStorageOptions = {}): LayoutStorage {
  return {
    getItem(key) {
      if (typeof document !== 'undefined') {
        const encodedKey = `${encodeURIComponent(key)}=`;
        const cookie = document.cookie
          .split(';')
          .map((value) => value.trim())
          .find((value) => value.startsWith(encodedKey));

        if (cookie) {
          try {
            return decodeURIComponent(cookie.slice(encodedKey.length));
          } catch {
            // Fall through to the secondary storage provider.
          }
        }
      }

      return fallbackStorage.getItem(key);
    },
    setItem(key, value) {
      fallbackStorage.setItem(key, value);
      if (typeof document === 'undefined') return;

      const useSecureCookie =
        secure ??
        (typeof window !== 'undefined' &&
          window.location.protocol === 'https:');
      const attributes = [
        `Path=${path}`,
        `Max-Age=${maxAge}`,
        `SameSite=${sameSite.charAt(0).toUpperCase()}${sameSite.slice(1)}`,
      ];

      if (useSecureCookie) attributes.push('Secure');
      document.cookie = `${encodeURIComponent(key)}=${encodeURIComponent(value)}; ${attributes.join('; ')}`;
    },
  };
}

export interface ResizableRootProps extends Omit<
  GroupProps,
  'defaultLayout' | 'groupRef' | 'onLayoutChange' | 'orientation'
> {
  autoSaveId?: string;
  children: ReactNode;
  handleRef?: Ref<GroupImperativeHandle | null>;
  onLayoutChange?: GroupProps['onLayoutChange'];
  orientation?: Orientation;
  storage?: LayoutStorage;
}

function ResizableRoot({
  autoSaveId,
  children,
  className,
  handleRef,
  id,
  onLayoutChange,
  onLayoutChanged,
  orientation = 'horizontal',
  storage,
  style,
  ...props
}: ResizableRootProps): ReactElement {
  const { defaultLayout, onLayoutChanged: persistLayout } = useDefaultLayout({
    id: autoSaveId || '__no_persist__',
    storage: autoSaveId ? (storage ?? browserStorage) : memoryStorage,
  });
  const handleLayoutChanged: NonNullable<GroupProps['onLayoutChanged']> =
    useCallback(
      (layout, meta) => {
        if (autoSaveId) persistLayout(layout, meta);
        onLayoutChanged?.(layout, meta);
      },
      [autoSaveId, onLayoutChanged, persistLayout],
    );

  return (
    <Context value={orientation}>
      <Group
        {...props}
        className={
          cn('resizable', `resizable--${orientation}`, className) ?? ''
        }
        data-slot='resizable'
        groupRef={handleRef}
        id={id}
        orientation={orientation}
        style={style}
        {...(autoSaveId && defaultLayout ? { defaultLayout } : {})}
        {...(onLayoutChange ? { onLayoutChange } : {})}
        {...(autoSaveId || onLayoutChanged
          ? { onLayoutChanged: handleLayoutChanged }
          : {})}
      >
        {children}
      </Group>
    </Context>
  );
}

function toSize(value: number | string | undefined): string | undefined {
  return value == null
    ? undefined
    : typeof value === 'number'
      ? `${value}%`
      : value;
}

export interface ResizablePanelProps extends Omit<
  PanelProps,
  'collapsedSize' | 'defaultSize' | 'maxSize' | 'minSize' | 'panelRef'
> {
  collapsedSize?: number | string;
  defaultSize?: number | string;
  handleRef?: Ref<PanelImperativeHandle | null>;
  maxSize?: number | string;
  minSize?: number | string;
  onCollapse?: () => void;
  onExpand?: () => void;
}

function ResizablePanel({
  children,
  className,
  collapsedSize,
  collapsible,
  defaultSize,
  handleRef,
  maxSize,
  minSize,
  onCollapse,
  onExpand,
  onResize,
  ...props
}: ResizablePanelProps): ReactElement {
  useOrientation();
  const panel = useRef<PanelImperativeHandle | null>(null);
  const previousCollapsed = useRef<boolean>(undefined);
  const setRef = useCallback(
    (value: PanelImperativeHandle | null) => {
      panel.current = value;
      if (typeof handleRef === 'function') handleRef(value);
      else if (handleRef) handleRef.current = value;
    },
    [handleRef],
  );
  const watchCollapse = Boolean(collapsible && (onCollapse || onExpand));
  const handleResize: PanelProps['onResize'] = useCallback(
    (size, id, previous) => {
      if (watchCollapse && panel.current) {
        const collapsed = panel.current.isCollapsed();
        if (previousCollapsed.current !== undefined) {
          if (collapsed && !previousCollapsed.current) onCollapse?.();
          if (!collapsed && previousCollapsed.current) onExpand?.();
        }
        previousCollapsed.current = collapsed;
      }
      onResize?.(size, id, previous);
    },
    [onCollapse, onExpand, onResize, watchCollapse],
  );
  return (
    <Panel
      {...props}
      className={cn('resizable__panel', className) ?? ''}
      collapsible={collapsible}
      data-slot='resizable-panel'
      {...(collapsedSize !== undefined
        ? { collapsedSize: toSize(collapsedSize) }
        : {})}
      {...(defaultSize !== undefined
        ? { defaultSize: toSize(defaultSize) }
        : {})}
      {...(maxSize !== undefined ? { maxSize: toSize(maxSize) } : {})}
      {...(minSize !== undefined ? { minSize: toSize(minSize) } : {})}
      {...(watchCollapse
        ? { panelRef: setRef, onResize: handleResize }
        : handleRef
          ? { panelRef: handleRef }
          : onResize
            ? { onResize }
            : {})}
    >
      {children}
    </Panel>
  );
}

export interface ResizableIndicatorProps {
  children?: ReactNode;
  className?: string;
  type?: 'drag' | 'pill';
}

function ResizableIndicator({
  children,
  className,
  type = 'pill',
}: ResizableIndicatorProps): ReactElement {
  const orientation = useOrientation();
  if (children)
    return (
      <span
        className={cn('resizable__handle-indicator', className)}
        data-slot='resizable-handle-indicator'
      >
        {children}
      </span>
    );
  return (
    <span
      aria-hidden='true'
      className={cn(
        'resizable__handle-indicator',
        `resizable__handle-indicator--${type}`,
        className,
      )}
      data-slot='resizable-handle-indicator'
    >
      {type === 'drag' ? (
        <svg
          className='resizable__handle-indicator-icon'
          data-slot='resizable-handle-indicator-icon'
          fill='none'
          viewBox='0 0 12 12'
        >
          <path
            d={orientation === 'horizontal' ? 'M4 3v6M8 3v6' : 'M3 4h6M3 8h6'}
            stroke='currentColor'
            strokeLinecap='round'
          />
        </svg>
      ) : null}
    </span>
  );
}

export interface ResizableHandleProps extends Omit<SeparatorProps, 'children'> {
  children?: ReactNode;
  type?: HandleType;
  variant?: Variant;
  withIndicator?: boolean;
}

function ResizableHandle({
  'aria-label': ariaLabel,
  children,
  className,
  type = 'line',
  variant = 'primary',
  withIndicator,
  ...props
}: ResizableHandleProps): ReactElement {
  const orientation = useOrientation();
  const showIndicator = children == null && (withIndicator ?? type !== 'line');
  return (
    <Separator
      {...props}
      aria-label={ariaLabel ?? 'Resize handle'}
      className={
        cn(
          'resizable__handle',
          `resizable__handle--${orientation}`,
          `resizable__handle--${type}`,
          `resizable__handle--${variant}`,
          className,
        ) ?? ''
      }
      data-slot='resizable-handle'
      data-type={type}
      data-variant={variant}
    >
      {children}
      {showIndicator ? (
        <ResizableIndicator type={type === 'drag' ? 'drag' : 'pill'} />
      ) : null}
    </Separator>
  );
}

type ResizableComponent = typeof ResizableRoot & {
  Handle: typeof ResizableHandle;
  Indicator: typeof ResizableIndicator;
  Panel: typeof ResizablePanel;
  Root: typeof ResizableRoot;
};

export const Resizable: ResizableComponent = Object.assign(ResizableRoot, {
  Handle: ResizableHandle,
  Indicator: ResizableIndicator,
  Panel: ResizablePanel,
  Root: ResizableRoot,
});
