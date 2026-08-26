// app/features/chat-page/chat-input/chat-settings-store.tsx

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

interface ChatSettingsState {
  selectedModel: SelectedModel | null;
  selectedAgent: SelectedAgent | null;

  favoriteModelIds: string[];

  setSelectedModel: (model: SelectedModel) => void;
  setSelectedAgent: (agent: SelectedAgent) => void;

  toggleFavoriteModel: (modelId: string) => void;
  isFavoriteModel: (modelId: string) => boolean;

  // NEW: bulk setter, used to prune stale favorite ids once we
  // know what models actually exist (localStorage may reference
  // ids that no longer come back from the provider list).
  setFavoriteModelIds: (favoriteModelIds: string[]) => void;
}

export const useChatSettingsStore = create<ChatSettingsState>()(
  persist(
    (set, get) => ({
      selectedModel: null,
      selectedAgent: null,

      favoriteModelIds: [],

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
