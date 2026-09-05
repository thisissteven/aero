import { useEffect } from 'react';

import { SearchableModel } from '@/app/lib/model';

export interface UseModelSelectionSyncOptions {
  selectedModel: SearchableModel | null;
  setSelectedModel: (model: SearchableModel) => void;
  favoriteModelIds?: string[];
  setFavoriteModelIds?: (ids: string[]) => void;
}

/**
 * Keeps an externally-owned "selected model" (and, optionally, favorites)
 * valid against the current provider/model registry: falls back to the
 * first available model if the stored selection disappears, and prunes
 * favorite ids that no longer resolve to a real model.
 *
 * Deliberately store-agnostic — pass in whichever getters/setters own the
 * state (zustand, component props, etc). Only `ModelDropdown` and
 * `useModelPicker` need the favorites half; the workspace dropdown just
 * omits `favoriteModelIds`/`setFavoriteModelIds`.
 */
export function useModelSelectionSync(
  searchableModels: SearchableModel[],
  {
    selectedModel,
    setSelectedModel,
    favoriteModelIds,
    setFavoriteModelIds,
  }: UseModelSelectionSyncOptions,
) {
  useEffect(() => {
    if (searchableModels.length === 0) return;

    const stillExists = selectedModel
      ? searchableModels.some(
          ({ model }) => model.id === selectedModel.model.id,
        )
      : false;

    if (selectedModel && stillExists) return;

    const first = searchableModels[0];
    setSelectedModel(first);
  }, [selectedModel, searchableModels, setSelectedModel]);

  useEffect(() => {
    if (!favoriteModelIds || !setFavoriteModelIds) return;
    if (searchableModels.length === 0 || favoriteModelIds.length === 0) return;

    const validIds = new Set(searchableModels.map(({ model }) => model.id));
    const stillValid = favoriteModelIds.filter((id) => validIds.has(id));

    if (stillValid.length !== favoriteModelIds.length) {
      setFavoriteModelIds(stillValid);
    }
  }, [searchableModels, favoriteModelIds, setFavoriteModelIds]);
}
