import { createFileRoute } from '@tanstack/react-router';

import { MockStreamingPage } from '@/app/features/mock-streaming';

export const Route = createFileRoute('/_app/plugins/')({
  component: PluginsPage,
});

function PluginsPage() {
  return <MockStreamingPage />;
}
