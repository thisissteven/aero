import { createRootRoute, Outlet } from '@tanstack/react-router';

import { ToastProvider } from '@aero/ui';

import {
  GlobalModal,
  QueryProvider,
  SpeechProvider,
  ThemeProvider,
} from '@/app/providers';

export const Route = createRootRoute({
  component: RootLayout,
});

function RootLayout() {
  return (
    <SpeechProvider>
      <ThemeProvider>
        <QueryProvider>
          <ToastProvider
            placement='top end'
            width={280}
            className='xs:mx-2 sm:mx-3'
          />
          <GlobalModal />

          <Outlet />
        </QueryProvider>
      </ThemeProvider>
    </SpeechProvider>
  );
}
