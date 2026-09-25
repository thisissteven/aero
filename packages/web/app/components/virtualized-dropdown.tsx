// virtualized-dropdown.tsx
import {
  Button,
  Command,
  cn,
  ListLayout,
  Popover,
  Virtualizer,
} from '@aero/ui';
import { Check, Magnifier } from '@gravity-ui/icons';
import { Icon } from '@gravity-ui/uikit';
import { ReactNode, useMemo } from 'react';

import { useI18n } from '@/app/hooks/i18n';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type VirtualDropdownEntry<T> =
  | {
      kind: 'group-header';
      id: string;
      label: string;
    }
  | {
      kind: 'item';
      id: string;
      data: T;
    };

export interface VirtualizedDropdownProps<T> {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;

  /** Pre-filtered, flattened list. */
  entries: VirtualDropdownEntry<T>[];

  /** Key of the currently selected item (compared against `getKey`). */
  selectedKey?: string | null;

  /** Stable identity for an item. Also used as fallback text value. */
  getKey: (data: T) => string;

  /** Optional text value used for a11y/filtering. Defaults to `getKey`. */
  getTextValue?: (data: T) => string;

  onSelect: (data: T) => void;

  /** Contents of the trigger button (icon + label). */
  trigger: ReactNode;
  triggerClassName?: string;

  /** Search. Omit `onSearchValueChange` to hide the search input entirely. */
  searchValue?: string;
  onSearchValueChange?: (value: string) => void;
  searchPlaceholder?: string;

  /** Rendered when `entries.length === 0`. */
  emptyState?: ReactNode;

  /** Row body. The selected checkmark is appended automatically. */
  renderRow?: (data: T, opts: { isSelected: boolean }) => ReactNode;

  /** Popover content class. Defaults to `w-48`. */
  contentClassName?: string;
  /** Scrollable list class. Defaults to `max-h-60`. */
  listClassName?: string;

  estimatedRowSize?: number;
  headingSize?: number;

  placement?: 'top right' | 'top left';
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function VirtualizedDropdown<T>({
  isOpen,
  onOpenChange,
  entries,
  selectedKey,
  getKey,
  getTextValue,
  onSelect,
  trigger,
  triggerClassName,
  searchValue,
  onSearchValueChange,
  searchPlaceholder,
  emptyState,
  renderRow,
  contentClassName,
  listClassName,
  estimatedRowSize = 32,
  headingSize = 28,
  placement = 'top right',
}: VirtualizedDropdownProps<T>) {
  const { t } = useI18n();

  const layout = useMemo(
    () => new ListLayout({ headingSize, estimatedRowSize }),
    [headingSize, estimatedRowSize],
  );

  const showSearch = onSearchValueChange !== undefined;

  return (
    <Popover isOpen={isOpen} onOpenChange={onOpenChange}>
      <Button
        variant='ghost'
        size='sm'
        className={cn(
          'gap-1.5 rounded-lg px-2 text-xs',
          'group-data-[disabled=true]/prompt-input:pointer-events-none group-data-[disabled=true]/prompt-input:opacity-60',
          triggerClassName,
        )}
      >
        {trigger}
      </Button>

      <Popover.Content
        className={cn('rounded-xl p-0', contentClassName ?? 'w-48')}
        placement={placement}
      >
        <Command>
          <Command.Dialog
            filter={() => true}
            className='border-none bg-transparent shadow-none'
            allowEscape
          >
            {showSearch && (
              <Command.InputGroup>
                <Command.InputGroup.Prefix>
                  <Icon data={Magnifier} />
                </Command.InputGroup.Prefix>

                <Command.InputGroup.Input
                  value={searchValue ?? ''}
                  onChange={(event) => onSearchValueChange(event.target.value)}
                  className='py-2.5 pr-0 text-sm'
                  placeholder={searchPlaceholder ?? t.common.searchEllipsis}
                />

                <Command.InputGroup.ClearButton
                  onPress={() => onSearchValueChange('')}
                />
              </Command.InputGroup>
            )}

            {entries.length === 0 ? (
              <div className='text-muted flex h-24 items-center justify-center text-sm'>
                {emptyState ?? t.common.noResultsPeriod}
              </div>
            ) : (
              <Virtualizer layout={layout}>
                <Command.List
                  items={entries}
                  className={cn(
                    'max-h-60 scroll-py-1 px-0 overflow-x-hidden overflow-y-auto',
                    listClassName,
                  )}
                >
                  {(item) => {
                    const entry = item as VirtualDropdownEntry<T>;

                    if (entry.kind === 'group-header') {
                      return (
                        <GroupHeader
                          key={entry.id}
                          id={entry.id}
                          label={entry.label}
                        />
                      );
                    }

                    const itemKey = getKey(entry.data);
                    const isSelected = itemKey === selectedKey;
                    const textValue = getTextValue?.(entry.data) ?? itemKey;

                    return (
                      <Command.Item
                        key={entry.id}
                        textValue={textValue}
                        onAction={() => onSelect(entry.data)}
                        className='mx-1 flex cursor-pointer items-center justify-between rounded-md px-2 py-1.5'
                      >
                        <div className='flex min-w-0 flex-1 items-center gap-2'>
                          {renderRow ? (
                            renderRow(entry.data, { isSelected })
                          ) : (
                            <span className='truncate'>{textValue}</span>
                          )}
                        </div>

                        {isSelected && (
                          <Icon data={Check} className='size-4 shrink-0' />
                        )}
                      </Command.Item>
                    );
                  }}
                </Command.List>
              </Virtualizer>
            )}
          </Command.Dialog>
        </Command>
      </Popover.Content>
    </Popover>
  );
}

// ---------------------------------------------------------------------------
// Group header — plain static label (matches cmdk's `<Command.Group heading>`
// rendering used by the non-virtualized VariantsDropdown). `isDisabled` +
// `pointer-events-none` keep it out of roving focus / click selection.
// ---------------------------------------------------------------------------

function GroupHeader({ id, label }: { id: string; label: string }) {
  return (
    <Command.Item
      id={id}
      textValue={label}
      isDisabled
      className='text-muted pointer-events-none mx-1 flex h-[28px] items-center px-2.5 text-xs select-none aria-selected:bg-transparent'
    >
      {label}
    </Command.Item>
  );
}

// ---------------------------------------------------------------------------
// Helper — flatten ordered groups into entries.
//
// `showHeader` is per-group and defaults to true. A group with
// `showHeader: false` emits only its item rows.
// ---------------------------------------------------------------------------

export function buildVirtualDropdownEntries<T>({
  groups,
  getKey,
}: {
  groups: Array<{
    id: string;
    label: string;
    /** Set to false to render this group's items without a header row. */
    showHeader?: boolean;
    items: T[];
  }>;
  getKey: (data: T) => string;
}): VirtualDropdownEntry<T>[] {
  const entries: VirtualDropdownEntry<T>[] = [];

  for (const group of groups) {
    if (group.items.length === 0) continue;

    if (group.showHeader !== false) {
      entries.push({
        kind: 'group-header',
        id: `header-${group.id}`,
        label: group.label,
      });
    }

    for (const item of group.items) {
      entries.push({
        kind: 'item',
        id: `${group.id}-${getKey(item)}`,
        data: item,
      });
    }
  }

  return entries;
}
