import { buildModelVirtualItems } from '@/app/features/chat-page/chat-input/models/build-model-virtual-items';
import {
  ModelEmptyState,
  ModelVirtualList,
} from '@/app/features/chat-page/chat-input/models/model-picker-parts';
import { useI18n } from '@/app/hooks/i18n';
import { ProviderGroup, SearchableModel } from '@/app/lib/model';

export interface ModelPickerListProps {
  favoriteModels: SearchableModel[];
  groupedProviders: ProviderGroup[];
  /** Composite `${providerId}-${modelId}` key. */
  selectedModelKey?: string;
  /** Composite `${providerId}-${modelId}` keys. */
  favoriteModelKeys: string[];
  collapsedGroups: Set<string>;
  onToggleGroup: (groupId: string) => void;
  onSelect: (model: SearchableModel) => void;
  onFavorite: (event: React.MouseEvent, modelKey: string) => void;
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
  selectedModelKey,
  favoriteModelKeys,
  collapsedGroups,
  onToggleGroup,
  onSelect,
  onFavorite,
}: ModelPickerListProps) {
  const { t } = useI18n();
  const items = buildModelVirtualItems(
    {
      favoriteModels,
      groupedProviders,
      collapsedGroups,
    },
    t.modelPicker.favorites,
  );

  if (items.length === 0) {
    return <ModelEmptyState />;
  }

  return (
    <ModelVirtualList
      items={items}
      selectedModelKey={selectedModelKey}
      favoriteModelKeys={favoriteModelKeys}
      collapsedGroups={collapsedGroups}
      onToggleGroup={onToggleGroup}
      onSelect={(entry) => onSelect(entry)}
      onToggleFavorite={onFavorite}
    />
  );
}
