import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/_app/plugins/$pluginId')({
  component: PluginPage,
});

function PluginPage() {
  return <div>Hello "/_app/plugins/$pluginId"!</div>;
}
