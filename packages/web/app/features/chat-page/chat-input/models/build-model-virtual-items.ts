// ---------------------------------------------------------------------------
// Virtual item model. Grouping used to be nested <Command.Group> JSX; that
// can't be virtualized (react-aria/cmdk needs one flat `items` array up
// front), so every consumer now flattens favorites + provider groups into
// this before handing it to <ModelVirtualList>. Collapsed groups simply
// don't contribute rows to the array, rather than being rendered `hidden`.
// ---------------------------------------------------------------------------

import { ProviderGroup, SearchableModel } from '@/app/lib/model';

export type ModelVirtualItem =
  | {
      kind: 'group-header';
      id: string;
      groupId: string;
      label: string;
      isFavorites?: boolean;
      isFirst: boolean;
    }
  | {
      kind: 'model-row';
      id: string;
      entry: SearchableModel;
      groupId: string;
    };

export function buildModelVirtualItems({
  favoriteModels,
  groupedProviders,
  collapsedGroups,
}: {
  favoriteModels: SearchableModel[];
  groupedProviders: ProviderGroup[];
  collapsedGroups: Set<string>;
}): ModelVirtualItem[] {
  const items: ModelVirtualItem[] = [];

  if (favoriteModels.length > 0) {
    items.push({
      kind: 'group-header',
      id: 'header-favorites',
      groupId: 'favorites',
      label: 'Favorites',
      isFavorites: true,
      isFirst: items.length === 0,
    });

    if (!collapsedGroups.has('favorites')) {
      for (const entry of favoriteModels) {
        items.push({
          kind: 'model-row',
          id: `favorite-${entry.model.id}`,
          entry,
          groupId: 'favorites',
        });
      }
    }
  }

  for (const provider of groupedProviders) {
    items.push({
      kind: 'group-header',
      id: `header-${provider.id}`,
      groupId: provider.id,
      label: provider.name,
      isFirst: items.length === 0,
    });

    if (!collapsedGroups.has(provider.id)) {
      for (const entry of provider.models) {
        items.push({
          kind: 'model-row',
          id: entry.model.id,
          entry,
          groupId: provider.id,
        });
      }
    }
  }

  return items;
}
