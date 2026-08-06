import { createFileRoute, Outlet } from '@tanstack/react-router';

export const Route = createFileRoute('/_app/plugins')({
  component: PluginsLayout,
});

function PluginsLayout() {
  return <Outlet />;
}
