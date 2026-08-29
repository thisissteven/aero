import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface SelectedModel {
  id: string;
  name: string;
  providerId: string;
}

export interface SelectedAgent {
  name: string;
  description?: string;
}

export type ModelAgentSheetSelection = 'model' | 'agent';

interface ChatSettingsState {
  selectedModel: SelectedModel | null;
  selectedAgent: SelectedAgent | null;

  favoriteModelIds: string[];

  modelAgentSheetOpen: boolean;
  modelAgentSheetSelection: ModelAgentSheetSelection;

  setSelectedModel: (model: SelectedModel) => void;
  setSelectedAgent: (agent: SelectedAgent) => void;

  toggleFavoriteModel: (modelId: string) => void;
  isFavoriteModel: (modelId: string) => boolean;

  setFavoriteModelIds: (favoriteModelIds: string[]) => void;

  setModelAgentSheetOpen: (open: boolean) => void;
  setModelAgentSheetSelection: (selection: ModelAgentSheetSelection) => void;
}

export const useChatSettingsStore = create<ChatSettingsState>()(
  persist(
    (set, get) => ({
      selectedModel: null,
      selectedAgent: null,

      favoriteModelIds: [],

      modelAgentSheetOpen: false,
      modelAgentSheetSelection: 'model',

      setSelectedModel: (selectedModel) => set({ selectedModel }),

      setSelectedAgent: (selectedAgent) => set({ selectedAgent }),

      toggleFavoriteModel: (modelId) =>
        set((state) => {
          const exists = state.favoriteModelIds.includes(modelId);

          return {
            favoriteModelIds: exists
              ? state.favoriteModelIds.filter((id) => id !== modelId)
              : [...state.favoriteModelIds, modelId],
          };
        }),

      isFavoriteModel: (modelId) => get().favoriteModelIds.includes(modelId),

      setFavoriteModelIds: (favoriteModelIds) => set({ favoriteModelIds }),

      setModelAgentSheetOpen: (open) =>
        set({
          modelAgentSheetOpen: open,
          ...(open
            ? {}
            : {
                modelAgentSheetSelection: 'agent',
              }),
        }),

      setModelAgentSheetSelection: (selection) =>
        set({
          modelAgentSheetSelection: selection,
        }),
    }),
    {
      name: 'chat-input-settings-storage',

      partialize: (state) => ({
        selectedModel: state.selectedModel,
        selectedAgent: state.selectedAgent,
        favoriteModelIds: state.favoriteModelIds,
      }),
    },
  ),
);
