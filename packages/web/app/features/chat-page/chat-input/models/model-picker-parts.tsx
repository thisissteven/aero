import {
  Command,
  cn,
  IconButton,
  Kbd,
  ListLayout,
  Virtualizer,
} from '@aero/ui';
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
import { ProviderLogo } from '@/app/components/provider-logo';
import { ModelVirtualItem } from '@/app/features/chat-page/chat-input/models/build-model-virtual-items';
import { useI18n } from '@/app/hooks/i18n';
import {
  formatCapabilities,
  formatContextLength,
  formatMediaTypes,
  getModelKey,
  ModelItem,
  SearchableModel,
} from '@/app/lib/model';

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
  const { t } = useI18n();

  return (
    <Command.InputGroup className='border-separator border-b'>
      <Command.InputGroup.Prefix className='pl-3'>
        <Icon data={Magnifier} className='size-3.5' />
      </Command.InputGroup.Prefix>

      <Command.InputGroup.Input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={t.modelPicker.searchModelsOrProviders}
        className='py-2.5 pr-0 text-sm'
      />

      <Command.InputGroup.ClearButton onPress={() => onChange('')} />
    </Command.InputGroup>
  );
}

export function ModelEmptyState() {
  const { t } = useI18n();

  return (
    <div className='text-muted flex h-24 items-center justify-center text-sm'>
      {t.modelPicker.noModelsFound}
    </div>
  );
}

export function AddProviderRow({ onClick }: { onClick?: () => void }) {
  const { t } = useI18n();

  return (
    <div className='border-separator border-b p-1'>
      <IconButton
        isIconOnly={false}
        className='w-full justify-start gap-3 px-2'
        onClick={onClick}
      >
        <Icon data={Plus} className='size-3.5' />
        <span>{t.modelPicker.addNewProvider}</span>
      </IconButton>
    </div>
  );
}

export function ModelPickerFooter() {
  const { t } = useI18n();

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
        <span>{t.modelPicker.navigate}</span>
      </div>

      <div className='flex items-center gap-2'>
        <span>{t.modelPicker.switchAgent}</span>
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
  onToggleFavorite?: (event: React.MouseEvent, modelKey: string) => void;
  /** Omit for pickers without a hover/focus details panel. */
  onActivate?: (entry: SearchableModel, element: HTMLElement) => void;
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
                onActivate(entry, innerElement);
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
                      onActivate(entry, innerElement);
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
            onClick={(event) => onToggleFavorite(event, getModelKey(entry))}
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
  const { t } = useI18n();

  return (
    <div
      style={{ top: `${top}px`, transform: 'translateY(-50%)' }}
      className={cn(
        'bg-overlay text-overlay-foreground border-separator absolute w-64 space-y-2 rounded-xl border p-3 text-xs transition-all duration-75',
        side === 'right' ? 'left-full ml-2' : 'right-full mr-2',
      )}
    >
      <div className='text-muted flex items-center justify-between gap-2'>
        <span>{t.modelPicker.capabilities}</span>
        <span className='text-foreground truncate text-right font-medium'>
          {formatCapabilities(model.capabilities)}
        </span>
      </div>

      <div className='text-muted flex items-center justify-between'>
        <span>{t.modelPicker.input}</span>
        <span className='text-foreground font-medium'>
          {formatMediaTypes(model.capabilities?.input)}
        </span>
      </div>

      <div className='text-muted flex items-center justify-between'>
        <span>{t.modelPicker.output}</span>
        <span className='text-foreground font-medium'>
          {formatMediaTypes(model.capabilities?.output)}
        </span>
      </div>

      <div className='text-muted border-separator flex items-center justify-between border-t pt-1'>
        <span>{t.modelPicker.costPerMillion}</span>
        <span className='text-foreground font-medium'>
          {t.modelPicker.costLine(
            model.cost?.input ?? 0,
            model.cost?.output ?? 0,
          )}
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
  selectedModelKey?: string | null;
  /** Omit for pickers without favorites. */
  favoriteModelKeys?: string[];
  collapsedGroups: Set<string>;
  onToggleGroup: (groupId: string) => void;
  onSelect: (entry: SearchableModel) => void;
  /** Omit for pickers without favorites. */
  onToggleFavorite?: (event: React.MouseEvent, modelKey: string) => void;
  /** Omit for pickers without a hover/focus details panel. */
  onActivate?: (entry: SearchableModel, element: HTMLElement) => void;
  className?: string;
}

export function ModelVirtualList({
  items,
  selectedModelKey,
  favoriteModelKeys,
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

          const entryKey = getModelKey(typedItem.entry);

          return (
            <ModelRow
              key={typedItem.id}
              itemKey={typedItem.id}
              entry={typedItem.entry}
              isSelected={selectedModelKey === entryKey}
              onSelect={onSelect}
              isFavorite={favoriteModelKeys?.includes(entryKey)}
              onToggleFavorite={onToggleFavorite}
              onActivate={onActivate}
            />
          );
        }}
      </Command.List>
    </Virtualizer>
  );
}
