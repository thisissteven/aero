import {
  Check,
  ChevronDown,
  ChevronRight,
  Magnifier,
  Plus,
  Star,
  StarFill,
} from '@gravity-ui/icons';
import { Icon } from '@gravity-ui/uikit';
import { useMemo } from 'react';

import { cn, Command, Kbd, ListLayout, Virtualizer } from '@aero/ui';

import { ProviderLogo } from '@/app/components/provider-logo';
import { IconButton } from '@/app/components/ui/icon-button';
import {
  formatCapabilities,
  formatContextLength,
  formatMediaTypes,
  ModelItem,
  ProviderGroup,
  SearchableModel,
} from '@/app/lib/model';

// ---------------------------------------------------------------------------
// Virtual item model. Grouping used to be nested <Command.Group> JSX; that
// can't be virtualized (react-aria/cmdk needs one flat `items` array up
// front), so every consumer now flattens favorites + provider groups into
// this before handing it to <ModelVirtualList>. Collapsed groups simply
// don't contribute rows to the array, rather than being rendered `hidden`.
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Chrome pieces
// ---------------------------------------------------------------------------

export function ModelSearchInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <Command.InputGroup className='border-separator border-b'>
      <Command.InputGroup.Prefix className='pl-3'>
        <Icon data={Magnifier} className='size-3.5' />
      </Command.InputGroup.Prefix>

      <Command.InputGroup.Input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder='Search models or providers'
        className='py-2.5 pr-0 text-sm'
      />

      <Command.InputGroup.ClearButton onPress={() => onChange('')} />
    </Command.InputGroup>
  );
}

export function ModelEmptyState() {
  return (
    <div className='text-muted flex h-24 items-center justify-center text-sm'>
      No models found.
    </div>
  );
}

export function AddProviderRow({ onClick }: { onClick?: () => void }) {
  return (
    <div className='border-separator border-b p-1'>
      <IconButton
        isIconOnly={false}
        className='w-full justify-start gap-3 px-2'
        onClick={onClick}
      >
        <Icon data={Plus} className='size-3.5' />
        <span>Add new provider</span>
      </IconButton>
    </div>
  );
}

export function ModelPickerFooter() {
  return (
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
  );
}

function GroupHeaderItem({
  id,
  label,
  isFavorites,
  isFirst,
  isCollapsed,
  onToggle,
}: {
  id: string;
  label: string;
  isFavorites?: boolean;
  isFirst: boolean;
  isCollapsed: boolean;
  onToggle: () => void;
}) {
  return (
    <Command.Item
      key={id}
      id={id}
      textValue={label}
      isDisabled
      className={cn(
        'hover:bg-surface pointer-events-none mx-1 flex items-center px-2.5 select-none aria-selected:bg-transparent',
        'h-[32px]',
      )}
    >
      <button
        type='button'
        onClick={onToggle}
        className='text-muted pointer-events-auto flex w-full items-center justify-between rounded text-sm font-semibold tracking-wider uppercase'
      >
        <span className={isFavorites ? 'text-accent' : undefined}>{label}</span>
        <Icon
          data={isCollapsed ? ChevronRight : ChevronDown}
          className='size-3'
        />
      </button>
    </Command.Item>
  );
}

export interface ModelRowProps {
  entry: SearchableModel;
  itemKey: string;
  isSelected: boolean;
  onSelect: (entry: SearchableModel) => void;
  /** Omit both favorite props entirely for pickers without favorites (e.g. the workspace dropdown). */
  isFavorite?: boolean;
  onToggleFavorite?: (event: React.MouseEvent, modelId: string) => void;
  /** Omit for pickers without a hover/focus details panel. */
  onActivate?: (model: ModelItem, element: HTMLElement) => void;
}

export function ModelRow({
  entry,
  itemKey,
  isSelected,
  onSelect,
  isFavorite,
  onToggleFavorite,
  onActivate,
}: ModelRowProps) {
  const { model, providerName } = entry;
  const formattedLimit = formatContextLength(model.limit?.context);

  return (
    <Command.Item
      key={itemKey}
      textValue={`${model.name} ${model.id} ${providerName}`}
      ref={
        onActivate
          ? (element: HTMLElement | null) => {
              if (!element) return;

              const innerElement =
                element.querySelector<HTMLElement>('[data-model-inner]');
              if (!innerElement) return;

              if (
                element.getAttribute('data-focused') === 'true' ||
                element.getAttribute('data-hovered') === 'true'
              ) {
                onActivate(model, innerElement);
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
                      onActivate(model, innerElement);
                    }
                  }
                }
              });

              observer.observe(element, {
                attributes: true,
                attributeFilter: ['data-focused', 'data-hovered'],
              });
            }
          : undefined
      }
      onAction={() => onSelect(entry)}
      className='mx-1 flex cursor-pointer items-center justify-between rounded-md px-2 py-1.5'
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

        {onToggleFavorite && (
          <button
            type='button'
            tabIndex={-1}
            className='text-muted hover:text-accent transition-colors'
            onClick={(event) => onToggleFavorite(event, model.id)}
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
        )}
      </div>
    </Command.Item>
  );
}

export function ModelInfoPanelCard({
  model,
  top,
  side,
}: {
  model: ModelItem;
  top: number;
  side: 'left' | 'right';
}) {
  return (
    <div
      style={{ top: `${top}px`, transform: 'translateY(-50%)' }}
      className={cn(
        'bg-overlay/60 text-overlay-foreground border-separator absolute w-64 space-y-2 rounded-xl border p-3 text-xs backdrop-blur-sm transition-all duration-75',
        side === 'right' ? 'left-full ml-2' : 'right-full mr-2',
      )}
    >
      <div className='text-muted flex items-center justify-between gap-2'>
        <span>Capabilities</span>
        <span className='text-foreground truncate text-right font-medium'>
          {formatCapabilities(model.capabilities)}
        </span>
      </div>

      <div className='text-muted flex items-center justify-between'>
        <span>Input</span>
        <span className='text-foreground font-medium'>
          {formatMediaTypes(model.capabilities?.input)}
        </span>
      </div>

      <div className='text-muted flex items-center justify-between'>
        <span>Output</span>
        <span className='text-foreground font-medium'>
          {formatMediaTypes(model.capabilities?.output)}
        </span>
      </div>

      <div className='text-muted border-separator flex items-center justify-between border-t pt-1'>
        <span>Cost ($/1M tokens)</span>
        <span className='text-foreground font-medium'>
          {`In $${model.cost?.input ?? 0} · Out $${model.cost?.output ?? 0}`}
        </span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// The virtualized list. Every consumer feeds it the same flat item array so
// none of them re-implement Virtualizer/ListLayout/Command.List wiring —
// mirrors the pattern in CommandPaletteList.
// ---------------------------------------------------------------------------

export interface ModelVirtualListProps {
  items: ModelVirtualItem[];
  selectedModelId?: string | null;
  /** Omit for pickers without favorites. */
  favoriteModelIds?: string[];
  collapsedGroups: Set<string>;
  onToggleGroup: (groupId: string) => void;
  onSelect: (entry: SearchableModel) => void;
  /** Omit for pickers without favorites. */
  onToggleFavorite?: (event: React.MouseEvent, modelId: string) => void;
  /** Omit for pickers without a hover/focus details panel. */
  onActivate?: (model: ModelItem, element: HTMLElement) => void;
  className?: string;
}

export function ModelVirtualList({
  items,
  selectedModelId,
  favoriteModelIds,
  collapsedGroups,
  onToggleGroup,
  onSelect,
  onToggleFavorite,
  onActivate,
  className,
}: ModelVirtualListProps) {
  const layout = useMemo(
    () => new ListLayout({ headingSize: 28, estimatedRowSize: 32 }),
    [],
  );

  return (
    <Virtualizer layout={layout}>
      <Command.List
        items={items}
        className={cn(
          'max-h-72 scroll-py-1 overflow-x-hidden overflow-y-auto px-0 text-xs',
          className,
        )}
      >
        {(item) => {
          const typedItem = item as ModelVirtualItem;

          if (typedItem.kind === 'group-header') {
            return (
              <GroupHeaderItem
                key={typedItem.id}
                id={typedItem.id}
                label={typedItem.label}
                isFavorites={typedItem.isFavorites}
                isFirst={typedItem.isFirst}
                isCollapsed={collapsedGroups.has(typedItem.groupId)}
                onToggle={() => onToggleGroup(typedItem.groupId)}
              />
            );
          }

          return (
            <ModelRow
              key={typedItem.id}
              itemKey={typedItem.id}
              entry={typedItem.entry}
              isSelected={selectedModelId === typedItem.entry.model.id}
              onSelect={onSelect}
              isFavorite={favoriteModelIds?.includes(typedItem.entry.model.id)}
              onToggleFavorite={onToggleFavorite}
              onActivate={onActivate}
            />
          );
        }}
      </Command.List>
    </Virtualizer>
  );
}
