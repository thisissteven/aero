import { createFileRoute } from '@tanstack/react-router';

import { AutomationsPage } from '@/app/features/automations/automations-page';

export const Route = createFileRoute('/_app/automations/')({
  component: AutomationsPage,
});
