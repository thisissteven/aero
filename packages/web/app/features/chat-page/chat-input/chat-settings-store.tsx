import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { getSetting, updateSetting } from '@/app/hooks/api/settings';
import { debounce } from '@/app/hooks/useDebounce';
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
  cycleVariant: (direction?: 1 | -1) => void;
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

      setSelectedVariant: (selectedVariant) => {
        set((state) => {
          const selectedModel = state.selectedModel;
          if (selectedModel) {
            debounce(
              async () =>
                await updateSetting({
                  path: ['recentModelVariants', selectedModel.model.id],
                  value: selectedVariant,
                }),
              300,
            )();
          }
          return { selectedVariant };
        });
      },

      cycleVariant: (direction = 1) => {
        const { selectedModel, selectedVariant } = get();
        if (!selectedModel) return;
        const variants = Object.keys(selectedModel.model.variants ?? {});
        if (variants.length === 0) return;
        const currentIndex = selectedVariant
          ? variants.indexOf(selectedVariant)
          : -1;
        const nextIndex =
          currentIndex === -1
            ? direction === 1
              ? 0
              : variants.length - 1
            : (currentIndex + direction + variants.length) % variants.length;

        set({ selectedVariant: variants[nextIndex] });
        debounce(
          async () =>
            await updateSetting({
              path: ['recentModelVariants', selectedModel.model.id],
              value: variants[nextIndex],
            }),
          300,
        )();
      },

      setSelectedModel: (selectedModel) => {
        set({ selectedModel });

        void getSetting(['recentModelVariants', selectedModel.model.id]).then(
          ({ value: recentVariant }) => {
            const variants = Object.keys(selectedModel.model.variants ?? {});

            const selectedVariant =
              recentVariant ??
              (variants.length > 0
                ? variants[Math.floor((variants.length - 1) / 2)]
                : undefined);

            set({ selectedVariant });
          },
        );
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

      setFavoriteModelIds: (favoriteModelIds) => {
        set({ favoriteModelIds });
      },

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
