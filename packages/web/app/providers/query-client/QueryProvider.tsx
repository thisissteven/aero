import { Signal } from '@gravity-ui/icons';
import { Icon } from '@gravity-ui/uikit';
import { QueryClientProvider } from '@tanstack/react-query';
import React, { ReactNode } from 'react';

import { useChatInputExpanded } from '@/app/hooks/api/settings';
import { useI18n } from '@/app/hooks/i18n';
import { useOnlineStatus } from '@/app/hooks/useOnlineStatus';
import { queryClient } from './query-client';

interface QueryProviderProps {
  children: React.ReactNode;
}

export function QueryProvider({ children }: QueryProviderProps) {
  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

export function OfflineAlert() {
  const isOnline = useOnlineStatus();
  const isChatInputExpanded = useChatInputExpanded();
  const { t } = useI18n();

  if (isOnline || isChatInputExpanded) {
    return null;
  }

  return (
    <div className='relative' title={t.system.offlineAlert}>
      <div className='bg-danger absolute -top-0.5 -right-1 size-1 rounded-full'></div>
      <div className='text-muted animate-pulse'>
        <Icon data={Signal} size={16} />
      </div>
    </div>
  );
}

export function OfflineWrapper({ children }: { children: ReactNode }) {
  const isOnline = useOnlineStatus();
  const { t } = useI18n();

  if (!isOnline) {
    return (
      <div className='absolute left-0 -translate-y-full'>
        <div className='border-separator text-warning mx-2 mb-2 flex shrink-0 animate-pulse items-center gap-1 rounded-xl border bg-transparent px-2 py-1 text-sm backdrop-blur-sm'>
          {t.system.reconnecting}
        </div>
      </div>
    );
  }

  return children;
}
