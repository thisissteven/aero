import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/_app/workspaces/$workspaceId')({
  component: WorkspacePage,
});

function WorkspacePage() {
  return <div>Hello "/_app/workspaces/$workspaceId"!</div>;
}
