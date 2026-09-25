import { createFileRoute } from '@tanstack/react-router';
import { useI18n } from '@/app/hooks/i18n';

export const Route = createFileRoute('/_app/workspaces/')({
  component: WorkspacesPage,
});

function WorkspacesPage() {
  const { t } = useI18n();
  return <div>{t.areaNotFound.helloWorkspaces}</div>;
}
