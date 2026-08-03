import { createFileRoute } from '@tanstack/react-router';

// import { SettingsPage } from '@/views/settings';

function SettingsPage() {
  return null;
}

export const Route = createFileRoute('/settings')({
  component: SettingsPage,
});
