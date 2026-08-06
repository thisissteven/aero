import { createFileRoute } from '@tanstack/react-router';

import { LibraryPage } from '@/app/features/library-page';

export const Route = createFileRoute('/_app/plugins/')({
  component: PluginsPage,
});

function PluginsPage() {
  return <LibraryPage />;
}
