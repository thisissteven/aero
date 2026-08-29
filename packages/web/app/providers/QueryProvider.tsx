import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

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
