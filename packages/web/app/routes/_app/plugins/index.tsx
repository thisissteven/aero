import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/_app/plugins/')({
  component: PluginsPage,
});

function PluginsPage() {
  return <div>Hello "/_app/plugins/"!</div>;
}
