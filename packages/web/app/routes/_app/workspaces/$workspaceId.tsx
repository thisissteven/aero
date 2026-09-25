import { createFileRoute } from '@tanstack/react-router';
import { useI18n } from '@/app/hooks/i18n';

export const Route = createFileRoute('/_app/workspaces/$workspaceId')({
  component: WorkspacePage,
});

function WorkspacePage() {
  const { t } = useI18n();
  return <div>{t.areaNotFound.workspaceId}</div>;
}
