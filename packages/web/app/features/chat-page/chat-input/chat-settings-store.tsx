import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { getSetting, updateSetting } from '@/app/hooks/api/settings';
import {
  getModelKey,
  ModelItem,
  ProviderGroup,
  SearchableModel,
} from '@/app/lib/model';

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
  favoriteModelIds: string[]; // CHANGED: now stores composite `${providerId}-${modelId}` keys
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
  toggleFavoriteModel: (modelKey: string) => void; // CHANGED: arg is composite key
  isFavoriteModel: (modelKey: string) => boolean; // CHANGED: arg is composite key
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
  isModelVisible: (modelKey: string) => boolean; // CHANGED: arg is composite key
}

// Variant persistence stays keyed by raw model.id — variants belong to the
// model itself, not to the provider binding. Leave as-is.
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

      toggleFavoriteModel: (modelKey) =>
        set((state) => {
          const exists = state.favoriteModelIds.includes(modelKey);

          return {
            favoriteModelIds: exists
              ? state.favoriteModelIds.filter((id) => id !== modelKey)
              : [...state.favoriteModelIds, modelKey],
          };
        }),

      isFavoriteModel: (modelKey) => get().favoriteModelIds.includes(modelKey),

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

        const byKey = new Map<string, SearchableModel>();

        for (const provider of providersData) {
          for (const model of Object.values(provider.models) as ModelItem[]) {
            const key = `${provider.id}-${model.id}`;

            if (!byKey.has(key)) {
              byKey.set(key, {
                model,
                providerId: provider.id,
                providerName: provider.name,
              });
            }
          }
        }

        set({ searchableModels: [...byKey.values()] });
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
        return filtered.filter((entry) =>
          favoriteModelIds.includes(getModelKey(entry)),
        );
      },

      getGroupedProviders: () => {
        const { favoriteModelIds } = get();
        const filtered = get().getFilteredModels();
        const groups = new Map<string, ProviderGroup>();

        for (const entry of filtered) {
          if (favoriteModelIds.includes(getModelKey(entry))) continue;

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

      isModelVisible: (modelKey) => {
        const isFav = get()
          .getFavoriteModels()
          .some((entry) => getModelKey(entry) === modelKey);
        if (isFav) return true;

        return get()
          .getGroupedProviders()
          .some((group) =>
            group.models.some((entry) => getModelKey(entry) === modelKey),
          );
      },
    }),

    {
      name: 'chat-input-settings-storage',

      // Bumped because favoriteModelIds changed from raw model.id to
      // `${providerId}-${modelId}`. Old entries can't be resolved without
      // provider data, so drop them once on upgrade.
      version: 1,

      migrate: (persisted: any, version) => {
        if (version < 1 && persisted) {
          persisted.favoriteModelIds = [];
        }
        return persisted;
      },

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
