'use client';
import { Button, cn, Tooltip } from '@heroui/react';
import { Menu01Icon, PanelRightIcon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import type {
  ComponentPropsWithRef,
  ReactElement,
  ReactNode,
  Ref,
} from 'react';
import {
  Children,
  createContext,
  isValidElement,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { PanelImperativeHandle } from 'react-resizable-panels';

import { Resizable } from './resizable';
import { Sheet } from './sheet';
import {
  Sidebar,
  type SidebarCollapsible,
  type SidebarSide,
  type SidebarVariant,
  useSidebar,
} from './sidebar';

export interface AppLayoutContextValue {
  isAsideOpen: boolean;
  navigate?: ((href: string) => void) | undefined;
  setAsideOpen: (open: boolean) => void;
  toggleAside: () => void;
}
const Context = createContext<AppLayoutContextValue | null>(null);
export const useAppLayout = (): AppLayoutContextValue | null =>
  useContext(Context);
export type AppLayoutResizeBehavior =
  'preserve-pixel-size' | 'preserve-relative-size';
export interface AppLayoutProps extends ComponentPropsWithRef<'div'> {
  aside?: ReactNode;
  asideDefaultSize?: number | string;
  asideMaxSize?: number | string;
  asideMinSize?: number | string;
  asideMobile?: 'hidden' | 'sheet';
  asideOpen?: boolean;
  asideResizable?: boolean;
  asideResizeBehavior?: AppLayoutResizeBehavior;
  asideToggleShortcut?: false | null | string;
  defaultAsideOpen?: boolean;
  defaultSidebarOpen?: boolean;
  footer?: ReactNode;
  navbar?: ReactNode;
  navigate?: (href: string) => void;
  onAsideOpenChange?: (open: boolean) => void;
  onSidebarOpenChange?: (open: boolean) => void;
  reduceMotion?: boolean;
  resizableAutoSaveId?: string;
  scrollMode?: 'content' | 'page';
  sidebar?: ReactNode;
  sidebarCollapsible?: SidebarCollapsible;
  sidebarDefaultSize?: number | string;
  sidebarMaxSize?: number | string;
  sidebarMinSize?: number | string;
  sidebarOpen?: boolean;
  sidebarResizable?: boolean;
  sidebarResizeBehavior?: AppLayoutResizeBehavior;
  sidebarSide?: SidebarSide;
  sidebarVariant?: SidebarVariant;
  toggleShortcut?: false | null | string;
  toolbar?: ReactNode;
}
const shortcutMatches = (event: KeyboardEvent, value: string): boolean => {
  const parts = value
    .split('+')
    .map((part) => part.trim().toLowerCase())
    .filter(Boolean);
  const key = parts.find(
    (part) =>
      ![
        'alt',
        'cmd',
        'command',
        'control',
        'ctrl',
        'meta',
        'mod',
        'opt',
        'option',
        'shift',
      ].includes(part),
  );
  if (!key || event.key.toLowerCase() !== key) return false;
  const mod = parts.includes('mod');
  const ctrl = parts.includes('ctrl') || parts.includes('control');
  const meta =
    parts.includes('meta') ||
    parts.includes('cmd') ||
    parts.includes('command');
  const alt =
    parts.includes('alt') || parts.includes('opt') || parts.includes('option');
  return (
    event.shiftKey === parts.includes('shift') &&
    event.altKey === alt &&
    (mod
      ? event.metaKey || event.ctrlKey
      : event.ctrlKey === ctrl && event.metaKey === meta)
  );
};
const useMediaQuery = (query: string): boolean => {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const media = window.matchMedia(query);
    const update = () => setMatches(media.matches);

    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, [query]);

  return matches;
};

const syncPanelState = (
  panel: PanelImperativeHandle | null,
  open: boolean,
): void => {
  if (!panel) return;

  try {
    const collapsed = panel.isCollapsed();

    if (open && collapsed) panel.expand();
    if (!open && !collapsed) panel.collapse();
  } catch (error) {
    if (!(
      error instanceof Error &&
      error.message.startsWith('Panel constraints not found for Panel ')
    )) {
      throw error;
    }
  }
};
export function AppLayoutRoot({
  aside,
  asideDefaultSize = 20,
  asideMaxSize = 40,
  asideMinSize = 15,
  asideMobile = 'hidden',
  asideOpen,
  asideResizable = false,
  asideResizeBehavior,
  asideToggleShortcut,
  children,
  className,
  defaultAsideOpen = true,
  defaultSidebarOpen = true,
  footer,
  navbar,
  navigate,
  onAsideOpenChange,
  onSidebarOpenChange,
  reduceMotion = false,
  resizableAutoSaveId,
  scrollMode = 'page',
  sidebar,
  sidebarCollapsible = 'icon',
  sidebarDefaultSize = 18,
  sidebarMaxSize = 30,
  sidebarMinSize = 12,
  sidebarOpen,
  sidebarResizable = false,
  sidebarResizeBehavior,
  sidebarSide = 'left',
  sidebarVariant = 'sidebar',
  toggleShortcut = 'mod+b',
  toolbar,
  ...props
}: AppLayoutProps): ReactElement {
  const sidebarControlled = sidebarOpen !== undefined;
  const [localSidebar, setLocalSidebar] = useState(defaultSidebarOpen);
  const isSidebarOpen = sidebarOpen ?? localSidebar;
  const setSidebarOpen = useCallback(
    (value: boolean) => {
      onSidebarOpenChange?.(value);
      if (!sidebarControlled) setLocalSidebar(value);
    },
    [onSidebarOpenChange, sidebarControlled],
  );
  const [localAside, setLocalAside] = useState(defaultAsideOpen),
    isAsideOpen = asideOpen ?? localAside;
  const setAsideOpen = useCallback(
    (value: boolean) => {
      if (asideOpen === undefined) {
        setLocalAside(value);
        document.cookie = `aside_state=${value}; path=/; max-age=31536000; SameSite=Lax`;
      }
      onAsideOpenChange?.(value);
    },
    [asideOpen, onAsideOpenChange],
  );
  const toggleAside = useCallback(
    () => setAsideOpen(!isAsideOpen),
    [isAsideOpen, setAsideOpen],
  );
  useEffect(() => {
    if (!asideToggleShortcut) return;
    const handler = (e: KeyboardEvent) => {
      if (shortcutMatches(e, asideToggleShortcut)) {
        e.preventDefault();
        toggleAside();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [asideToggleShortcut, toggleAside]);
  let mobileAside: ReactNode = null;
  const content: ReactNode[] = [];
  Children.forEach(children, (child) => {
    if (isValidElement(child) && child.type === AppLayoutMobileAside)
      mobileAside = (child as ReactElement<{ children: ReactNode }>).props
        .children;
    else content.push(child);
  });
  const context = useMemo(
    () => ({ isAsideOpen, navigate, setAsideOpen, toggleAside }),
    [isAsideOpen, navigate, setAsideOpen, toggleAside],
  );
  const body = (
    <div className='app-layout__body' data-slot='app-layout-body'>
      <>
        {navbar ? (
          <header className='app-layout__header' data-slot='app-layout-header'>
            {navbar}
          </header>
        ) : null}
        {toolbar ? (
          <div className='app-layout__toolbar' data-slot='app-layout-toolbar'>
            {toolbar}
          </div>
        ) : null}
        <main
          aria-label={
            scrollMode === 'content' ? 'Scrollable main content' : undefined
          }
          className='app-layout__main'
          data-scroll-mode={scrollMode}
          data-slot='app-layout-main'
          // A content-scrolling main region must be keyboard focusable.
          // oxlint-disable-next-line jsx-a11y/no-noninteractive-tabindex
          tabIndex={scrollMode === 'content' ? 0 : undefined}
        >
          {content}
        </main>
        {footer ? (
          <div className='app-layout__footer' data-slot='app-layout-footer'>
            {footer}
          </div>
        ) : null}
      </>
    </div>
  );
  const asideNode = aside ? (
    <aside
      className='app-layout__aside'
      data-slot='app-layout-aside'
      data-state={isAsideOpen ? 'open' : 'closed'}
    >
      {aside}
    </aside>
  ) : null;
  const isTablet = useMediaQuery('(max-width: 1024px)');
  const isMobile = useMediaQuery('(max-width: 768px)');
  const resizable = (sidebarResizable || asideResizable) && !isMobile;
  const canResizeSidebar =
    sidebarResizable && sidebarCollapsible !== 'icon' && !isMobile;
  const canResizeAside = asideResizable && !isTablet;
  const layout = resizable ? (
    <AppLayoutResizable
      aside={aside}
      asideDefaultSize={asideDefaultSize}
      asideMaxSize={asideMaxSize}
      asideMinSize={asideMinSize}
      asideResizable={canResizeAside}
      asideResizeBehavior={asideResizeBehavior}
      body={body}
      isAsideOpen={isAsideOpen}
      isSidebarOpen={isSidebarOpen}
      resizableAutoSaveId={resizableAutoSaveId}
      setAsideOpen={setAsideOpen}
      setSidebarOpen={setSidebarOpen}
      sidebar={sidebar}
      sidebarDefaultSize={sidebarDefaultSize}
      sidebarMaxSize={sidebarMaxSize}
      sidebarMinSize={sidebarMinSize}
      sidebarResizable={canResizeSidebar}
      sidebarResizeBehavior={sidebarResizeBehavior}
      sidebarSide={sidebarSide}
    />
  ) : (
    <>
      {sidebar}
      {body}
      {asideNode}
    </>
  );
  return (
    <Context value={context}>
      <Sidebar.Provider
        {...props}
        className={className}
        collapsible={sidebarCollapsible}
        data-app-layout=''
        data-resizable={resizable ? '' : undefined}
        data-scroll-mode={scrollMode}
        defaultOpen={defaultSidebarOpen}
        {...(navigate === undefined ? {} : { navigate })}
        onOpenChange={setSidebarOpen}
        open={isSidebarOpen}
        reduceMotion={reduceMotion}
        side={sidebarSide}
        toggleShortcut={toggleShortcut}
        variant={sidebarVariant}
      >
        {layout}
        {aside && asideMobile === 'sheet' ? (
          <AppLayoutMobileAsideDrawer>
            {mobileAside ?? aside}
          </AppLayoutMobileAsideDrawer>
        ) : null}
      </Sidebar.Provider>
    </Context>
  );
}

interface AppLayoutResizableProps {
  aside: ReactNode;
  asideDefaultSize: number | string;
  asideMaxSize: number | string;
  asideMinSize: number | string;
  asideResizable: boolean;
  asideResizeBehavior?: AppLayoutResizeBehavior | undefined;
  body: ReactNode;
  isAsideOpen: boolean;
  isSidebarOpen: boolean;
  resizableAutoSaveId?: string | undefined;
  setAsideOpen: (open: boolean) => void;
  setSidebarOpen: (open: boolean) => void;
  sidebar: ReactNode;
  sidebarDefaultSize: number | string;
  sidebarMaxSize: number | string;
  sidebarMinSize: number | string;
  sidebarResizable: boolean;
  sidebarResizeBehavior?: AppLayoutResizeBehavior | undefined;
  sidebarSide: SidebarSide;
}

function AppLayoutResizable({
  aside,
  asideDefaultSize,
  asideMaxSize,
  asideMinSize,
  asideResizable,
  asideResizeBehavior,
  body,
  isAsideOpen,
  isSidebarOpen,
  resizableAutoSaveId,
  setAsideOpen,
  setSidebarOpen,
  sidebar,
  sidebarDefaultSize,
  sidebarMaxSize,
  sidebarMinSize,
  sidebarResizable,
  sidebarResizeBehavior,
  sidebarSide,
}: AppLayoutResizableProps): ReactElement {
  const sidebarPanel = useRef<PanelImperativeHandle | null>(null);
  const asidePanel = useRef<PanelImperativeHandle | null>(null);

  useEffect(() => {
    if (sidebarResizable) syncPanelState(sidebarPanel.current, isSidebarOpen);
  }, [isSidebarOpen, sidebarResizable]);
  useEffect(() => {
    if (asideResizable) syncPanelState(asidePanel.current, isAsideOpen);
  }, [asideResizable, isAsideOpen]);

  const sidebarSection = sidebarResizable ? (
    <Resizable.Panel
      collapsible
      className='app-layout__sidebar-panel'
      collapsedSize={0}
      defaultSize={sidebarDefaultSize}
      groupResizeBehavior={sidebarResizeBehavior}
      handleRef={sidebarPanel as Ref<PanelImperativeHandle | null>}
      id='app-layout-sidebar'
      key='sidebar-panel'
      maxSize={sidebarMaxSize}
      minSize={sidebarMinSize}
      onCollapse={() => setSidebarOpen(false)}
      onExpand={() => setSidebarOpen(true)}
    >
      {sidebar}
    </Resizable.Panel>
  ) : null;
  const sidebarHandle = sidebarResizable ? (
    <Resizable.Handle key='sidebar-handle' type='line' variant='primary' />
  ) : null;
  const asideSection = asideResizable ? (
    <Resizable.Panel
      collapsible
      className='app-layout__aside-panel'
      collapsedSize={0}
      defaultSize={asideDefaultSize}
      groupResizeBehavior={asideResizeBehavior}
      handleRef={asidePanel as Ref<PanelImperativeHandle | null>}
      id='app-layout-aside'
      key='aside-panel'
      maxSize={asideMaxSize}
      minSize={asideMinSize}
      onCollapse={() => setAsideOpen(false)}
      onExpand={() => setAsideOpen(true)}
    >
      {aside}
    </Resizable.Panel>
  ) : null;
  const asideHandle = asideResizable ? (
    <Resizable.Handle key='aside-handle' type='line' variant='primary' />
  ) : null;
  const main = (
    <Resizable.Panel
      className='app-layout__main-panel'
      id='app-layout-main'
      key='main-panel'
      minSize={30}
    >
      {body}
    </Resizable.Panel>
  );
  const sections =
    sidebarSide === 'left'
      ? [sidebarSection, sidebarHandle, main, asideHandle, asideSection]
      : [asideSection, asideHandle, main, sidebarHandle, sidebarSection];

  return (
    <>
      {sidebar && !sidebarResizable ? sidebar : null}
      <Resizable
        {...(resizableAutoSaveId === undefined
          ? {}
          : { autoSaveId: resizableAutoSaveId })}
        className='app-layout__resizable'
        orientation='horizontal'
      >
        {sections}
      </Resizable>
      {aside && !asideResizable ? (
        <aside
          className='app-layout__aside'
          data-slot='app-layout-aside'
          data-state={isAsideOpen ? 'open' : 'closed'}
        >
          {aside}
        </aside>
      ) : null}
    </>
  );
}
function AppLayoutMobileAsideDrawer({
  children,
}: {
  children: ReactNode;
}): ReactElement | null {
  const app = useAppLayout();
  const isTablet = useMediaQuery('(max-width: 1024px)');
  return app && isTablet ? (
    <Sheet.Root
      isOpen={app.isAsideOpen}
      placement='right'
      onOpenChange={app.setAsideOpen}
    >
      <Sheet.Backdrop variant='blur'>
        <Sheet.Content className='app-layout__mobile-aside-sheet'>
          <Sheet.Dialog
            aria-label='Application aside'
            className='app-layout__mobile-aside-dialog'
          >
            <div
              className='app-layout__mobile-aside'
              data-slot='app-layout-mobile-aside'
            >
              {children}
            </div>
          </Sheet.Dialog>
        </Sheet.Content>
      </Sheet.Backdrop>
    </Sheet.Root>
  ) : null;
}
export interface AppLayoutTooltipProps {
  className?: string;
  closeDelay?: number;
  delay?: number;
  isDisabled?: boolean;
  offset?: number;
  placement?: 'bottom' | 'left' | 'right' | 'top';
  showArrow?: boolean;
}
const withTooltip = (
  trigger: ReactElement,
  content: ReactNode | undefined,
  props: AppLayoutTooltipProps | undefined,
) =>
  content ? (
    <Tooltip
      {...(props?.closeDelay === undefined
        ? {}
        : { closeDelay: props.closeDelay })}
      {...(props?.delay === undefined ? {} : { delay: props.delay })}
      {...(props?.isDisabled === undefined
        ? {}
        : { isDisabled: props.isDisabled })}
    >
      <Tooltip.Trigger>{trigger}</Tooltip.Trigger>
      <Tooltip.Content
        {...(props?.className === undefined
          ? {}
          : { className: props.className })}
        {...(props?.offset === undefined ? {} : { offset: props.offset })}
        placement={props?.placement ?? 'bottom'}
      >
        {props?.showArrow ? <Tooltip.Arrow /> : null}
        {content}
      </Tooltip.Content>
    </Tooltip>
  ) : (
    trigger
  );
export interface AppLayoutMenuToggleProps extends ComponentPropsWithRef<
  typeof Button
> {
  tooltip?: ReactNode;
  tooltipProps?: AppLayoutTooltipProps;
}
export function AppLayoutMenuToggle({
  children,
  className,
  tooltip,
  tooltipProps,
  ...props
}: AppLayoutMenuToggleProps): ReactElement {
  const { setMobileOpen } = useSidebar();
  return withTooltip(
    <Button
      {...props}
      isIconOnly
      aria-label='Open navigation'
      className={
        cn(
          'app-layout__menu-toggle',
          typeof className === 'string' ? className : undefined,
        ) ?? 'app-layout__menu-toggle'
      }
      data-slot='app-layout-menu-toggle'
      size='sm'
      variant='ghost'
      onPress={() => setMobileOpen(true)}
    >
      {children ?? (
        <HugeiconsIcon className='size-4' icon={Menu01Icon} strokeWidth={2} />
      )}
    </Button>,
    tooltip,
    tooltipProps,
  );
}
export interface AppLayoutAsideTriggerProps extends ComponentPropsWithRef<
  typeof Button
> {
  closedTooltip?: ReactNode;
  openTooltip?: ReactNode;
  tooltipProps?: AppLayoutTooltipProps;
}
export function AppLayoutAsideTrigger({
  children,
  className,
  closedTooltip,
  openTooltip,
  tooltipProps,
  ...props
}: AppLayoutAsideTriggerProps): ReactElement {
  const app = useAppLayout(),
    open = app?.isAsideOpen ?? false;
  return withTooltip(
    <Button
      {...props}
      isIconOnly
      aria-expanded={open}
      aria-label='Toggle aside panel'
      className={
        cn(
          'app-layout__aside-trigger',
          typeof className === 'string' ? className : undefined,
        ) ?? 'app-layout__aside-trigger'
      }
      data-slot='app-layout-aside-trigger'
      data-state={open ? 'open' : 'closed'}
      size='sm'
      variant='ghost'
      onPress={() => app?.toggleAside()}
    >
      {children ?? (
        <HugeiconsIcon
          className='size-4'
          icon={PanelRightIcon}
          strokeWidth={2}
        />
      )}
    </Button>,
    open ? openTooltip : closedTooltip,
    tooltipProps,
  );
}
export function AppLayoutMobileAside({
  children,
}: {
  children: ReactNode;
}): null {
  void children;
  return null;
}
type AppLayoutComponent = typeof AppLayoutRoot & {
  AsideTrigger: typeof AppLayoutAsideTrigger;
  MenuToggle: typeof AppLayoutMenuToggle;
  MobileAside: typeof AppLayoutMobileAside;
  Root: typeof AppLayoutRoot;
};
export const AppLayout: AppLayoutComponent = Object.assign(AppLayoutRoot, {
  AsideTrigger: AppLayoutAsideTrigger,
  MenuToggle: AppLayoutMenuToggle,
  MobileAside: AppLayoutMobileAside,
  Root: AppLayoutRoot,
});
