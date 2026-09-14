import { buildModelVirtualItems } from '@/app/features/chat-page/chat-input/models/build-model-virtual-items';
import {
  ModelEmptyState,
  ModelVirtualList,
} from '@/app/features/chat-page/chat-input/models/model-picker-parts';
import { ProviderGroup, SearchableModel } from '@/app/lib/model';

export interface ModelPickerListProps {
  favoriteModels: SearchableModel[];
  groupedProviders: ProviderGroup[];
  selectedModelId?: string;
  favoriteModelIds: string[];
  collapsedGroups: Set<string>;
  onToggleGroup: (groupId: string) => void;
  onSelect: (model: SearchableModel) => void;
  onFavorite: (event: React.MouseEvent, modelId: string) => void;
}

/**
 * Self-contained, virtualized replacement for the old `ModelGroups`
 * fragment.
 *
 * IMPORTANT integration change: `ModelGroups` used to return bare
 * `<Command.Group>` children meant to be nested inside a `<Command.List>`
 * that the caller owned. Virtualization needs one component to own the
 * whole flat item list, so `ModelPickerList` renders its own
 * `Virtualizer`/`Command.List` internally — remove any `Command.List` /
 * `Command`/`Command.Dialog` wrapper the call site had around the old
 * `ModelGroups` output, and just render `<ModelPickerList />` where the
 * list used to go.
 */
export function ModelPickerList({
  favoriteModels,
  groupedProviders,
  selectedModelId,
  favoriteModelIds,
  collapsedGroups,
  onToggleGroup,
  onSelect,
  onFavorite,
}: ModelPickerListProps) {
  const items = buildModelVirtualItems({
    favoriteModels,
    groupedProviders,
    collapsedGroups,
  });

  if (items.length === 0) {
    return <ModelEmptyState />;
  }

  return (
    <ModelVirtualList
      items={items}
      selectedModelId={selectedModelId}
      favoriteModelIds={favoriteModelIds}
      collapsedGroups={collapsedGroups}
      onToggleGroup={onToggleGroup}
      onSelect={(entry) => onSelect(entry)}
      onToggleFavorite={onFavorite}
    />
  );
}
