import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { SearchableModel } from '@/app/lib/model';

export interface SelectedAgent {
  name: string;
  description?: string;
}

export type ModelAgentSheetSelection = 'model' | 'agent' | 'variant';

interface ChatSettingsState {
  selectedVariant: string | undefined;

  selectedModel: SearchableModel | null;
  selectedAgent: SelectedAgent | null;

  favoriteModelIds: string[];

  modelAgentSheetOpen: boolean;
  modelAgentSheetSelection: ModelAgentSheetSelection;

  setSelectedVariant: (selectedVariant: string) => void;
  setSelectedModel: (model: SearchableModel) => void;
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
      selectedVariant: undefined,
      selectedModel: null,
      selectedAgent: null,

      favoriteModelIds: [],

      modelAgentSheetOpen: false,
      modelAgentSheetSelection: 'agent',

      setSelectedVariant: (selectedVariant) => set({ selectedVariant }),

      setSelectedModel: (selectedModel) => {
        const variants = Object.keys(selectedModel.model.variants ?? {});
        const selectedVariant =
          variants.length > 0
            ? variants[Math.floor((variants.length - 1) / 2)]
            : undefined;
        return set({ selectedModel, selectedVariant });
      },

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
        }),

      setModelAgentSheetSelection: (selection) =>
        set({
          modelAgentSheetSelection: selection,
        }),
    }),
    {
      name: 'chat-input-settings-storage',

      partialize: (state) => ({
        selectedVariant: state.selectedVariant,
        selectedModel: state.selectedModel,
        selectedAgent: state.selectedAgent,
        favoriteModelIds: state.favoriteModelIds,
      }),
    },
  ),
);
