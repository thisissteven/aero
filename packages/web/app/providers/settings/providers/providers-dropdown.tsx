// components/provider-dropdown.tsx
import { useMemo, useState } from 'react';
import { ProviderLogo } from '@/app/components/provider-logo';
import {
  buildVirtualDropdownEntries,
  VirtualizedDropdown,
} from '@/app/components/virtualized-dropdown';
import { useProviders } from '@/app/hooks/api/providers';
import { useI18n } from '@/app/hooks/i18n';
import { useProvidersStore } from './providers-store';

export function ProviderDropdown() {
  const selectedProviderId = useProvidersStore((s) => s.selectedProviderId);
  const setSelectedProviderId = useProvidersStore(
    (s) => s.setSelectedProviderId,
  );
  const { t } = useI18n();

  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Switched to useProviders
  const { data: providers = [], isLoading } = useProviders();

  const filteredProviders = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return providers.filter(
      (p) =>
        p.name.toLowerCase().includes(query) ||
        p.id.toLowerCase().includes(query),
    );
  }, [providers, searchQuery]);

  const entries = useMemo(
    () =>
      buildVirtualDropdownEntries({
        groups: [
          {
            id: 'providers',
            label: t.settingsProviders.availableProviders,
            items: filteredProviders,
          },
        ],
        getKey: (provider) => provider.id,
      }),
    [filteredProviders, t],
  );

  const selectedProvider = providers.find((p) => p.id === selectedProviderId);

  return (
    <VirtualizedDropdown
      isOpen={isOpen}
      onOpenChange={setIsOpen}
      entries={entries}
      selectedKey={selectedProviderId}
      getKey={(provider) => provider.id}
      onSelect={(provider) => {
        setSelectedProviderId(provider.id);
        setIsOpen(false);
      }}
      trigger={
        <>
          {selectedProvider ? (
            <div className='flex items-center gap-2'>
              <ProviderLogo
                providerId={selectedProvider.id}
                className='size-4'
              />
              <span className='truncate'>{selectedProvider.name}</span>
            </div>
          ) : (
            <span className='text-muted'>
              {t.settingsProviders.selectProvider}
            </span>
          )}
        </>
      }
      // Style the trigger to look like the input box in the image
      triggerClassName='w-full justify-between px-3 max-w-[320px] h-9 font-normal bg-surface-secondary border border-separator rounded-md text-sm hover:bg-surface-secondary/80'
      searchValue={searchQuery}
      onSearchValueChange={setSearchQuery}
      searchPlaceholder={t.settingsProviders.searchProvider}
      emptyState={
        isLoading
          ? t.settingsProviders.loadingProviders
          : t.settingsProviders.noProvidersFound
      }
      renderRow={(provider) => (
        <div className='flex min-w-0 flex-1 items-center gap-2'>
          <ProviderLogo providerId={provider.id} className='size-4' />
          <span className='truncate'>{provider.name}</span>
        </div>
      )}
      contentClassName='w-[280px]'
      listClassName='max-h-60'
      placement='top left'
    />
  );
}
