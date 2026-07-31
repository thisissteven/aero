'use client';
import {
  Button as HeroButton,
  cn,
  ScrollShadow,
  Separator as HeroSeparator,
  Tooltip,
} from '@heroui/react';
import { SidebarLeftIcon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import type { ComponentPropsWithRef, ReactElement, ReactNode } from 'react';
import {
  Children,
  cloneElement,
  createContext,
  Fragment,
  isValidElement,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  Button,
  Header,
  RouterProvider,
  Tree,
  TreeItem,
  TreeItemContent,
  TreeSection,
} from 'react-aria-components';

import { Sheet } from './sheet';
import { IconChevronRight } from '../heroui-icons';

export type SidebarSide = 'left' | 'right';
export type SidebarVariant = 'floating' | 'inset' | 'sidebar';
export type SidebarCollapsible = 'icon' | 'none' | 'offcanvas';
export interface SidebarContextValue {
  collapsible: SidebarCollapsible;
  isMobile: boolean;
  isMobileOpen: boolean;
  isOpen: boolean;
  navigate?: ((href: string) => void) | undefined;
  reduceMotion: boolean;
  setMobileOpen: (open: boolean) => void;
  setOpen: (open: boolean) => void;
  side: SidebarSide;
  toggleSidebar: () => void;
  variant: SidebarVariant;
}
const Context = createContext<SidebarContextValue>({
  collapsible: 'icon',
  isMobile: false,
  isMobileOpen: false,
  isOpen: true,
  reduceMotion: false,
  setMobileOpen: () => {},
  setOpen: () => {},
  side: 'left',
  toggleSidebar: () => {},
  variant: 'sidebar',
});
const CloseMobileContext = createContext<boolean | undefined>(undefined);
export const useSidebar = (): SidebarContextValue => useContext(Context);
export interface SidebarProviderProps extends ComponentPropsWithRef<'div'> {
  collapsible?: SidebarCollapsible;
  defaultOpen?: boolean;
  navigate?: (href: string) => void;
  onOpenChange?: (open: boolean) => void;
  open?: boolean;
  reduceMotion?: boolean;
  side?: SidebarSide;
  toggleShortcut?: false | null | string;
  variant?: SidebarVariant;
}
interface ParsedShortcut {
  alt: boolean;
  ctrl: boolean;
  key: string;
  meta: boolean;
  mod: boolean;
  shift: boolean;
}
const parseShortcut = (value: string): ParsedShortcut | null => {
  const result: ParsedShortcut = {
    alt: false,
    ctrl: false,
    key: '',
    meta: false,
    mod: false,
    shift: false,
  };
  for (const part of value
    .split('+')
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean)) {
    if (part === 'mod') result.mod = true;
    else if (part === 'cmd' || part === 'command' || part === 'meta')
      result.meta = true;
    else if (part === 'ctrl' || part === 'control') result.ctrl = true;
    else if (part === 'shift') result.shift = true;
    else if (part === 'alt' || part === 'option' || part === 'opt')
      result.alt = true;
    else result.key = part;
  }
  return result.key ? result : null;
};
const matchShortcut = (
  event: KeyboardEvent,
  shortcut: ParsedShortcut,
): boolean =>
  event.key.toLowerCase() === shortcut.key &&
  event.shiftKey === shortcut.shift &&
  event.altKey === shortcut.alt &&
  (shortcut.mod
    ? event.metaKey || event.ctrlKey
    : event.ctrlKey === shortcut.ctrl && event.metaKey === shortcut.meta);
export function SidebarProvider({
  children,
  className,
  collapsible = 'icon',
  defaultOpen = true,
  navigate,
  onOpenChange,
  open,
  reduceMotion = false,
  side = 'left',
  toggleShortcut = 'mod+b',
  variant = 'sidebar',
  ...props
}: SidebarProviderProps): ReactElement {
  const [local, setLocal] = useState(defaultOpen),
    isOpen = open ?? local;
  const setOpen = useCallback(
    (value: boolean) => {
      if (open === undefined) {
        setLocal(value);
        document.cookie = `sidebar_state=${value}; path=/; max-age=31536000; SameSite=Lax`;
      }
      onOpenChange?.(value);
    },
    [onOpenChange, open],
  );
  const [isMobile, setMobile] = useState(false),
    [isMobileOpen, setMobileOpen] = useState(false);
  useEffect(() => {
    const media = window.matchMedia('(max-width: 768px)');
    const update = () => {
      setMobile(media.matches);
      if (media.matches) setMobileOpen(false);
    };
    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);
  const toggleSidebar = useCallback(() => {
    if (collapsible === 'none') return;
    if (isMobile) setMobileOpen((value) => !value);
    else setOpen(!isOpen);
  }, [collapsible, isMobile, isOpen, setOpen]);
  useEffect(() => {
    if (!toggleShortcut) return;
    const shortcut = parseShortcut(toggleShortcut);
    if (!shortcut) return;
    const handler = (event: KeyboardEvent) => {
      if (matchShortcut(event, shortcut)) {
        event.preventDefault();
        toggleSidebar();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [toggleShortcut, toggleSidebar]);
  const value = useMemo(
    () => ({
      collapsible,
      isMobile,
      isMobileOpen,
      isOpen,
      navigate,
      reduceMotion,
      setMobileOpen,
      setOpen,
      side,
      toggleSidebar,
      variant,
    }),
    [
      collapsible,
      isMobile,
      isMobileOpen,
      isOpen,
      navigate,
      reduceMotion,
      setOpen,
      side,
      toggleSidebar,
      variant,
    ],
  );
  const content = (
    <Context value={value}>
      <div
        {...props}
        className={cn('sidebar__provider', className)}
        data-sidebar='provider'
        data-slot='sidebar-provider'
        data-state={isOpen ? 'expanded' : 'collapsed'}
      >
        {children}
      </div>
    </Context>
  );
  return navigate ? (
    <RouterProvider
      navigate={(href, routerOptions) => {
        if (
          (routerOptions as { forceReload?: boolean } | undefined)?.forceReload
        )
          window.location.href = String(href);
        else navigate(String(href));
      }}
    >
      {content}
    </RouterProvider>
  ) : (
    content
  );
}
export type SidebarRootProps = ComponentPropsWithRef<'aside'>;
export function SidebarRoot({
  className,
  ...props
}: SidebarRootProps): ReactElement {
  const { collapsible, isOpen, side, variant } = useSidebar();
  const aside = (
    <aside
      {...props}
      className={cn(
        'sidebar',
        variant === 'sidebar' ? 'sidebar--default' : `sidebar--${variant}`,
        `sidebar--${side}`,
        className,
      )}
      data-collapsible={collapsible}
      data-side={side}
      data-slot='sidebar'
      data-state={isOpen ? 'expanded' : 'collapsed'}
      data-variant={variant}
    />
  );
  return collapsible === 'offcanvas' ? (
    <div
      className='sidebar__offcanvas-wrapper'
      data-side={side}
      data-state={isOpen ? 'expanded' : 'collapsed'}
    >
      {aside}
    </div>
  ) : (
    aside
  );
}
type SidebarDivPart = (props: ComponentPropsWithRef<'div'>) => ReactElement;
const divPart =
  (slot: string, base: string): SidebarDivPart =>
  (p: ComponentPropsWithRef<'div'>): ReactElement => (
    <div {...p} className={cn(base, p.className)} data-slot={slot} />
  );
export const SidebarHeader: SidebarDivPart = divPart(
  'sidebar-header',
  'sidebar__header',
);
export const SidebarFooter: SidebarDivPart = divPart(
  'sidebar-footer',
  'sidebar__footer',
);
export interface SidebarGroupProps extends ComponentPropsWithRef<'div'> {
  closeMobileOnAction?: boolean;
}
export function SidebarGroup({
  children,
  className,
  closeMobileOnAction,
  ...props
}: SidebarGroupProps): ReactElement {
  const group = (
    <div
      {...props}
      className={cn('sidebar__group', className)}
      data-slot='sidebar-group'
    >
      {children}
    </div>
  );
  return closeMobileOnAction === undefined ? (
    group
  ) : (
    <CloseMobileContext value={closeMobileOnAction}>{group}</CloseMobileContext>
  );
}
export const SidebarGroupLabel: SidebarDivPart = divPart(
  'sidebar-group-label',
  'sidebar__group-label',
);
export type SidebarContentProps = ComponentPropsWithRef<typeof ScrollShadow>;
export function SidebarContent({
  className,
  ...props
}: SidebarContentProps): ReactElement {
  return (
    <ScrollShadow
      {...props}
      hideScrollBar
      className={
        cn(
          'sidebar__content',
          typeof className === 'string' ? className : undefined,
        ) ?? 'sidebar__content'
      }
      data-slot='sidebar-content'
    />
  );
}
export interface SidebarMenuProps<
  T extends object = object,
> extends ComponentPropsWithRef<typeof Tree<T>> {
  closeMobileOnAction?: boolean;
  reduceMotion?: boolean;
  showGuideLines?: boolean | 'hover';
}
export function SidebarMenu<T extends object = object>({
  className,
  closeMobileOnAction,
  reduceMotion,
  showGuideLines = true,
  ...props
}: SidebarMenuProps<T>): ReactElement {
  const inheritedCloseMobile = useContext(CloseMobileContext);
  const resolvedCloseMobile = closeMobileOnAction ?? inheritedCloseMobile;
  const menu = (
    <Tree
      {...props}
      className={
        cn(
          'sidebar__menu',
          typeof className === 'string' ? className : undefined,
        ) ?? 'sidebar__menu'
      }
      data-guide-lines={
        showGuideLines === true
          ? 'always'
          : showGuideLines === false
            ? 'none'
            : 'hover'
      }
      data-reduce-motion={reduceMotion}
      data-sidebar='menu'
      data-slot='sidebar-menu'
    />
  );
  return resolvedCloseMobile === undefined ? (
    menu
  ) : (
    <CloseMobileContext value={resolvedCloseMobile}>{menu}</CloseMobileContext>
  );
}
export type SidebarMenuSectionProps<T extends object = object> =
  ComponentPropsWithRef<typeof TreeSection<T>>;
export function SidebarMenuSection<T extends object = object>({
  children,
  className,
  ...props
}: SidebarMenuSectionProps<T>): ReactElement {
  const header = (
    typeof children === 'function' ? [] : Children.toArray(children)
  ).find(
    (child) => isValidElement(child) && child.type === SidebarMenuHeader,
  ) as ReactElement<{ children?: ReactNode }> | undefined;
  const label =
    isValidElement(header) && typeof header.props.children === 'string'
      ? header.props.children
      : undefined;

  return (
    <TreeSection
      {...props}
      {...(label === undefined ? {} : { 'aria-label': label })}
      className={
        cn('sidebar__menu-section', className) ?? 'sidebar__menu-section'
      }
      data-slot='sidebar-menu-section'
    >
      {children}
    </TreeSection>
  );
}
export type SidebarMenuHeaderProps = ComponentPropsWithRef<typeof Header>;
export function SidebarMenuHeader({
  children,
  className,
  ...props
}: SidebarMenuHeaderProps): ReactElement {
  return (
    <Header
      {...props}
      role='presentation'
      style={{ display: 'contents', ...props.style }}
    >
      <div
        className={cn('sidebar__menu-header', className)}
        data-slot='sidebar-menu-header'
        role='row'
      >
        <div role='rowheader' style={{ display: 'contents' }}>
          {children}
        </div>
      </div>
    </Header>
  );
}
export interface SidebarMenuItemProps extends ComponentPropsWithRef<
  typeof TreeItem
> {
  closeMobileOnAction?: boolean;
  forceReload?: boolean;
  href?: string;
  isCurrent?: boolean;
  tooltip?: ReactNode;
  tooltipProps?: {
    className?: string;
    closeDelay?: number;
    content: ReactNode;
    delay?: number;
    placement?: 'bottom' | 'left' | 'right' | 'top';
  };
}
export function SidebarMenuItem({
  children,
  className,
  closeMobileOnAction,
  forceReload = false,
  href,
  isCurrent = false,
  onAction,
  rel,
  target,
  tooltip,
  tooltipProps,
  ...props
}: SidebarMenuItemProps): ReactElement {
  const state = useSidebar();
  const inheritedCloseMobile = useContext(CloseMobileContext);
  const shouldCloseMobile = closeMobileOnAction ?? inheritedCloseMobile ?? true;
  const row: ReactNode[] = [];
  const nested: ReactNode[] = [];
  const action = () => {
    onAction?.();
    if (forceReload && href) window.location.href = href;
    if (state.isMobile && shouldCloseMobile && nested.length === 0)
      state.setMobileOpen(false);
  };
  const external = href ? /^https?:\/\//.test(href) : false;
  const resolvedRel = rel ?? (external ? 'noopener noreferrer' : undefined);
  const resolvedTarget = target ?? (external ? '_blank' : undefined);
  let contentProps: ComponentPropsWithRef<'div'> = {};
  Children.forEach(children, (child) => {
    if (isValidElement(child) && child.type === SidebarSubmenu)
      nested.push(
        (child as ReactElement<{ children: ReactNode }>).props.children,
      );
    else if (isValidElement(child) && child.type === SidebarMenuItemContent) {
      const { children: contentChildren, ...nextContentProps } =
        child.props as ComponentPropsWithRef<'div'>;
      contentProps = nextContentProps;
      Children.forEach(contentChildren, (contentChild) =>
        row.push(contentChild),
      );
    } else row.push(child);
  });
  const tooltipContent = tooltip ?? props.textValue;
  const renderedRow = row.map((child, index) => {
    const key =
      isValidElement(child) && child.key !== null ? child.key : `slot-${index}`;

    if (isValidElement(child) && child.type === SidebarMenuTrigger) {
      const {
        children: triggerChildren,
        className: triggerClassName,
        ...triggerProps
      } = child.props as SidebarMenuTriggerProps;

      return (
        <Button
          {...triggerProps}
          className={
            cn('sidebar__menu-trigger', triggerClassName) ??
            'sidebar__menu-trigger'
          }
          data-slot='sidebar-menu-trigger'
          key={key}
          slot='chevron'
        >
          {triggerChildren}
        </Button>
      );
    }

    if (
      index !== 0 ||
      !tooltipContent ||
      state.collapsible !== 'icon' ||
      state.isOpen ||
      !isValidElement(child) ||
      child.type !== SidebarMenuIcon
    ) {
      return <Fragment key={key}>{child}</Fragment>;
    }

    return (
      <Tooltip key={key}>
        <Tooltip.Trigger>{child}</Tooltip.Trigger>
        <Tooltip.Content
          {...tooltipProps}
          placement={state.side === 'left' ? 'right' : 'left'}
        >
          {tooltipContent}
        </Tooltip.Content>
      </Tooltip>
    );
  });
  const content = (
    <div
      {...contentProps}
      className={cn('sidebar__menu-item-content', contentProps.className)}
      data-slot='sidebar-menu-item-content'
    >
      {renderedRow}
    </div>
  );
  const renderedContent = tooltipProps ? (
    <Tooltip
      {...(tooltipProps.closeDelay === undefined
        ? {}
        : { closeDelay: tooltipProps.closeDelay })}
      {...(tooltipProps.delay === undefined
        ? {}
        : { delay: tooltipProps.delay })}
    >
      <Tooltip.Trigger className='w-full'>{content}</Tooltip.Trigger>
      <Tooltip.Content
        {...(tooltipProps.className === undefined
          ? {}
          : { className: tooltipProps.className })}
        placement={tooltipProps.placement ?? 'right'}
      >
        {tooltipProps.content}
      </Tooltip.Content>
    </Tooltip>
  ) : (
    content
  );
  const item = (
    <TreeItem
      {...props}
      {...(isCurrent ? { 'aria-current': 'page' as const } : {})}
      className={
        cn(
          'sidebar__menu-item',
          typeof className === 'string' ? className : undefined,
        ) ?? 'sidebar__menu-item'
      }
      data-current={isCurrent || undefined}
      data-reduce-motion={state.reduceMotion || undefined}
      data-slot='sidebar-menu-item'
      {...(href === undefined ? {} : { href })}
      {...(resolvedRel === undefined ? {} : { rel: resolvedRel })}
      {...(resolvedTarget === undefined ? {} : { target: resolvedTarget })}
      onAction={action}
    >
      <TreeItemContent>{renderedContent}</TreeItemContent>
      {state.collapsible === 'icon' && !state.isOpen ? null : nested}
    </TreeItem>
  );
  return item;
}
export const SidebarMenuItemContent = ({
  children,
}: ComponentPropsWithRef<'div'>): ReactElement => <>{children}</>;
export const SidebarMenuIcon = ({
  className,
  ...props
}: ComponentPropsWithRef<'span'>): ReactElement => (
  <span
    {...props}
    className={cn('sidebar__menu-icon', className)}
    data-slot='sidebar-menu-icon'
  />
);
export const SidebarMenuLabel = ({
  children,
  className,
  ...props
}: ComponentPropsWithRef<'span'>): ReactElement => (
  <span
    {...props}
    className={cn('sidebar__menu-label', className)}
    data-sidebar='label'
    data-slot='sidebar-menu-label'
  >
    <span
      className='sidebar__menu-label-text'
      data-slot='sidebar-menu-label-text'
    >
      {Children.toArray(children).filter(
        (child) => !isValidElement(child) || child.type !== SidebarMenuTrigger,
      )}
    </span>
    {Children.toArray(children).filter(
      (child) => isValidElement(child) && child.type === SidebarMenuTrigger,
    )}
  </span>
);
export const SidebarMenuChip = ({
  className,
  ...props
}: ComponentPropsWithRef<'span'>): ReactElement => (
  <span
    {...props}
    className={cn('sidebar__menu-chip', className)}
    data-slot='sidebar-menu-chip'
  />
);
export const SidebarMenuActions: SidebarDivPart = divPart(
  'sidebar-menu-actions',
  'sidebar__menu-actions',
);
export type SidebarMenuActionProps = ComponentPropsWithRef<typeof Button>;
export function SidebarMenuAction({
  className,
  ...props
}: SidebarMenuActionProps): ReactElement {
  return (
    <Button
      {...props}
      className={
        cn(
          'sidebar__menu-action',
          typeof className === 'string' ? className : undefined,
        ) ?? 'sidebar__menu-action'
      }
      data-slot='sidebar-menu-action'
    />
  );
}
export type SidebarMenuTriggerProps = ComponentPropsWithRef<typeof Button>;
export function SidebarMenuTrigger({
  children,
}: SidebarMenuTriggerProps): ReactElement {
  return <>{children}</>;
}
export function SidebarMenuIndicator({
  children,
  className,
  ...props
}: ComponentPropsWithRef<'svg'>): ReactElement {
  const indicatorProps = {
    ...props,
    className:
      cn('sidebar__menu-indicator', className) ?? 'sidebar__menu-indicator',
    'data-slot': 'sidebar-menu-indicator',
  };

  return isValidElement(children) ? (
    cloneElement(
      children as ReactElement<ComponentPropsWithRef<'svg'>>,
      indicatorProps,
    )
  ) : (
    <IconChevronRight aria-hidden='true' {...indicatorProps} />
  );
}
export const SidebarSubmenu = ({
  children,
}: {
  children: ReactNode;
}): ReactElement => <>{children}</>;
export type SidebarSeparatorProps = ComponentPropsWithRef<typeof HeroSeparator>;
export function SidebarSeparator({
  className,
  ...props
}: SidebarSeparatorProps): ReactElement {
  return (
    <HeroSeparator
      {...props}
      className={
        cn(
          'sidebar__separator',
          typeof className === 'string' ? className : undefined,
        ) ?? 'sidebar__separator'
      }
      data-slot='sidebar-separator'
    />
  );
}
export type SidebarTriggerProps = ComponentPropsWithRef<typeof HeroButton>;
export function SidebarTrigger({
  children,
  ...props
}: SidebarTriggerProps): ReactElement {
  const { toggleSidebar } = useSidebar();
  return (
    <HeroButton
      {...props}
      isIconOnly
      data-slot='sidebar-trigger'
      size='sm'
      variant='ghost'
      onPress={toggleSidebar}
    >
      {children ?? (
        <HugeiconsIcon aria-hidden='true' icon={SidebarLeftIcon} size={16} />
      )}
    </HeroButton>
  );
}
export function SidebarRail(
  props: ComponentPropsWithRef<'button'>,
): ReactElement {
  const { toggleSidebar } = useSidebar();
  return (
    <button
      {...props}
      aria-label='Toggle sidebar'
      className={cn('sidebar__rail', props.className)}
      data-slot='sidebar-rail'
      tabIndex={-1}
      type='button'
      onClick={toggleSidebar}
    />
  );
}
export function SidebarMain({
  className,
  ...props
}: ComponentPropsWithRef<'main'>): ReactElement {
  return (
    <main
      {...props}
      className={cn('sidebar__main', className)}
      data-slot='sidebar-main'
    />
  );
}
export function SidebarMobile({
  backdrop = 'blur',
  children,
  className,
  ...props
}: ComponentPropsWithRef<'div'> & {
  backdrop?: 'blur' | 'opaque' | 'transparent';
}): ReactElement | null {
  const state = useSidebar();
  return state.isMobile ? (
    <Sheet.Root
      isOpen={state.isMobileOpen}
      placement={state.side}
      onOpenChange={state.setMobileOpen}
    >
      <Sheet.Backdrop variant={backdrop}>
        <Sheet.Content className='sidebar__mobile-sheet'>
          <Sheet.Dialog
            aria-label='Mobile sidebar'
            className='sidebar__mobile-dialog'
          >
            <div
              {...props}
              className={cn('sidebar__mobile', className)}
              data-slot='sidebar-mobile'
            >
              {children}
            </div>
          </Sheet.Dialog>
        </Sheet.Content>
      </Sheet.Backdrop>
    </Sheet.Root>
  ) : null;
}
export function SidebarTooltip({
  children,
  content,
  ...props
}: {
  children: ReactNode;
  closeDelay?: number;
  content: ReactNode;
  delay?: number;
  placement?: 'bottom' | 'left' | 'right' | 'top';
}): ReactElement {
  const state = useSidebar();
  return state.isOpen ? (
    <>{children}</>
  ) : (
    <Tooltip>
      <Tooltip.Trigger>{children}</Tooltip.Trigger>
      <Tooltip.Content {...props}>{content}</Tooltip.Content>
    </Tooltip>
  );
}
type SidebarComponent = typeof SidebarRoot & {
  Content: typeof SidebarContent;
  Footer: typeof SidebarFooter;
  Group: typeof SidebarGroup;
  GroupLabel: typeof SidebarGroupLabel;
  Header: typeof SidebarHeader;
  Main: typeof SidebarMain;
  Menu: typeof SidebarMenu;
  MenuAction: typeof SidebarMenuAction;
  MenuActions: typeof SidebarMenuActions;
  MenuChip: typeof SidebarMenuChip;
  MenuHeader: typeof SidebarMenuHeader;
  MenuIcon: typeof SidebarMenuIcon;
  MenuIndicator: typeof SidebarMenuIndicator;
  MenuItem: typeof SidebarMenuItem;
  MenuItemContent: typeof SidebarMenuItemContent;
  MenuLabel: typeof SidebarMenuLabel;
  MenuSection: typeof SidebarMenuSection;
  MenuTrigger: typeof SidebarMenuTrigger;
  Mobile: typeof SidebarMobile;
  Provider: typeof SidebarProvider;
  Rail: typeof SidebarRail;
  Root: typeof SidebarRoot;
  Separator: typeof SidebarSeparator;
  Submenu: typeof SidebarSubmenu;
  Tooltip: typeof SidebarTooltip;
  Trigger: typeof SidebarTrigger;
};
export const Sidebar: SidebarComponent = Object.assign(SidebarRoot, {
  Content: SidebarContent,
  Footer: SidebarFooter,
  Group: SidebarGroup,
  GroupLabel: SidebarGroupLabel,
  Header: SidebarHeader,
  Main: SidebarMain,
  Menu: SidebarMenu,
  MenuAction: SidebarMenuAction,
  MenuActions: SidebarMenuActions,
  MenuChip: SidebarMenuChip,
  MenuHeader: SidebarMenuHeader,
  MenuIcon: SidebarMenuIcon,
  MenuIndicator: SidebarMenuIndicator,
  MenuItem: SidebarMenuItem,
  MenuItemContent: SidebarMenuItemContent,
  MenuLabel: SidebarMenuLabel,
  MenuSection: SidebarMenuSection,
  MenuTrigger: SidebarMenuTrigger,
  Mobile: SidebarMobile,
  Provider: SidebarProvider,
  Rail: SidebarRail,
  Root: SidebarRoot,
  Separator: SidebarSeparator,
  Submenu: SidebarSubmenu,
  Tooltip: SidebarTooltip,
  Trigger: SidebarTrigger,
});
