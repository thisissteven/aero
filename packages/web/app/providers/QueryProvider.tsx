import { Signal } from '@gravity-ui/icons';
import { Icon } from '@gravity-ui/uikit';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

import { useOnlineStatus } from '@/app/hooks/useOnlineStatus';

interface QueryProviderProps {
  children: React.ReactNode;
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      networkMode: 'always',
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 30, // 30 minutes
      refetchOnWindowFocus: 'always',
      refetchOnReconnect: 'always',
      refetchOnMount: 'always',
      retry: 1,
    },
  },
});

export function QueryProvider({ children }: QueryProviderProps) {
  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

export function OfflineAlert() {
  const isOnline = useOnlineStatus();

  if (isOnline) {
    return null;
  }

  return (
    <div className='relative' title='offline alert'>
      <div className='bg-danger absolute -top-0.5 -right-1 size-1 rounded-full'></div>
      <div className='text-muted animate-pulse'>
        <Icon data={Signal} size={16} />
      </div>
    </div>
  );
}
