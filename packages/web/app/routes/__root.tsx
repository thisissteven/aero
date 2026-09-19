import { createRootRoute, Outlet } from '@tanstack/react-router';
import { registerPierreThemes } from '@/app/components/chat-aside/files/pierre-styles';
import { useSpeechInit } from '@/app/hooks/useSpeechInit';
import { ThemeProvider } from '@/app/providers';

export const Route = createRootRoute({
  component: RootLayout,
});

registerPierreThemes();

function RootLayout() {
  useSpeechInit();

  return (
    <ThemeProvider defaultColorTheme='aero' defaultTheme='system'>
      <Outlet />
    </ThemeProvider>
  );
}
