import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { getSetting, updateSetting } from '@/app/hooks/api/settings';
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
  setSelectedModel: (selectedModel: SearchableModel) => void;
  setSelectedAgent: (agent: SelectedAgent) => void;

  toggleFavoriteModel: (modelId: string) => void;
  isFavoriteModel: (modelId: string) => boolean;

  setFavoriteModelIds: (favoriteModelIds: string[]) => void;

  setModelAgentSheetOpen: (open: boolean) => void;
  setModelAgentSheetSelection: (selection: ModelAgentSheetSelection) => void;
}

const persistVariant = async (modelId: string, variant: string) => {
  await updateSetting({
    path: ['recentModelVariants', modelId],
    value: variant,
  });
};

let variantLoadVersion = 0;

async function loadVariantForModel(
  model: SearchableModel,
  previousVariant: string | undefined,
) {
  const version = ++variantLoadVersion;

  const { value: recentVariant } = await getSetting([
    'recentModelVariants',
    model.model.id,
  ]);

  const current = useChatSettingsStore.getState();

  if (
    version !== variantLoadVersion ||
    current.selectedModel?.model.id !== model.model.id
  ) {
    return;
  }

  const variants = Object.keys(model.model.variants ?? {});

  const resolvedVariant =
    recentVariant && variants.includes(recentVariant)
      ? recentVariant
      : previousVariant && variants.includes(previousVariant)
        ? previousVariant
        : variants.length > 0
          ? variants[Math.floor((variants.length - 1) / 2)]
          : undefined;

  useChatSettingsStore.setState({
    selectedVariant: resolvedVariant,
  });
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
        const selectedModel = get().selectedModel;

        if (!selectedModel) return;

        ++variantLoadVersion;

        set({
          selectedVariant,
        });

        void persistVariant(selectedModel.model.id, selectedVariant);
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

        const nextVariant = variants[nextIndex];

        ++variantLoadVersion;

        set({
          selectedVariant: nextVariant,
        });

        void persistVariant(selectedModel.model.id, nextVariant);
      },

      setSelectedModel: (selectedModel) => {
        const previousVariant = get().selectedVariant;

        ++variantLoadVersion;

        set({
          selectedModel,
        });

        void loadVariantForModel(selectedModel, previousVariant);
      },

      setSelectedAgent: (selectedAgent) =>
        set({
          selectedAgent,
        }),

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
        set({
          favoriteModelIds,
        });
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

      onRehydrateStorage: () => {
        return () => {
          const state = useChatSettingsStore.getState();

          if (state.selectedModel) {
            void loadVariantForModel(
              state.selectedModel,
              state.selectedVariant,
            );
          }
        };
      },
    },
  ),
);
