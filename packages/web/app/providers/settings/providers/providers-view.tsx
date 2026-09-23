// providers-view.tsx

import { ConnectProviderView } from './components/connect-provider-view';
import { ProviderDetailsView } from './components/provider-details-view';
import { ProvidersSidebar } from './components/providers-sidebar';
import { useProvidersStore } from './providers-store';

export function ProvidersView() {
  const viewMode = useProvidersStore((s) => s.viewMode);

  return (
    <div className='bg-background flex h-full w-full overflow-hidden'>
      <ProvidersSidebar />

      <main className='flex flex-1 scrollbar-thin overflow-y-auto p-8'>
        <div className='mx-auto w-full max-w-3xl'>
          {viewMode === 'connect' ? (
            <ConnectProviderView />
          ) : (
            <ProviderDetailsView />
          )}
        </div>
      </main>
    </div>
  );
}
