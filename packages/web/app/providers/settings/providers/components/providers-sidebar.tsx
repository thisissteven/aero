// components/providers-sidebar.tsx
import { Button, IconButton, Label, ListBox, Select, Skeleton } from '@aero/ui';
import { Plus } from '@gravity-ui/icons';
import { Icon } from '@gravity-ui/uikit';
import { useEffect } from 'react';
import { ProviderLogo } from '@/app/components/provider-logo';
import { useConfiguredProviders } from '@/app/hooks/api/providers';
import { useProvidersStore } from '../providers-store';

export function ProvidersSidebar() {
  const selectedProviderId = useProvidersStore((s) => s.selectedProviderId);
  const setSelectedProviderId = useProvidersStore(
    (s) => s.setSelectedProviderId,
  );
  const setViewMode = useProvidersStore((s) => s.setViewMode);

  const { data: providers = [], isLoading } = useConfiguredProviders();

  // Auto-select the first provider when the list loads
  useEffect(() => {
    if (!selectedProviderId && providers.length > 0) {
      setSelectedProviderId(providers[0].id);
    }
  }, [providers, selectedProviderId, setSelectedProviderId]);

  const viewMode = useProvidersStore((s) => s.viewMode);

  return (
    <aside className='border-separator flex w-64 shrink-0 flex-col border-r'>
      <div className='flex items-center justify-between pl-4 pr-2 py-4'>
        <span className='text-muted text-xs font-medium'>
          Total {providers.length}
        </span>
        <IconButton onClick={() => setViewMode('connect')}>
          <Icon data={Plus} />
        </IconButton>
      </div>

      <div className='flex-1 overflow-y-auto px-2 pb-4'>
        <div className='text-muted px-2 py-2 text-[10px] font-semibold tracking-wider uppercase'>
          Configured Providers
        </div>
        <nav className='flex flex-col gap-0.5'>
          {isLoading ? (
            <div className='space-y-2 px-2 py-2'>
              <Skeleton className='h-8 w-full rounded-md' />
              <Skeleton className='h-8 w-full rounded-md' />
              <Skeleton className='h-8 w-full rounded-md' />
            </div>
          ) : (
            providers.map((provider) => {
              const isActive =
                provider.id === selectedProviderId && viewMode === 'details';
              const modelCount = Object.keys(provider.models || {}).length;

              return (
                <button
                  key={provider.id}
                  onClick={() => {
                    setSelectedProviderId(provider.id);
                    setViewMode('details');
                  }}
                  className={`flex items-center justify-between rounded-md px-2.5 py-2 text-sm transition-colors ${
                    isActive
                      ? 'bg-surface-secondary text-surface-foreground font-medium'
                      : 'text-muted hover:bg-surface-secondary/50 hover:text-foreground'
                  }`}
                >
                  <div className='flex items-center gap-2.5'>
                    <ProviderLogo providerId={provider.id} className='size-4' />
                    <span>{provider.name}</span>
                  </div>
                  <span className='text-muted text-xs'>{modelCount}</span>
                </button>
              );
            })
          )}
        </nav>
      </div>
    </aside>
  );
}
