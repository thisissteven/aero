import { createFileRoute } from '@tanstack/react-router';

import { AeroSmartChatComposer } from '@/app/components/message-view/unused/smart-composer/smart-composer';

export const Route = createFileRoute('/_app/plugins/')({
  component: PluginsPage,
});

function PluginsPage() {
  return <AeroSmartChatComposer onSubmit={() => {}} />;
}
