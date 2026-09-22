import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { getSetting, updateSetting } from '@/app/hooks/api/settings';
import { ModelItem, SearchableModel } from '@/app/lib/model';

export interface SelectedAgent {
  name: string;
  description?: string;
}

export type ModelAgentSheetSelection = 'model' | 'agent' | 'variant';

interface ChatSettingsState {
  // --- Chat Settings State ---
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

  // --- Actions ---
  setSelectedVariant: (selectedVariant: string) => void;
  cycleVariant: (direction?: 1 | -1) => void;
  setSelectedModel: (selectedModel: SearchableModel) => void;
  setSelectedAgent: (agent: SelectedAgent) => void;
  toggleFavoriteModel: (modelKey: string) => void;
  isFavoriteModel: (modelKey: string) => boolean;
  setFavoriteModelIds: (favoriteModelIds: string[]) => void;
  setModelAgentSheetOpen: (open: boolean) => void;
  setModelAgentSheetSelection: (selection: ModelAgentSheetSelection) => void;

  // --- Model Directory Actions ---
  setSearchQuery: (query: string) => void;
  setProvidersData: (providersData: any[] | null | undefined) => void;
  toggleGroupCollapse: (groupId: string) => void;
}

// Variant persistence stays keyed by raw model.id — variants belong to the
// model itself, not to the provider binding.
const persistVariant = async (modelId: string, variant: string) => {
  await updateSetting({
    path: ['recentModelVariants', modelId],
    value: variant,
  });
};

let variantLoadVersion = 0;

// Session-local cache of resolved variants per model id. Keeps model swaps
// synchronous when we've seen the model before — otherwise the picker would
// hold the *previous* model's variant while the settings fetch is in flight.
const variantCache = new Map<string, string | undefined>();

async function loadVariantForModel(model: SearchableModel) {
  const modelId = model.model.id;
  const variants = Object.keys(model.model.variants ?? {});

  // Cache hit → resolve synchronously. Validate against the current variant
  // list first, since a provider may have added/removed variants.
  if (variantCache.has(modelId)) {
    const cached = variantCache.get(modelId);
    if (cached === undefined || variants.includes(cached)) {
      useChatSettingsStore.setState({ selectedVariant: cached });
      return;
    }
    variantCache.delete(modelId);
  }

  const version = ++variantLoadVersion;

  const { value: recentVariant } = await getSetting([
    'recentModelVariants',
    modelId,
  ]);

  const current = useChatSettingsStore.getState();

  if (
    version !== variantLoadVersion ||
    current.selectedModel?.model.id !== modelId
  ) {
    return;
  }

  // Resolve strictly against *this* model: use the variant last saved for it,
  // otherwise fall back to a neutral default. Never inherit the outgoing
  // model's variant — only an explicit user choice changes a model's variant.
  const resolvedVariant =
    recentVariant && variants.includes(recentVariant)
      ? recentVariant
      : variants.length > 0
        ? variants[Math.floor((variants.length - 1) / 2)]
        : undefined;

  variantCache.set(modelId, resolvedVariant);
  useChatSettingsStore.setState({ selectedVariant: resolvedVariant });
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

      // --- Actions ---
      setSelectedVariant: (selectedVariant) => {
        const selectedModel = get().selectedModel;

        if (!selectedModel) return;

        ++variantLoadVersion;

        // User choice → update both the cache and the persisted setting.
        variantCache.set(selectedModel.model.id, selectedVariant);
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

        variantCache.set(selectedModel.model.id, nextVariant);
        set({ selectedVariant: nextVariant });

        void persistVariant(selectedModel.model.id, nextVariant);
      },

      setSelectedModel: (selectedModel) => {
        ++variantLoadVersion;

        // Note: we deliberately do NOT clear `selectedVariant` here. On a
        // cache miss, that leaves the previous model's variant visible while
        // `loadVariantForModel` fetches — i.e. keepPreviousData semantics.
        set({ selectedModel });

        void loadVariantForModel(selectedModel);
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
    }),

    {
      name: 'chat-input-settings-storage',
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
            void loadVariantForModel(state.selectedModel);
          }
        };
      },
    },
  ),
);
