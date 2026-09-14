// useModelDirectory.ts
import { useEffect, useMemo } from 'react';
import { useChatSettingsStore } from '@/app/features/chat-page/chat-input/chat-settings-store';
import { useConfiguredProviders } from '@/app/hooks/api/providers';
import { SearchableModel } from '@/app/lib/model';

export function useModelDirectory() {
  const { data: providersData } = useConfiguredProviders();
  const setProvidersData = useChatSettingsStore((s) => s.setProvidersData);

  useEffect(() => {
    setProvidersData(providersData);
  }, [providersData, setProvidersData]);

  const searchableModels = useChatSettingsStore((s) => s.searchableModels);
  const searchQuery = useChatSettingsStore((s) => s.searchQuery);
  const favoriteModelIds = useChatSettingsStore((s) => s.favoriteModelIds);
  const collapsedGroups = useChatSettingsStore((s) => s.collapsedGroups);

  const setSearchQuery = useChatSettingsStore((s) => s.setSearchQuery);
  const toggleGroupCollapse = useChatSettingsStore(
    (s) => s.toggleGroupCollapse,
  );

  // Compute derived state using useMemo so references stay STABLE across renders
  const filteredModels = useMemo(() => {
    const normalized = searchQuery.trim().toLowerCase();
    if (!normalized) return searchableModels;

    return searchableModels.filter(
      ({ model, providerName }) =>
        model.name.toLowerCase().includes(normalized) ||
        model.id.toLowerCase().includes(normalized) ||
        providerName.toLowerCase().includes(normalized),
    );
  }, [searchableModels, searchQuery]);

  const favoriteModels = useMemo(() => {
    if (favoriteModelIds.length === 0) return [];
    return filteredModels.filter(({ model }) =>
      favoriteModelIds.includes(model.id),
    );
  }, [filteredModels, favoriteModelIds]);

  const groupedProviders = useMemo(() => {
    const groups = new Map();

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
    groupedProviders.reduce((acc, g) => acc + g.models.length, 0);

  const isModelVisible = (modelId: string) =>
    favoriteModels.some(({ model }) => model.id === modelId) ||
    groupedProviders.some((g) =>
      g.models.some(
        ({ model }: { model: SearchableModel['model'] }) =>
          model.id === modelId,
      ),
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
