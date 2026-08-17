import { create } from 'zustand';

import type { NavItemId } from '@/app/components/chat-aside/chat-aside';

interface ChatPanelState {
  isOpen: boolean;
  activeNavItem: NavItemId | null;
  isExpanded: boolean;
  setIsOpen: (isOpen: boolean) => void;
  setActiveNavItem: (item: NavItemId | null) => void;
  toggleNavItem: (id: NavItemId) => void;
  toggleExpanded: () => void;
  openClosePanelWithShortcut: (navItem?: NavItemId) => void;
  openAndExpandPanelWithShortcut: (navItem: NavItemId) => void;
  openPanel: () => void;
  closePanel: () => void;
}

export const useChatPanelStore = create<ChatPanelState>((set) => ({
  isOpen: false,
  activeNavItem: null,
  isExpanded: false,

  setIsOpen: (isOpen) => set({ isOpen }),

  setActiveNavItem: (item) =>
    set((state) => ({
      activeNavItem: item,
      isOpen: item !== null ? true : state.isOpen,
    })),

  toggleNavItem: (id) =>
    set((state) => {
      if (state.activeNavItem === id && state.isOpen) {
        return { isOpen: false };
      }
      return { activeNavItem: id, isOpen: true };
    }),

  toggleExpanded: () => set((state) => ({ isExpanded: !state.isExpanded })),

  openClosePanelWithShortcut: (navItem) =>
    set((state) => {
      if (state.isOpen && (navItem === state.activeNavItem || !navItem)) {
        return { isOpen: false };
      }
      return {
        isOpen: true,
        activeNavItem: navItem ?? state.activeNavItem ?? 'context',
      };
    }),

  openAndExpandPanelWithShortcut: (navItem) =>
    set((state) => {
      const isSameItemOpen = state.isOpen && state.activeNavItem === navItem;

      if (isSameItemOpen) {
        return { isExpanded: !state.isExpanded };
      }

      return {
        isOpen: true,
        activeNavItem: navItem,
        isExpanded: true,
      };
    }),

  openPanel: () =>
    set((state) => ({
      isOpen: true,
      activeNavItem: state.activeNavItem ?? 'context',
    })),

  closePanel: () => set({ isOpen: false }),
}));
