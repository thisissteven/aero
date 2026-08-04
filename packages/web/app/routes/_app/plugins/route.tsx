import { createFileRoute, Outlet } from '@tanstack/react-router';

export const Route = createFileRoute('/_app/plugins')({
  component: PluginsLayout,
});

function PluginsLayout() {
  return (
    <div className='plugins-container'>
      <h2>Plugins Manager (Internal Layout)</h2>
      <Outlet />
    </div>
  );
}
