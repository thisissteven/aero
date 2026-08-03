import { createRootRoute, Outlet } from '@tanstack/react-router';

import { QueryProvider, ThemeProvider } from '@/providers';

export const Route = createRootRoute({
  component: RootLayout,
});

function RootLayout() {
  return (
    <ThemeProvider>
      <QueryProvider>
        <Outlet />
      </QueryProvider>
    </ThemeProvider>
  );
}
