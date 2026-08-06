import { createRootRoute, Outlet } from '@tanstack/react-router';

import { QueryProvider, ThemeProvider } from '@/app/providers';

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
