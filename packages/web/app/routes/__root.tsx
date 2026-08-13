import { createRootRoute, Outlet } from '@tanstack/react-router';

import { ToastProvider } from '@aero/ui';

import { useSpeechInit } from '@/app/hooks/useSpeechInit';
import {
  GlobalModal,
  QueryProvider,
  SettingsModal,
  ThemeProvider,
} from '@/app/providers';

export const Route = createRootRoute({
  component: RootLayout,
});

function RootLayout() {
  useSpeechInit();

  return (
    <ThemeProvider>
      <QueryProvider>
        <ToastProvider
          placement='top end'
          width={280}
          className='xs:mx-2 sm:mx-3'
        />
        <GlobalModal />
        <SettingsModal />
        <Outlet />
      </QueryProvider>
    </ThemeProvider>
  );
}
