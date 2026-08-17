import { create } from 'zustand';

import type { NavItemId } from '@/app/components/chat-aside';

interface ChatPanelState {
  activeNavItem: NavItemId | null;
  isExpanded: boolean;
  setActiveNavItem: (item: NavItemId | null) => void;
  toggleNavItem: (id: NavItemId) => void;
  toggleExpanded: () => void;
  closePanel: () => void;
}

export const useChatPanelStore = create<ChatPanelState>((set) => ({
  activeNavItem: null,
  isExpanded: false,

  setActiveNavItem: (item) => set({ activeNavItem: item }),

  toggleNavItem: (id) =>
    set((state) => {
      if (state.activeNavItem === id) {
        return { activeNavItem: null, isExpanded: false };
      }
      return { activeNavItem: id };
    }),

  toggleExpanded: () => set((state) => ({ isExpanded: !state.isExpanded })),

  closePanel: () => set({ activeNavItem: null, isExpanded: false }),
}));
