import { createFileRoute } from '@tanstack/react-router';

import { FileExplorerPanel } from '@/app/components/message-view/unused/file-system/file-explorer-panel';

export const Route = createFileRoute('/_app/plugins/')({
  component: PluginsPage,
});

function PluginsPage() {
  return <FileExplorerPanel />;
}
