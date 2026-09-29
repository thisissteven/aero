// app/components/chat-aside/pr/branch-tab.tsx
import { CircleInfo, CodeMerge } from '@gravity-ui/icons';

import { useGitCurrentBranch } from '@/app/hooks/api/git';
import { useGitHubPrStatus } from '@/app/hooks/api/github';
import { useI18n } from '@/app/hooks/i18n';

import { PanelMessage, PanelSkeleton } from './panel-message';
import { PrCreateForm } from './pr-create-form';
import { PrView } from './pr-view';
import type { GitHubPrStatus } from './types';

export function BranchTab({ directory }: { directory?: string }) {
  const { t } = useI18n();
  const { data: branchData } = useGitCurrentBranch(directory);
  const branch =
    (branchData as { currentBranch?: string | null } | null | undefined)
      ?.currentBranch ?? undefined;

  const { data, isLoading, refetch } = useGitHubPrStatus(directory, branch);
  const status = data as GitHubPrStatus | null | undefined;

  if (!branch) {
    return (
      <PanelMessage
        icon={CodeMerge}
        message={t.pullRequest.noBranchCheckedOut}
      />
    );
  }

  if (isLoading && !status) return <PanelSkeleton />;

  return (
    <div className='flex h-full min-h-0 flex-col'>
      {!directory || !status?.repo ? (
        <PanelMessage icon={CircleInfo} message={t.pullRequest.noRepository} />
      ) : status.pr ? (
        <PrView
          directory={directory}
          status={status}
          onChanged={() => void refetch()}
        />
      ) : (
        <PrCreateForm
          directory={directory}
          repo={status.repo}
          headBranch={branch}
          onCreated={() => void refetch()}
        />
      )}
    </div>
  );
}
