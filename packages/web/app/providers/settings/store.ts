import { create } from 'zustand';

export type SettingsTab =
  // OPENCHAMBER
  | 'general'
  | 'appearance'
  | 'chat'
  | 'notifications'
  | 'sessions'
  | 'shortcuts'
  | 'voice'
  | 'usage'
  // WORKSPACE
  | 'projects'
  | 'remote-instances'
  | 'external-tunnel'
  | 'git'
  // OPENCODE
  | 'providers'
  | 'agents'
  | 'behavior'
  | 'commands'
  | 'mcp'
  | 'plugins'
  // LIBRARY
  | 'magic-prompts'
  | 'snippets'
  | 'skills'
  | 'skills-catalog';

interface SettingsStore {
  isOpen: boolean;
  activeTab: SettingsTab;
  searchQuery: string;
  selectedSkillId: string | null;
  sidebarScrollTop: number;
  openModal: (initialTab?: SettingsTab) => void;
  closeModal: () => void;
  setActiveTab: (tab: SettingsTab) => void;
  setSearchQuery: (query: string) => void;
  setSelectedSkillId: (id: string | null) => void;
  setSidebarScrollTop: (scrollTop: number) => void;
}

export const useSettingsModalStore = create<SettingsStore>((set) => ({
  isOpen: false,
  activeTab: 'appearance',
  searchQuery: '',
  selectedSkillId: 'find-skills',
  sidebarScrollTop: 0,

  openModal: (initialTab) =>
    set((state) => ({
      isOpen: true,
      activeTab: initialTab ?? state.activeTab,
    })),

  closeModal: () => set({ isOpen: false }),
  setActiveTab: (tab) => set({ activeTab: tab }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  setSelectedSkillId: (id) => set({ selectedSkillId: id }),
  setSidebarScrollTop: (scrollTop) => set({ sidebarScrollTop: scrollTop }),
}));
