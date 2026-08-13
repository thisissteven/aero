import { createFileRoute } from '@tanstack/react-router';
import React from 'react';

export const Route = createFileRoute('/_app/workspaces/$workspaceId')({
  component: WorkspacePage,
});

function WorkspacePage() {
  return <div>workspace id</div>;
}
