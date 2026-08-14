import { createRootRoute, Outlet } from '@tanstack/react-router';

import { ToastProvider } from '@aero/ui';

import { I18nProvider } from '@/app/hooks/i18n';
import { translations } from '@/app/hooks/i18n/locales/translations';
import { useSpeechInit } from '@/app/hooks/useSpeechInit';
import {
  GlobalModal,
  QueryProvider,
  SettingsModal,
  ThemeProvider,
} from '@/app/providers';
import { KeyPressProvider } from '@/app/providers/key-press';

export const Route = createRootRoute({
  component: RootLayout,
});

function RootLayout() {
  useSpeechInit();

  return (
    <ThemeProvider defaultColorTheme='aero' defaultTheme='system'>
      <QueryProvider>
        <I18nProvider translations={translations} defaultLanguage='en'>
          <ToastProvider
            placement='top end'
            width={280}
            className='xs:mx-2 sm:mx-3'
          />
          <GlobalModal />
          <SettingsModal />
          <KeyPressProvider />
          <Outlet />
        </I18nProvider>
      </QueryProvider>
    </ThemeProvider>
  );
}
