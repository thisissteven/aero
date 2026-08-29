import {
  Check,
  ChevronDown,
  ChevronRight,
  Star,
  StarFill,
} from '@gravity-ui/icons';
import { Icon } from '@gravity-ui/uikit';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { Command } from '@aero/ui';

import { ProviderLogo } from '@/app/components/provider-logo';
import { useConfiguredProviders } from '@/app/hooks/api/providers';

import { useChatSettingsStore } from '../chat-settings-store';

export interface ModelCapabilities {
  temperature?: boolean;
  reasoning?: boolean;
  attachment?: boolean;
  toolcall?: boolean;
  input?: Record<string, boolean>;
  output?: Record<string, boolean>;
  interleaved?: boolean | { field: string };
}

export interface ModelCost {
  input: number;
  output: number;
  cache?: {
    read: number;
    write: number;
  };
}

export interface ModelLimit {
  context: number;
  output: number;
}

export interface ModelItem {
  id: string;
  providerID: string;
  name: string;
  family?: string;
  capabilities?: ModelCapabilities;
  cost?: ModelCost;
  limit?: ModelLimit;
  status?: string;
}

export interface SearchableModel {
  model: ModelItem;
  providerId: string;
  providerName: string;
}

export interface ProviderGroup {
  id: string;
  name: string;
  models: SearchableModel[];
}

export function formatContextLength(limit?: number): string {
  if (!limit) {
    return '';
  }

  if (limit >= 1_000_000) {
    const value = limit / 1_000_000;

    return `${Number.isInteger(value) ? value : value.toFixed(1)}M`;
  }

  if (limit >= 1_000) {
    const value = limit / 1_000;

    return `${Number.isInteger(value) ? value : value.toFixed(1)}K`;
  }

  return `${limit}`;
}

export function formatCapabilities(capabilities?: ModelCapabilities): string {
  if (!capabilities) {
    return 'Standard';
  }

  const list: string[] = [];

  if (capabilities.toolcall) {
    list.push('Tool calling');
  }

  if (capabilities.reasoning) {
    list.push('Reasoning');
  }

  if (capabilities.attachment) {
    list.push('Attachments');
  }

  return list.length > 0 ? list.join(', ') : 'Standard';
}

export function formatMediaTypes(types?: Record<string, boolean>): string {
  if (!types) {
    return 'text';
  }

  const active = Object.entries(types)
    .filter(([, enabled]) => enabled)
    .map(([key]) => key);

  return active.length > 0 ? active.join(', ') : 'text';
}

export function useModelPicker() {
  const selectedModel = useChatSettingsStore((state) => state.selectedModel);

  const setSelectedModel = useChatSettingsStore(
    (state) => state.setSelectedModel,
  );

  const favoriteModelIds = useChatSettingsStore(
    (state) => state.favoriteModelIds,
  );

  const toggleFavoriteModel = useChatSettingsStore(
    (state) => state.toggleFavoriteModel,
  );

  const setFavoriteModelIds = useChatSettingsStore(
    (state) => state.setFavoriteModelIds,
  );

  const { data: providersData } = useConfiguredProviders();

  const [searchQuery, setSearchQuery] = useState('');

  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(
    new Set(),
  );

  const searchableModels = useMemo<SearchableModel[]>(() => {
    if (!providersData) {
      return [];
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

    return [...byId.values()];
  }, [providersData]);

  const normalizedSearch = searchQuery.trim().toLowerCase();

  const filteredModels = useMemo(() => {
    if (!normalizedSearch) {
      return searchableModels;
    }

    return searchableModels.filter(
      ({ model, providerName }) =>
        model.name.toLowerCase().includes(normalizedSearch) ||
        model.id.toLowerCase().includes(normalizedSearch) ||
        providerName.toLowerCase().includes(normalizedSearch),
    );
  }, [searchableModels, normalizedSearch]);

  const favoriteModels = useMemo(() => {
    return filteredModels.filter(({ model }) =>
      favoriteModelIds.includes(model.id),
    );
  }, [filteredModels, favoriteModelIds]);

  const groupedProviders = useMemo<ProviderGroup[]>(() => {
    const groups = new Map<string, ProviderGroup>();

    for (const entry of filteredModels) {
      if (favoriteModelIds.includes(entry.model.id)) {
        continue;
      }

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

  useEffect(() => {
    if (searchableModels.length === 0) {
      return;
    }

    const stillExists = selectedModel
      ? searchableModels.some(({ model }) => model.id === selectedModel.id)
      : false;

    if (selectedModel && stillExists) {
      return;
    }

    const first = searchableModels[0];

    setSelectedModel({
      id: first.model.id,
      name: first.model.name,
      providerId: first.providerId,
    });
  }, [searchableModels, selectedModel, setSelectedModel]);

  useEffect(() => {
    if (searchableModels.length === 0 || favoriteModelIds.length === 0) {
      return;
    }

    const validIds = new Set(searchableModels.map(({ model }) => model.id));

    const stillValid = favoriteModelIds.filter((id) => validIds.has(id));

    if (stillValid.length !== favoriteModelIds.length) {
      setFavoriteModelIds(stillValid);
    }
  }, [searchableModels, favoriteModelIds, setFavoriteModelIds]);

  const toggleGroupCollapse = useCallback((groupId: string) => {
    setCollapsedGroups((previous) => {
      const next = new Set(previous);

      if (next.has(groupId)) {
        next.delete(groupId);
      } else {
        next.add(groupId);
      }

      return next;
    });
  }, []);

  const selectModel = useCallback(
    (model: ModelItem) => {
      setSelectedModel({
        id: model.id,
        name: model.name,
        providerId: model.providerID,
      });
    },
    [setSelectedModel],
  );

  const toggleFavorite = useCallback(
    (event: React.MouseEvent, modelId: string) => {
      event.stopPropagation();
      toggleFavoriteModel(modelId);
    },
    [toggleFavoriteModel],
  );

  return {
    selectedModel,

    favoriteModelIds,

    searchQuery,
    setSearchQuery,

    collapsedGroups,
    toggleGroupCollapse,

    favoriteModels,
    groupedProviders,
    totalResults,

    selectModel,
    toggleFavorite,
  };
}

interface ModelItemRowProps {
  entry: SearchableModel;
  isGroupCollapsed: boolean;
  isSelected: boolean;
  isFavorite: boolean;
  onSelect: (model: ModelItem) => void;
  onFavorite: (event: React.MouseEvent, modelId: string) => void;
}

function ModelItemRow({
  entry,
  isGroupCollapsed,
  isSelected,
  isFavorite,
  onSelect,
  onFavorite,
}: ModelItemRowProps) {
  const { model, providerName } = entry;

  const formattedLimit = formatContextLength(model.limit?.context);

  return (
    <Command.Item
      textValue={`${model.name} ${model.id} ${providerName}`}
      isDisabled={isGroupCollapsed}
      onAction={() => onSelect(model)}
      className={`flex items-center justify-between rounded-md px-2 py-1.5 ${
        isGroupCollapsed ? 'hidden' : 'cursor-pointer'
      }`}
    >
      <div data-model-inner className='flex min-w-0 flex-1 items-center gap-2'>
        <ProviderLogo
          providerId={model.providerID}
          alt={model.name}
          className='size-3.5 shrink-0'
        />

        <span className='truncate font-medium'>{model.name}</span>

        {formattedLimit && (
          <span className='text-muted shrink-0 text-xs font-normal'>
            {formattedLimit}
          </span>
        )}
      </div>

      <div className='flex shrink-0 items-center gap-1.5'>
        {isSelected && <Icon data={Check} className='size-3.5' />}

        <button
          type='button'
          tabIndex={-1}
          className='text-muted hover:text-accent transition-colors'
          onClick={(event) => onFavorite(event, model.id)}
        >
          <Icon
            data={isFavorite ? StarFill : Star}
            className={`size-3.5 ${
              isFavorite
                ? '[&_path]:fill-[var(--accent)] [&_path]:stroke-[var(--accent)]'
                : ''
            }`}
          />
        </button>
      </div>
    </Command.Item>
  );
}

interface ModelGroupsProps {
  favoriteModels: SearchableModel[];
  groupedProviders: ProviderGroup[];
  selectedModelId?: string;
  favoriteModelIds: string[];
  collapsedGroups: Set<string>;
  onToggleGroup: (groupId: string) => void;
  onSelect: (model: ModelItem) => void;
  onFavorite: (event: React.MouseEvent, modelId: string) => void;
}

export function ModelGroups({
  favoriteModels,
  groupedProviders,
  selectedModelId,
  favoriteModelIds,
  collapsedGroups,
  onToggleGroup,
  onSelect,
  onFavorite,
}: ModelGroupsProps) {
  return (
    <>
      {favoriteModels.length > 0 && (
        <Command.Group
          headingClassName='px-2.5'
          heading={
            <button
              type='button'
              onClick={() => onToggleGroup('favorites')}
              className='text-muted flex w-full items-center justify-between rounded text-sm font-semibold tracking-wider uppercase'
            >
              <span className='text-accent'>Favorites</span>

              <Icon
                data={
                  collapsedGroups.has('favorites') ? ChevronRight : ChevronDown
                }
                className='size-3'
              />
            </button>
          }
        >
          {favoriteModels.map((entry) => (
            <ModelItemRow
              key={`favorite-${entry.model.id}`}
              entry={entry}
              isGroupCollapsed={collapsedGroups.has('favorites')}
              isSelected={selectedModelId === entry.model.id}
              isFavorite={favoriteModelIds.includes(entry.model.id)}
              onSelect={onSelect}
              onFavorite={onFavorite}
            />
          ))}
        </Command.Group>
      )}

      {groupedProviders.map((provider) => {
        const isCollapsed = collapsedGroups.has(provider.id);

        return (
          <Command.Group
            key={provider.id}
            headingClassName='px-2.5'
            heading={
              <button
                type='button'
                onClick={() => onToggleGroup(provider.id)}
                className='text-muted hover:bg-surface flex w-full items-center justify-between rounded text-sm font-semibold tracking-wider uppercase'
              >
                <span>{provider.name}</span>

                <Icon
                  data={isCollapsed ? ChevronRight : ChevronDown}
                  className='size-3'
                />
              </button>
            }
          >
            {provider.models.map((entry) => (
              <ModelItemRow
                key={entry.model.id}
                entry={entry}
                isGroupCollapsed={isCollapsed}
                isSelected={selectedModelId === entry.model.id}
                isFavorite={favoriteModelIds.includes(entry.model.id)}
                onSelect={onSelect}
                onFavorite={onFavorite}
              />
            ))}
          </Command.Group>
        );
      })}
    </>
  );
}
