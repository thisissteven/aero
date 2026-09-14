import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { getSetting, updateSetting } from '@/app/hooks/api/settings';
import { ModelItem, ProviderGroup, SearchableModel } from '@/app/lib/model';

export interface SelectedAgent {
  name: string;
  description?: string;
}

export type ModelAgentSheetSelection = 'model' | 'agent' | 'variant';

interface ChatSettingsState {
  // --- Existing Chat Settings State ---
  selectedVariant: string | undefined;
  selectedModel: SearchableModel | null;
  selectedAgent: SelectedAgent | null;
  favoriteModelIds: string[];
  modelAgentSheetOpen: boolean;
  modelAgentSheetSelection: ModelAgentSheetSelection;

  // --- Model Directory State ---
  searchableModels: SearchableModel[];
  searchQuery: string;
  collapsedGroups: Set<string>;

  // --- Existing Actions ---
  setSelectedVariant: (selectedVariant: string) => void;
  cycleVariant: (direction?: 1 | -1) => void;
  setSelectedModel: (selectedModel: SearchableModel) => void;
  setSelectedAgent: (agent: SelectedAgent) => void;
  toggleFavoriteModel: (modelId: string) => void;
  isFavoriteModel: (modelId: string) => boolean;
  setFavoriteModelIds: (favoriteModelIds: string[]) => void;
  setModelAgentSheetOpen: (open: boolean) => void;
  setModelAgentSheetSelection: (selection: ModelAgentSheetSelection) => void;

  // --- Model Directory Actions ---
  setSearchQuery: (query: string) => void;
  setProvidersData: (providersData: any[] | null | undefined) => void;
  toggleGroupCollapse: (groupId: string) => void;

  // --- Model Directory Derived Helpers ---
  getFilteredModels: () => SearchableModel[];
  getFavoriteModels: () => SearchableModel[];
  getGroupedProviders: () => ProviderGroup[];
  getTotalResults: () => number;
  isModelVisible: (modelId: string) => boolean;
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
      // --- Initial State ---
      selectedVariant: undefined,
      selectedModel: null,
      selectedAgent: null,
      favoriteModelIds: [],
      modelAgentSheetOpen: false,
      modelAgentSheetSelection: 'agent',

      searchableModels: [],
      searchQuery: '',
      collapsedGroups: new Set<string>(),

      // --- Existing Actions ---
      setSelectedVariant: (selectedVariant) => {
        const selectedModel = get().selectedModel;

        if (!selectedModel) return;

        ++variantLoadVersion;

        set({ selectedVariant });

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

        set({ selectedVariant: nextVariant });

        void persistVariant(selectedModel.model.id, nextVariant);
      },

      setSelectedModel: (selectedModel) => {
        const previousVariant = get().selectedVariant;

        ++variantLoadVersion;

        set({ selectedModel });

        void loadVariantForModel(selectedModel, previousVariant);
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

      setModelAgentSheetOpen: (open) => set({ modelAgentSheetOpen: open }),

      setModelAgentSheetSelection: (selection) =>
        set({ modelAgentSheetSelection: selection }),

      // --- Model Directory Actions ---
      setSearchQuery: (searchQuery) => set({ searchQuery }),

      setProvidersData: (providersData) => {
        if (!providersData) {
          set({ searchableModels: [] });
          return;
        }

        const byId = new Map<string, SearchableModel>();
        for (const provider of providersData) {
          for (const model of Object.values(provider.models) as ModelItem[]) {
            if (!byId.has(model.id)) {
              byId.set(model.id, {
                model,
                providerId: provider.id,
                providerName: provider.name,
              });
            }
          }
        }
        set({ searchableModels: [...byId.values()] });
      },

      toggleGroupCollapse: (groupId) =>
        set((state) => {
          const next = new Set(state.collapsedGroups);
          if (next.has(groupId)) next.delete(groupId);
          else next.add(groupId);
          return { collapsedGroups: next };
        }),

      // --- Model Directory Helpers ---
      getFilteredModels: () => {
        const { searchableModels, searchQuery } = get();
        const normalized = searchQuery.trim().toLowerCase();
        if (!normalized) return searchableModels;

        return searchableModels.filter(
          ({ model, providerName }) =>
            model.name.toLowerCase().includes(normalized) ||
            model.id.toLowerCase().includes(normalized) ||
            providerName.toLowerCase().includes(normalized),
        );
      },

      getFavoriteModels: () => {
        const { favoriteModelIds } = get();
        if (favoriteModelIds.length === 0) return [];

        const filtered = get().getFilteredModels();
        return filtered.filter(({ model }) =>
          favoriteModelIds.includes(model.id),
        );
      },

      getGroupedProviders: () => {
        const { favoriteModelIds } = get();
        const filtered = get().getFilteredModels();
        const groups = new Map<string, ProviderGroup>();

        for (const entry of filtered) {
          if (favoriteModelIds.includes(entry.model.id)) continue;

          const existing = groups.get(entry.providerId);
          if (existing) {
            existing.models.push(entry);
          } else {
            groups.set(entry.providerId, {
              id: entry.providerId,
              name: entry.providerName,
              models: [entry],
            });
          }
        }

        return [...groups.values()];
      },

      getTotalResults: () => {
        return (
          get().getFavoriteModels().length +
          get()
            .getGroupedProviders()
            .reduce((total, group) => total + group.models.length, 0)
        );
      },

      isModelVisible: (modelId) => {
        const isFav = get()
          .getFavoriteModels()
          .some(({ model }) => model.id === modelId);
        if (isFav) return true;

        return get()
          .getGroupedProviders()
          .some((group) =>
            group.models.some(({ model }) => model.id === modelId),
          );
      },
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
