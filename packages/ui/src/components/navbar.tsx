'use client';

import { cn, Separator } from '@heroui/react';
import { handleLinkClick, useRouter } from '@react-aria/utils';
import type { ComponentPropsWithRef, ReactElement, RefObject } from 'react';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { ToggleButton } from 'react-aria-components';

import { useAppLayout } from './app-layout';

export type NavbarPosition = 'floating' | 'static' | 'sticky';
export type NavbarSize = 'lg' | 'md' | 'sm';
export type NavbarMaxWidth = '2xl' | 'full' | 'lg' | 'md' | 'sm' | 'xl';
export interface NavbarContextValue {
  height: string;
  isHidden: boolean;
  isMenuOpen: boolean;
  maxWidth: NavbarMaxWidth;
  navigate?: ((href: string) => void) | undefined;
  setMenuOpen: (open: boolean) => void;
  size: NavbarSize;
}
const Context = createContext<NavbarContextValue>({
  height: '4rem',
  isHidden: false,
  isMenuOpen: false,
  setMenuOpen: () => {},
  maxWidth: 'lg',
  size: 'md',
});
export const useNavbar = (): NavbarContextValue => useContext(Context);
export interface NavbarRootProps extends ComponentPropsWithRef<'nav'> {
  defaultMenuOpen?: boolean;
  height?: string;
  hideOnScroll?: boolean;
  isMenuOpen?: boolean;
  maxWidth?: NavbarMaxWidth;
  navigate?: (href: string) => void;
  onMenuOpenChange?: (open: boolean) => void;
  parentRef?: RefObject<HTMLElement | null>;
  position?: NavbarPosition;
  shouldBlockScroll?: boolean;
  size?: NavbarSize;
}
export function NavbarRoot({
  children,
  className,
  defaultMenuOpen = false,
  height = '4rem',
  hideOnScroll = false,
  isMenuOpen,
  maxWidth = 'lg',
  navigate,
  onMenuOpenChange,
  parentRef,
  position = 'sticky',
  shouldBlockScroll = true,
  size = 'md',
  style,
  ...props
}: NavbarRootProps): ReactElement {
  const appLayout = useAppLayout();
  const resolvedNavigate = navigate ?? appLayout?.navigate;
  const [local, setLocal] = useState(defaultMenuOpen);
  const menuOpen = isMenuOpen ?? local;
  const setMenuOpen = useCallback(
    (value: boolean) => {
      if (isMenuOpen === undefined) setLocal(value);
      onMenuOpenChange?.(value);
    },
    [isMenuOpen, onMenuOpenChange],
  );
  const [hidden, setHidden] = useState(false);
  const navRef = useRef<HTMLElement>(null);
  useEffect(() => {
    if (!hideOnScroll) return;
    let previous = 0;
    const target = parentRef?.current ?? window;
    const read = () => parentRef?.current?.scrollTop ?? window.scrollY;
    const handler = () => {
      const next = read();
      setHidden(next > previous && next > (navRef.current?.offsetHeight ?? 0));
      previous = next;
    };
    target.addEventListener('scroll', handler, { passive: true });
    return () => target.removeEventListener('scroll', handler);
  }, [hideOnScroll, parentRef]);
  useEffect(() => {
    if (!shouldBlockScroll || !menuOpen) return;
    const old = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = old;
    };
  }, [menuOpen, shouldBlockScroll]);
  useEffect(() => {
    const resize = () => {
      if (menuOpen && window.innerWidth >= 768) setMenuOpen(false);
    };
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, [menuOpen, setMenuOpen]);
  const value = useMemo(
    () => ({
      height,
      isHidden: hidden,
      isMenuOpen: menuOpen,
      maxWidth,
      navigate: resolvedNavigate,
      setMenuOpen,
      size,
    }),
    [height, hidden, maxWidth, menuOpen, resolvedNavigate, setMenuOpen, size],
  );
  return (
    <Context value={value}>
      <nav
        {...props}
        ref={navRef}
        className={cn('navbar', `navbar--${position}`, className)}
        data-hidden={hidden || undefined}
        data-in-app-layout={appLayout ? 'true' : undefined}
        data-menu-open={menuOpen || undefined}
        data-slot='navbar'
        style={{ ...style, '--navbar-height': height } as React.CSSProperties}
      >
        {children}
      </nav>
    </Context>
  );
}
export type NavbarHeaderProps = ComponentPropsWithRef<'header'>;
export function NavbarHeader({
  className,
  ...props
}: NavbarHeaderProps): ReactElement {
  const { maxWidth, size } = useNavbar();
  return (
    <header
      {...props}
      className={cn(
        'navbar__header',
        `navbar__header--${size}`,
        `navbar__header--max-${maxWidth}`,
        className,
      )}
      data-slot='navbar-header'
    />
  );
}
export type NavbarBrandProps = ComponentPropsWithRef<'div'>;
export function NavbarBrand({
  className,
  ...props
}: NavbarBrandProps): ReactElement {
  return (
    <div
      {...props}
      className={cn('navbar__brand', className)}
      data-slot='navbar-brand'
    />
  );
}
export type NavbarContentProps = ComponentPropsWithRef<'div'>;
export function NavbarContent({
  className,
  ...props
}: NavbarContentProps): ReactElement {
  return (
    <div
      {...props}
      className={cn('navbar__content', className)}
      data-slot='navbar-content'
    />
  );
}
export interface NavbarItemProps extends Omit<
  ComponentPropsWithRef<'a'>,
  'href'
> {
  forceReload?: boolean;
  href?: string;
  isCurrent?: boolean;
  render?: (props: Record<string, unknown>) => ReactElement;
}
function NavItem({
  children,
  className,
  forceReload = false,
  href,
  isCurrent = false,
  render,
  menu = false,
  ...props
}: NavbarItemProps & { menu?: boolean }): ReactElement {
  const { navigate, setMenuOpen, size } = useNavbar();
  const router = useRouter();
  const handle = (
    event: React.MouseEvent<HTMLAnchorElement | HTMLButtonElement>,
  ) => {
    if (href) {
      if (/^https?:\/\//.test(href)) {
        event.preventDefault();
        window.open(href, '_blank', 'noopener,noreferrer');
      } else if (navigate && !forceReload) {
        event.preventDefault();
        navigate(href);
      } else if (!forceReload)
        handleLinkClick(
          event as React.MouseEvent<HTMLAnchorElement>,
          router,
          href,
          undefined,
        );
    }
    if (menu) setMenuOpen(false);
  };
  const shared = {
    ...props,
    'aria-current': isCurrent ? ('page' as const) : undefined,
    className: cn(
      menu ? 'navbar__menu-item' : 'navbar__item',
      `${menu ? 'navbar__menu-item' : 'navbar__item'}--${size}`,
      className,
    ),
    'data-current': isCurrent || undefined,
    'data-slot': menu ? 'navbar-menu-item' : 'navbar-item',
    onClick: handle,
  };
  if (render) return render(shared);
  return href ? (
    <a {...shared} href={href}>
      {children}
    </a>
  ) : (
    <button {...(shared as ComponentPropsWithRef<'button'>)} type='button'>
      {children}
    </button>
  );
}
export function NavbarItem(props: NavbarItemProps): ReactElement {
  return <NavItem {...props} />;
}
export type NavbarLabelProps = ComponentPropsWithRef<'span'>;
export function NavbarLabel({
  className,
  ...props
}: NavbarLabelProps): ReactElement {
  return (
    <span
      {...props}
      className={cn('navbar__label', className)}
      data-slot='navbar-label'
    />
  );
}
export type NavbarSeparatorProps = ComponentPropsWithRef<typeof Separator>;
export function NavbarSeparator({
  className,
  ...props
}: NavbarSeparatorProps): ReactElement {
  return (
    <Separator
      {...props}
      className={
        cn(
          'navbar__separator',
          typeof className === 'string' ? className : undefined,
        ) ?? 'navbar__separator'
      }
      data-slot='navbar-separator'
      orientation='vertical'
    />
  );
}
export type NavbarSpacerProps = ComponentPropsWithRef<'div'>;
export function NavbarSpacer({
  className,
  ...props
}: NavbarSpacerProps): ReactElement {
  return (
    <div
      {...props}
      aria-hidden='true'
      className={cn('navbar__spacer', className)}
      data-slot='navbar-spacer'
    />
  );
}
export interface NavbarMenuToggleProps extends Omit<
  ComponentPropsWithRef<typeof ToggleButton>,
  'isSelected' | 'onChange'
> {
  srLabel?: string;
}
export function NavbarMenuToggle({
  children,
  className,
  srLabel = 'Toggle navigation menu',
  ...props
}: NavbarMenuToggleProps): ReactElement {
  const { isMenuOpen, setMenuOpen, size } = useNavbar();
  return (
    <ToggleButton
      {...props}
      aria-label={srLabel}
      className={
        cn(
          'navbar__menu-toggle',
          `navbar__menu-toggle--${size}`,
          typeof className === 'string' ? className : undefined,
        ) ?? 'navbar__menu-toggle'
      }
      data-slot='navbar-menu-toggle'
      isSelected={isMenuOpen}
      onChange={setMenuOpen}
    >
      {children ?? (
        <span
          className='navbar__menu-toggle-icon'
          data-slot='navbar-menu-toggle-icon'
        />
      )}
    </ToggleButton>
  );
}
export type NavbarMenuProps = ComponentPropsWithRef<'div'>;
export function NavbarMenu({
  className,
  ...props
}: NavbarMenuProps): ReactElement | null {
  const { isMenuOpen } = useNavbar();
  return isMenuOpen ? (
    <div
      {...props}
      className={cn('navbar__menu', className)}
      data-slot='navbar-menu'
    />
  ) : null;
}
export function NavbarMenuItem(props: NavbarItemProps): ReactElement {
  return <NavItem {...props} menu />;
}
type NavbarComponent = typeof NavbarRoot & {
  Brand: typeof NavbarBrand;
  Content: typeof NavbarContent;
  Header: typeof NavbarHeader;
  Item: typeof NavbarItem;
  Label: typeof NavbarLabel;
  Menu: typeof NavbarMenu;
  MenuItem: typeof NavbarMenuItem;
  MenuToggle: typeof NavbarMenuToggle;
  Root: typeof NavbarRoot;
  Separator: typeof NavbarSeparator;
  Spacer: typeof NavbarSpacer;
};
export const Navbar: NavbarComponent = Object.assign(NavbarRoot, {
  Brand: NavbarBrand,
  Content: NavbarContent,
  Header: NavbarHeader,
  Item: NavbarItem,
  Label: NavbarLabel,
  Menu: NavbarMenu,
  MenuItem: NavbarMenuItem,
  MenuToggle: NavbarMenuToggle,
  Root: NavbarRoot,
  Separator: NavbarSeparator,
  Spacer: NavbarSpacer,
});
