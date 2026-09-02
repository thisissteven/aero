import {
  Check,
  ChevronDown,
  ChevronRight,
  Magnifier,
  Plus,
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

import { cn, Command, Kbd, Popover } from '@aero/ui';

import { ProviderLogo } from '@/app/components/provider-logo';
import { IconButton } from '@/app/components/ui/icon-button';
import { useConfiguredProviders } from '@/app/hooks/api/providers';
import {
  formatCapabilities,
  formatContextLength,
  formatMediaTypes,
  ModelItem,
  ProviderGroup,
  SearchableModel,
} from '@/app/lib/model';

export interface WorkspaceModelDropdownProps {
  value?: string | null; // e.g., model ID stored in workspace config
  onChange?: (model: string) => void;
  disabled?: boolean;
  onAddProviderClick?: () => void;
}

export function WorkspaceModelDropdown({
  value,
  onChange,
  disabled = false,
  onAddProviderClick,
}: WorkspaceModelDropdownProps) {
  const { data: providersData } = useConfiguredProviders();

  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(
    new Set(),
  );
  const [activeModel, setActiveModel] = useState<ModelItem | null>(null);
  const [hoverTop, setHoverTop] = useState(0);
  const [infoSide, setInfoSide] = useState<'left' | 'right'>('left');

  const activeItemRef = useRef<HTMLElement | null>(null);
  const popoverMenuRef = useRef<HTMLDivElement | null>(null);
  const itemElementsRef = useRef<Map<string, HTMLElement>>(new Map());

  // Normalize model registry map
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

  // Derive current selection directly from props and provider data
  const selectedModelEntry = useMemo<SearchableModel | null>(() => {
    if (!value || searchableModels.length === 0) return null;
    return searchableModels.find(({ model }) => model.id === value) ?? null;
  }, [value, searchableModels]);

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

  const groupedProviders = useMemo<ProviderGroup[]>(() => {
    const groups = new Map<string, ProviderGroup>();

    for (const entry of filteredModels) {
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
  }, [filteredModels]);

  const totalResults = groupedProviders.reduce(
    (acc, curr) => acc + curr.models.length,
    0,
  );

  // Clear invalid hover target on query change
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
    if (!item || !parent) return;

    const parentRect = parent.getBoundingClientRect();
    const itemRect = item.getBoundingClientRect();

    const panelWidth = 256;
    const gap = 8;
    const spaceLeft = parentRect.left;

    const side = spaceLeft >= panelWidth + gap ? 'left' : 'right';
    setInfoSide(side);
    setHoverTop(itemRect.top + itemRect.height / 2 - parentRect.top);
  }, []);

  useLayoutEffect(() => {
    if (activeModel && activeItemRef.current) {
      updateActiveItemPosition();
    }
  }, [activeModel, updateActiveItemPosition]);

  useEffect(() => {
    if (!activeModel) return;
    const handleResize = () => updateActiveItemPosition();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [activeModel, updateActiveItemPosition]);

  const activateModel = useCallback((model: ModelItem) => {
    const element = itemElementsRef.current.get(model.id) ?? null;
    activeItemRef.current = element;
    setActiveModel(model);

    if (!element) return;
    const parent = popoverMenuRef.current;
    if (!parent) return;

    const parentRect = parent.getBoundingClientRect();
    const itemRect = element.getBoundingClientRect();

    const panelWidth = 256;
    const gap = 8;
    const spaceLeft = parentRect.left;

    setInfoSide(spaceLeft >= panelWidth + gap ? 'left' : 'right');
    setHoverTop(itemRect.top + itemRect.height / 2 - parentRect.top);
  }, []);

  const toggleGroupCollapse = (groupId: string) => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(groupId)) next.delete(groupId);
      else next.add(groupId);
      return next;
    });
  };

  const selectModel = (entry: SearchableModel) => {
    onChange?.(entry.model.id);
    setIsOpen(false);
  };

  const renderModelItem = (
    entry: SearchableModel,
    key: string,
    isGroupCollapsed: boolean,
  ) => {
    const { model, providerName } = entry;
    const isSelected = selectedModelEntry?.model.id === model.id;
    const formattedLimit = formatContextLength(model.limit?.context);

    return (
      <Command.Item
        key={key}
        isDisabled={isGroupCollapsed}
        textValue={`${model.name} ${model.id} ${providerName}`}
        ref={(element: HTMLElement | null) => {
          if (!element || isGroupCollapsed) {
            itemElementsRef.current.delete(model.id);
            return;
          }

          const innerElement =
            element.querySelector<HTMLElement>('[data-model-inner]');
          if (innerElement) {
            itemElementsRef.current.set(model.id, innerElement);
          }

          if (
            element.getAttribute('data-focused') === 'true' ||
            element.getAttribute('data-hovered') === 'true'
          ) {
            activateModel(model);
          }

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
        onAction={() => selectModel(entry)}
        className={`flex items-center justify-between rounded-md px-2 py-1.5 ${
          isGroupCollapsed ? 'hidden' : 'cursor-pointer'
        }`}
      >
        <div
          data-model-inner
          className='flex min-w-0 flex-1 items-center gap-2'
        >
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
        </div>
      </Command.Item>
    );
  };

  return (
    <Popover isOpen={isOpen} onOpenChange={setIsOpen}>
      <Popover.Trigger className='flex-1'>
        <button
          disabled={disabled}
          className='text-foreground bg-field hover:bg-field-hover shadow-field flex w-full items-center justify-between gap-1.5 rounded-xl p-2.25'
        >
          <div className='flex items-center gap-1.5'>
            {selectedModelEntry && (
              <ProviderLogo
                providerId={selectedModelEntry.providerId}
                alt={selectedModelEntry.model.name}
                className='size-3.5'
              />
            )}

            {selectedModelEntry?.model.name ?? (
              <span className='text-muted'>No default model selected</span>
            )}
          </div>

          <Icon
            data={ChevronDown}
            className={cn(
              'size-3.5 transition',
              isOpen ? 'rotate-180' : 'rotate-0',
            )}
          />
        </button>
      </Popover.Trigger>

      <Popover.Content
        className='relative overflow-visible p-0'
        placement='top right'
      >
        <div ref={popoverMenuRef} className='relative flex items-start'>
          <div className='bg-overlay text-overlay-foreground border-border flex w-80 flex-col overflow-hidden rounded-xl border'>
            {onAddProviderClick && (
              <div className='border-separator border-b p-1'>
                <IconButton
                  isIconOnly={false}
                  className='w-full justify-start gap-3 px-2'
                  onClick={onAddProviderClick}
                >
                  <Icon data={Plus} className='size-3.5' />
                  <span>Add new provider</span>
                </IconButton>
              </div>
            )}

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
              className={`bg-overlay text-overlay-foreground border-border absolute w-64 space-y-2 rounded-xl border p-3 text-xs transition-all duration-75 ${
                infoSide === 'right' ? 'left-full ml-2' : 'right-full mr-2'
              }`}
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
