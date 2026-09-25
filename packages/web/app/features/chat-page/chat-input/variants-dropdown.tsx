import { Sparkles } from '@gravity-ui/icons';
import { Icon } from '@gravity-ui/uikit';
import { useMemo, useState } from 'react';
import {
  buildVirtualDropdownEntries,
  VirtualizedDropdown,
} from '@/app/components/virtualized-dropdown';
import { useI18n } from '@/app/hooks/i18n';
import { capitalizeFirstLetter } from '@/server/shared';
import { useChatSettingsStore } from './chat-settings-store';

export function VariantsDropdown() {
  const { t } = useI18n();
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
            label: t.chatInput.thinkingVariants,
            items: filteredVariants,
          },
        ],
        getKey: (variant) => variant,
      }),
    [filteredVariants, t],
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
          {selectedVariant
            ? capitalizeFirstLetter(selectedVariant)
            : t.chatInput.defaultVariant}
        </>
      }
      searchValue={searchQuery}
      onSearchValueChange={setSearchQuery}
      searchPlaceholder={t.chatInput.searchVariants}
      emptyState={t.chatInput.noVariantsFound}
      renderRow={(variant) => (
        <div className='flex min-w-0 flex-1 flex-col'>
          <span className='truncate'>{capitalizeFirstLetter(variant)}</span>
        </div>
      )}
    />
  );
}
