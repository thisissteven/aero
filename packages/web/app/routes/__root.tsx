import { createRootRoute, Outlet } from '@tanstack/react-router';
import { useSpeechInit } from '@/app/hooks/useSpeechInit';
import { QueryProvider, ThemeProvider } from '@/app/providers';

export const Route = createRootRoute({
  component: RootLayout,
});

function RootLayout() {
  useSpeechInit();

  return (
    <QueryProvider>
      <ThemeProvider defaultColorTheme='aero' defaultTheme='system'>
        <Outlet />
      </ThemeProvider>
    </QueryProvider>
  );
}
