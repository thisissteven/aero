import { createFileRoute, Outlet } from '@tanstack/react-router';

import { ToastProvider } from '@aero/ui';

import { ChatShell } from '@/app/components/chat-shell';
import { usePoolReady } from '@/app/hooks/api/pool';
import { I18nProvider } from '@/app/hooks/i18n';
import { translations } from '@/app/hooks/i18n/locales/translations';
import {
  GlobalModal,
  QueryProvider,
  SettingsModal,
  useTheme,
} from '@/app/providers';
import { KeyPressProvider } from '@/app/providers/key-press';
import { PathnameHandler } from '@/app/providers/PathnameHandler';
import { PreloadProvider } from '@/app/providers/PreloadProvider';

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
        <ToastProvider placement='bottom end' width={280} />
        <GlobalModal />
        <SettingsModal />
        <KeyPressProvider />
        <PreloadProvider />
        <PathnameHandler />
        <ChatShell>
          <Outlet />
        </ChatShell>
      </I18nProvider>
    </QueryProvider>
  );
}
