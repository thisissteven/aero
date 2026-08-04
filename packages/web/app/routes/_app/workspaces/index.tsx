import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/_app/workspaces/')({
  component: WorkspacesPage,
});

function WorkspacesPage() {
  return <div>Hello "/_app/workspaces/"!</div>;
}
