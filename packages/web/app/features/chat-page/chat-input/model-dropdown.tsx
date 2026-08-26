import {
  Check,
  ChevronDown,
  ChevronRight,
  Cpu,
  Magnifier,
  Plus,
  Star,
  StarFill,
} from '@gravity-ui/icons';
import { Icon } from '@gravity-ui/uikit';
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { Button, Command, Kbd, Popover } from '@aero/ui';

import { IconButton } from '@/app/components/ui/icon-button';
import { useConfiguredProviders } from '@/app/hooks/api/providers';

import { useChatSettingsStore } from './chat-settings-store';

interface ModelCapabilities {
  temperature?: boolean;
  reasoning?: boolean;
  attachment?: boolean;
  toolcall?: boolean;
  input?: Record<string, boolean>;
  output?: Record<string, boolean>;
  interleaved?: boolean | { field: string };
}

interface ModelCost {
  input: number;
  output: number;
  cache?: {
    read: number;
    write: number;
  };
}

interface ModelLimit {
  context: number;
  output: number;
}

interface ModelItem {
  id: string;
  providerID: string;
  name: string;
  family?: string;
  capabilities?: ModelCapabilities;
  cost?: ModelCost;
  limit?: ModelLimit;
  status?: string;
}

interface SearchableModel {
  model: ModelItem;
  providerId: string;
  providerName: string;
}

interface ProviderGroup {
  id: string;
  name: string;
  models: SearchableModel[];
}

function formatContextLength(limit?: number): string {
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

function formatCapabilities(capabilities?: ModelCapabilities): string {
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

function formatMediaTypes(types?: Record<string, boolean>): string {
  if (!types) {
    return 'text';
  }

  const active = Object.entries(types)
    .filter(([, enabled]) => enabled)
    .map(([key]) => key);

  return active.length > 0 ? active.join(', ') : 'text';
}

export function ModelDropdown() {
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

  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(
    new Set(),
  );

  const [activeModel, setActiveModel] = useState<ModelItem | null>(null);

  const [hoverTop, setHoverTop] = useState(0);

  const activeItemRef = useRef<HTMLElement | null>(null);

  const popoverMenuRef = useRef<HTMLDivElement | null>(null);

  /*
   * FIX (bug 2): single source of truth for "which DOM node
   * represents model X". Both mouse hover and keyboard focus
   * read/write through this map, so there's no chicken-and-egg
   * problem between activeModel state and the ref that's
   * supposed to supply its element.
   */
  const itemElementsRef = useRef<Map<string, HTMLElement>>(new Map());

  /*
   * FIX (bug 3): de-dupe by model.id while building the flat
   * list. If the same id shows up twice — either inside one
   * provider's model map or across two providers — only the
   * first occurrence survives. Everything downstream (favorites,
   * grouping, selection) keys off model.id, so guaranteeing
   * uniqueness here prevents duplicate rendering everywhere else.
   */
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

  /*
   * Default model, extended to also cover the "mismatch" case:
   * a persisted selectedModel whose id no longer exists in the
   * freshly-fetched provider list falls back to the first
   * available model instead of silently referencing nothing.
   * Guarded on searchableModels being non-empty so we don't wipe
   * a valid persisted selection while providers are still loading.
   */
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
  }, [selectedModel, searchableModels, setSelectedModel]);

  /*
   * Mismatch handling for favorites: prune any persisted favorite
   * id that doesn't correspond to a currently-fetched model, once
   * we actually have data to check against.
   */
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

  useEffect(() => {
    if (
      activeModel &&
      !filteredModels.some(({ model }) => model.id === activeModel.id)
    ) {
      setActiveModel(null);
      activeItemRef.current = null;
    }
  }, [activeModel, filteredModels]);

  const updateActiveItemPosition = useCallback(() => {
    const item = activeItemRef.current;
    const parent = popoverMenuRef.current;

    if (!item || !parent) {
      return;
    }

    const parentRect = parent.getBoundingClientRect();
    const itemRect = item.getBoundingClientRect();

    const centerY = itemRect.top + itemRect.height / 2 - parentRect.top;

    setHoverTop(centerY);
  }, []);

  useLayoutEffect(() => {
    if (!activeModel || !activeItemRef.current) {
      return;
    }

    updateActiveItemPosition();
  }, [activeModel, updateActiveItemPosition]);

  useEffect(() => {
    if (!activeModel) {
      return;
    }

    const handleResize = () => {
      updateActiveItemPosition();
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [activeModel, updateActiveItemPosition]);

  /*
   * FIX (bug 2): looks the element up from itemElementsRef itself
   * rather than requiring the caller to supply it. Both
   * onMouseEnter and onFocusChange can now call this the same
   * way, so keyboard focus gets exactly the same treatment mouse
   * hover always got.
   */
  const activateModel = useCallback((model: ModelItem) => {
    const element = itemElementsRef.current.get(model.id) ?? null;

    activeItemRef.current = element;
    setActiveModel(model);

    if (element) {
      const parent = popoverMenuRef.current;

      if (parent) {
        const parentRect = parent.getBoundingClientRect();
        const itemRect = element.getBoundingClientRect();

        setHoverTop(itemRect.top + itemRect.height / 2 - parentRect.top);
      }
    }
  }, []);

  const toggleFavorite = (event: React.MouseEvent, modelId: string) => {
    event.stopPropagation();
    toggleFavoriteModel(modelId);
  };

  const toggleGroupCollapse = (groupId: string) => {
    setCollapsedGroups((previous) => {
      const next = new Set(previous);

      if (next.has(groupId)) {
        next.delete(groupId);
      } else {
        next.add(groupId);
      }

      return next;
    });
  };

  const selectModel = (model: ModelItem) => {
    setSelectedModel({
      id: model.id,
      name: model.name,
      providerId: model.providerID,
    });

    setIsOpen(false);
  };

  /*
   * FIX (bug 1): isGroupCollapsed no longer controls whether the
   * item mounts. It stays mounted (so the collection's internal
   * bookkeeping never sees the group go to zero items) and is
   * instead visually hidden + marked isDisabled. React Aria menus
   * automatically skip disabled items during arrow-key nav, so
   * this also stops keyboard focus from landing on a hidden row.
   */
  const renderModelItem = (
    entry: SearchableModel,
    key: string,
    isGroupCollapsed: boolean,
  ) => {
    const { model, providerName } = entry;
    const isSelected = selectedModel?.id === model.id;
    const isFavorite = favoriteModelIds.includes(model.id);
    const formattedLimit = formatContextLength(model.limit?.context);

    return (
      <Command.Item
        key={key}
        isDisabled={isGroupCollapsed}
        textValue={`${model.name} ${model.id} ${providerName}`}
        ref={(element: HTMLElement | null) => {
          if (!element || isGroupCollapsed) {
            // Cleanup map entry when element unmounts or collapses
            itemElementsRef.current.delete(model.id);
            return;
          }

          // Store the inner element ref for position calculations
          const innerElement =
            element.querySelector<HTMLElement>('[data-model-inner]');
          if (innerElement) {
            itemElementsRef.current.set(model.id, innerElement);
          }

          // Check if it's already focused on mount/render
          if (
            element.getAttribute('data-focused') === 'true' ||
            element.getAttribute('data-hovered') === 'true'
          ) {
            activateModel(model);
          }

          // Create an observer to watch for data-focused attribute changes from keyboard nav
          const observer = new MutationObserver((mutations) => {
            for (const mutation of mutations) {
              if (
                mutation.type === 'attributes' &&
                (mutation.attributeName === 'data-focused' ||
                  mutation.attributeName === 'data-hovered')
              ) {
                const target = mutation.target as HTMLElement;
                const isFocused =
                  target.getAttribute('data-focused') === 'true';
                const isHovered =
                  target.getAttribute('data-hovered') === 'true';

                if (isFocused || isHovered) {
                  activateModel(model);
                }
              }
            }
          });

          observer.observe(element, {
            attributes: true,
            attributeFilter: ['data-focused', 'data-hovered'],
          });
        }}
        onAction={() => selectModel(model)}
        className={`flex items-center justify-between rounded-md px-2 py-1.5 ${
          isGroupCollapsed ? 'hidden' : 'cursor-pointer'
        }`}
      >
        <div
          data-model-inner
          className='flex min-w-0 flex-1 items-center gap-2'
        >
          <Icon data={Cpu} className='size-3.5 shrink-0 opacity-70' />

          <span className='truncate font-medium'>{model.name}</span>

          {formattedLimit && (
            <span className='text-muted ml-auto shrink-0 text-xs font-normal'>
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
            onClick={(event) => toggleFavorite(event, model.id)}
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
  };

  return (
    <Popover isOpen={isOpen} onOpenChange={setIsOpen}>
      <Button variant='tertiary' size='sm' className='gap-1.5 text-xs'>
        <Icon data={Cpu} className='size-3.5' />

        {selectedModel?.name ?? 'Select Model'}

        <Icon data={ChevronDown} className='size-3' />
      </Button>

      <Popover.Content
        className='relative overflow-visible p-0'
        placement='top right'
      >
        <div ref={popoverMenuRef} className='relative flex items-start'>
          <div className='bg-overlay text-overlay-foreground border-border flex w-80 flex-col overflow-hidden rounded-xl border'>
            <div className='border-separator border-b p-1'>
              <IconButton
                isIconOnly={false}
                className='w-full justify-start gap-3 px-2'
              >
                <Icon data={Plus} className='size-3.5' />

                <span>Add new provider</span>
              </IconButton>
            </div>

            <Command>
              <Command.Dialog
                filter={() => true}
                className='rounded-none border-none bg-transparent shadow-none'
              >
                <Command.InputGroup className='border-separator border-b'>
                  <Command.InputGroup.Prefix className='pl-3'>
                    <Icon data={Magnifier} className='size-3.5' />
                  </Command.InputGroup.Prefix>

                  <Command.InputGroup.Input
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    placeholder='Search models or providers'
                    className='py-2.5 pr-3 text-sm'
                  />
                </Command.InputGroup>

                {totalResults === 0 ? (
                  <div className='text-muted flex h-24 items-center justify-center text-sm'>
                    No models found.
                  </div>
                ) : (
                  <Command.List className='max-h-72 scroll-py-1 overflow-y-auto p-1 text-xs'>
                    {favoriteModels.length > 0 && (
                      <Command.Group
                        headingClassName='px-2.5'
                        heading={
                          <button
                            type='button'
                            onClick={() => toggleGroupCollapse('favorites')}
                            className='text-muted flex w-full items-center justify-between rounded text-sm font-semibold tracking-wider uppercase'
                          >
                            <span className='text-accent'>Favorites</span>

                            <Icon
                              data={
                                collapsedGroups.has('favorites')
                                  ? ChevronRight
                                  : ChevronDown
                              }
                              className='size-3'
                            />
                          </button>
                        }
                      >
                        {favoriteModels.map((entry) =>
                          renderModelItem(
                            entry,
                            `favorite-${entry.model.id}`,
                            collapsedGroups.has('favorites'),
                          ),
                        )}
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
                              onClick={() => toggleGroupCollapse(provider.id)}
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
                          {provider.models.map((entry) =>
                            renderModelItem(entry, entry.model.id, isCollapsed),
                          )}
                        </Command.Group>
                      );
                    })}
                  </Command.List>
                )}
              </Command.Dialog>
            </Command>

            <div className='text-muted border-separator flex items-center justify-between border-t px-3 py-1.5'>
              <div className='flex items-center gap-2'>
                <div className='flex items-center gap-0.5'>
                  <Kbd className='text-xs'>
                    <Kbd.Abbr keyValue='up' />
                  </Kbd>

                  <Kbd className='text-xs'>
                    <Kbd.Abbr keyValue='down' />
                  </Kbd>
                </div>

                <span>Navigate</span>
              </div>

              <div className='flex items-center gap-2'>
                <span>Switch agent</span>
                <Kbd className='text-xs'>Tab</Kbd>
              </div>
            </div>
          </div>

          {activeModel && (
            <div
              style={{
                top: `${hoverTop}px`,
                transform: 'translateY(-50%)',
              }}
              className='bg-overlay text-overlay-foreground border-border absolute right-full mr-2 w-64 space-y-2 rounded-xl border p-3 text-xs transition-all duration-75'
            >
              <div className='text-muted flex items-center justify-between gap-2'>
                <span>Capabilities</span>

                <span className='text-foreground truncate text-right font-medium'>
                  {formatCapabilities(activeModel.capabilities)}
                </span>
              </div>

              <div className='text-muted flex items-center justify-between'>
                <span>Input</span>

                <span className='text-foreground font-medium'>
                  {formatMediaTypes(activeModel.capabilities?.input)}
                </span>
              </div>

              <div className='text-muted flex items-center justify-between'>
                <span>Output</span>

                <span className='text-foreground font-medium'>
                  {formatMediaTypes(activeModel.capabilities?.output)}
                </span>
              </div>

              <div className='text-muted border-separator flex items-center justify-between border-t pt-1'>
                <span>Cost ($/1M tokens)</span>

                <span className='text-foreground font-medium'>
                  {`In $${activeModel.cost?.input ?? 0} · Out $${
                    activeModel.cost?.output ?? 0
                  }`}
                </span>
              </div>
            </div>
          )}
        </div>
      </Popover.Content>
    </Popover>
  );
}
