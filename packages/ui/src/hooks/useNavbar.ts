import { createContext, useContext } from 'react';

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

export const NavbarContext = createContext<NavbarContextValue>({
  height: '4rem',
  isHidden: false,
  isMenuOpen: false,
  setMenuOpen: () => {},
  maxWidth: 'lg',
  size: 'md',
});

export const useNavbar = (): NavbarContextValue => useContext(NavbarContext);
