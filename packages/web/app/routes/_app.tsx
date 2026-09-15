import { FloatingLogger, ToastProvider } from '@aero/ui';
import { createFileRoute, Outlet, useParams } from '@tanstack/react-router';
import React, { ReactNode } from 'react';
import { ChatShell } from '@/app/components/chat-shell';
import { usePoolReady } from '@/app/hooks/api/pool';
import { I18nProvider } from '@/app/hooks/i18n';
import { translations } from '@/app/hooks/i18n/locales/translations';
import {
  GlobalModal,
  GlobalModalOuter,
  QueryProvider,
  SettingsModal,
  useTheme,
} from '@/app/providers';
import { GlobalTooltip } from '@/app/providers/global-tooltip/GlobalTooltipProvider';
import { KeyPressProvider } from '@/app/providers/key-press';
import { PathnameHandler } from '@/app/providers/PathnameHandler';
import { PreloadProvider } from '@/app/providers/PreloadProvider';
import { SessionIdProvider } from '@/app/providers/SessionIdProvider';

export const Route = createFileRoute('/_app')({
  component: AppLayout,
});

function AppLayout() {
  const isPoolReady = usePoolReady();
  const { resolvedTheme } = useTheme();

  if (!isPoolReady) {
    return (
      <div className='bg-background grid h-screen place-items-center'>
        <div className='bg-surface-secondary border-separator flex size-28 animate-pulse items-center justify-center rounded-2xl border p-2 inset-shadow-sm'>
          <img
            src={
              resolvedTheme === 'dark'
                ? '/favicon-dark.svg'
                : '/favicon-light.svg'
            }
            alt='Aero Logo'
            className='size-20 object-contain'
          />
        </div>
      </div>
    );
  }

  return (
    <QueryProvider>
      <I18nProvider translations={translations} defaultLanguage='en'>
        <KeyPressProvider />
        <PreloadProvider />
        <PathnameHandler />
        <FloatingLogger />
        <RootSessionIdProvider>
          <ChatShell>
            <Outlet />
          </ChatShell>
          <ToastProvider placement='bottom end' width={280} />
          <GlobalTooltip />
          <GlobalModal />
          <GlobalModalOuter />
          <SettingsModal />
        </RootSessionIdProvider>
      </I18nProvider>
    </QueryProvider>
  );
}

function RootSessionIdProvider({ children }: { children: React.ReactNode }) {
  const { sessionId } = useParams({ strict: false });
  return <SessionIdProvider value={sessionId}>{children}</SessionIdProvider>;
}
