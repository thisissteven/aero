import { useCallback, useMemo, useState } from 'react';

import { useConfiguredProviders } from '@/app/hooks/api/providers';
import { ModelItem, ProviderGroup, SearchableModel } from '@/app/lib/model';

export interface UseModelDirectoryOptions {
  /**
   * When provided, models whose id appears in this list are pulled out
   * into `favoriteModels` and excluded from `groupedProviders`. Omit
   * entirely for pickers that don't support favorites (e.g. the
   * workspace default-model dropdown).
   */
  favoriteModelIds?: string[];
}

export interface UseModelDirectoryResult {
  searchableModels: SearchableModel[];
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  favoriteModels: SearchableModel[];
  groupedProviders: ProviderGroup[];
  totalResults: number;
  collapsedGroups: Set<string>;
  toggleGroupCollapse: (groupId: string) => void;
  /** True if a model id is present in the current (search-filtered) result set. */
  isModelVisible: (modelId: string) => boolean;
}

const EMPTY_FAVORITES: string[] = [];

export function useModelDirectory({
  favoriteModelIds = EMPTY_FAVORITES,
}: UseModelDirectoryOptions = {}): UseModelDirectoryResult {
  const { data: providersData } = useConfiguredProviders();

  const [searchQuery, setSearchQuery] = useState('');
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(
    new Set(),
  );

  const searchableModels = useMemo<SearchableModel[]>(() => {
    if (!providersData) return [];

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
    return [...byId.values()];
  }, [providersData]);

  const normalizedSearch = searchQuery.trim().toLowerCase();

  const filteredModels = useMemo(() => {
    if (!normalizedSearch) return searchableModels;

    return searchableModels.filter(
      ({ model, providerName }) =>
        model.name.toLowerCase().includes(normalizedSearch) ||
        model.id.toLowerCase().includes(normalizedSearch) ||
        providerName.toLowerCase().includes(normalizedSearch),
    );
  }, [searchableModels, normalizedSearch]);

  const favoriteModels = useMemo(
    () =>
      favoriteModelIds.length === 0
        ? []
        : filteredModels.filter(({ model }) =>
            favoriteModelIds.includes(model.id),
          ),
    [filteredModels, favoriteModelIds],
  );

  const groupedProviders = useMemo<ProviderGroup[]>(() => {
    const groups = new Map<string, ProviderGroup>();

    for (const entry of filteredModels) {
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
  }, [filteredModels, favoriteModelIds]);

  const totalResults =
    favoriteModels.length +
    groupedProviders.reduce(
      (total, provider) => total + provider.models.length,
      0,
    );

  const toggleGroupCollapse = useCallback((groupId: string) => {
    setCollapsedGroups((previous) => {
      const next = new Set(previous);
      if (next.has(groupId)) next.delete(groupId);
      else next.add(groupId);
      return next;
    });
  }, []);

  const isModelVisible = useCallback(
    (modelId: string) =>
      favoriteModels.some(({ model }) => model.id === modelId) ||
      groupedProviders.some((group) =>
        group.models.some(({ model }) => model.id === modelId),
      ),
    [favoriteModels, groupedProviders],
  );

  return {
    searchableModels,
    searchQuery,
    setSearchQuery,
    favoriteModels,
    groupedProviders,
    totalResults,
    collapsedGroups,
    toggleGroupCollapse,
    isModelVisible,
  };
}
