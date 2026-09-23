import { Sparkles } from '@gravity-ui/icons';
import { Icon } from '@gravity-ui/uikit';
import { useMemo, useState } from 'react';
import {
  buildVirtualDropdownEntries,
  VirtualizedDropdown,
} from '@/app/components/virtualized-dropdown';
import { capitalizeFirstLetter } from '@/server/shared';
import { useChatSettingsStore } from './chat-settings-store';

export function VariantsDropdown() {
  const selectedModel = useChatSettingsStore((s) => s.selectedModel);
  const selectedVariant = useChatSettingsStore((s) => s.selectedVariant);
  const setSelectedVariant = useChatSettingsStore((s) => s.setSelectedVariant);

  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const variants = useMemo(
    () => Object.keys(selectedModel?.model.variants ?? {}),
    [selectedModel],
  );

  const filteredVariants = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return variants.filter((key) => key.toLowerCase().includes(query));
  }, [variants, searchQuery]);

  const entries = useMemo(
    () =>
      buildVirtualDropdownEntries({
        groups: [
          {
            id: 'variants',
            label: 'Thinking Variants',
            items: filteredVariants,
          },
        ],
        getKey: (variant) => variant,
      }),
    [filteredVariants],
  );

  if (variants.length === 0) return null;

  return (
    <VirtualizedDropdown
      isOpen={isOpen}
      onOpenChange={setIsOpen}
      entries={entries}
      selectedKey={selectedVariant ?? null}
      getKey={(variant) => variant}
      onSelect={(variant) => {
        setSelectedVariant(variant);
        setIsOpen(false);
      }}
      trigger={
        <>
          <Icon data={Sparkles} className='size-3.5' />
          {selectedVariant ? capitalizeFirstLetter(selectedVariant) : 'Default'}
        </>
      }
      searchValue={searchQuery}
      onSearchValueChange={setSearchQuery}
      searchPlaceholder='Search variants...'
      emptyState='No variants found.'
      renderRow={(variant) => (
        <div className='flex min-w-0 flex-1 flex-col'>
          <span className='truncate'>{capitalizeFirstLetter(variant)}</span>
        </div>
      )}
    />
  );
}
