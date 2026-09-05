import { create } from 'zustand';

import { AeroWorkspaceSummary } from '@/server/services/harness/types';

interface EditWorkspaceState {
  workspace: AeroWorkspaceSummary;
  name: string;
  directory: string;
  selectedColor: string | null;
  selectedIcon: string | null;
  customIconUri: string | null;
  defaultModel: string | null;

  init: (workspace: AeroWorkspaceSummary) => void;
  setName: (name: string) => void;
  setDirectory: (directory: string) => void;
  setSelectedColor: (color: string | null) => void;
  setSelectedIcon: (icon: string | null) => void;
  setCustomIconUri: (uri: string | null) => void;
  setDefaultModel: (model: string | null) => void;
}

const isCustomUri = (uri: string | null): uri is string => {
  if (!uri) return false;
  return (
    uri.startsWith('data:') ||
    uri.startsWith('http://') ||
    uri.startsWith('https://') ||
    uri.startsWith('/')
  );
};

export const useEditWorkspaceStore = create<EditWorkspaceState>((set) => ({
  workspace: {} as AeroWorkspaceSummary,
  name: '',
  directory: '',
  selectedColor: null,
  selectedIcon: null,
  customIconUri: null,
  defaultModel: null,

  init: (workspace) =>
    set({
      workspace,
      name: workspace.name,
      directory: workspace.directory,
      selectedColor: workspace.selectedColor ?? null,
      selectedIcon: workspace.selectedIcon ?? null,
      customIconUri: isCustomUri(workspace.selectedIcon ?? null)
        ? workspace.selectedIcon
        : null,
      defaultModel: workspace.defaultModel ?? null,
    }),

  setName: (name) => set({ name }),
  setDirectory: (directory) => set({ directory }),
  setSelectedColor: (selectedColor) => set({ selectedColor }),
  setSelectedIcon: (selectedIcon) => set({ selectedIcon }),
  setCustomIconUri: (customIconUri) => set({ customIconUri }),
  setDefaultModel: (defaultModel) => set({ defaultModel }),
}));
