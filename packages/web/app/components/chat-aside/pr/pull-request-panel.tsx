// app/components/chat-aside/pr/pull-request-panel.tsx
//
// Entry point for the GitHub side panel. Signs the user in, then shows the
// pull request for the current branch, a browsable list of the repository's
// open pull requests, and the repository's issue list.

import { cn, IconButton, Skeleton, Tooltip } from '@aero/ui';
import { ArrowRotateLeft, CircleInfo, CodeMerge } from '@gravity-ui/icons';
import { Icon } from '@gravity-ui/uikit';
import { useQueryClient } from '@tanstack/react-query';
import { type ComponentProps, useState } from 'react';

import { useGitCurrentBranch } from '@/app/hooks/api/git';
import {
  githubKeys,
  useGitHubAuthStatus,
  useGitHubPrStatus,
} from '@/app/hooks/api/github';
import { useSessionDirectory } from '@/app/hooks/api/sessions';
import { useI18n } from '@/app/hooks/i18n';

import { GitHubAccountMenu } from './github-account-menu';
import { GitHubConnectCard } from './github-connect-card';
import { IssuesPanel } from './issues-panel';
import { PrCreateForm } from './pr-create-form';
import { PullList } from './pr-list';
import { PrView } from './pr-view';
import { SectionTabs } from './shared';
import type { GitHubAuthStatus, GitHubPrStatus } from './types';

type PanelTab = 'branch' | 'pulls' | 'issues';

export function PullRequestPanel() {
  const { t } = useI18n();
  const directory = useSessionDirectory();
  const {
    data: auth,
    isLoading: authLoading,
    refetch: refetchAuth,
  } = useGitHubAuthStatus();
  const [tab, setTab] = useState<PanelTab>('branch');

  if (authLoading && !auth) return <PanelSkeleton />;

  const connected = Boolean(auth?.connected);

  if (!connected || !auth) {
    return (
      <GitHubConnectCard
        auth={auth ?? null}
        onConnected={() => void refetchAuth()}
      />
    );
  }

  return (
    <div className='flex h-full min-h-0 flex-col overflow-hidden'>
      <PanelHeader auth={auth} onChanged={() => void refetchAuth()} />

      <SectionTabs<PanelTab>
        ariaLabel={t.pullRequest.repository}
        active={tab}
        onChange={setTab}
        tabs={[
          { id: 'branch', label: t.pullRequest.branchTab },
          { id: 'pulls', label: t.pullRequest.pullRequests },
          { id: 'issues', label: t.pullRequest.issues },
        ]}
      />

      <div
        role='tabpanel'
        aria-label={t.pullRequest.repository}
        className='min-h-0 flex-1 overflow-hidden'
      >
        {tab === 'branch' ? (
          <BranchTab directory={directory} />
        ) : tab === 'pulls' ? (
          directory ? (
            <PullList directory={directory} />
          ) : (
            <PanelMessage
              icon={CircleInfo}
              message={t.pullRequest.noRepository}
            />
          )
        ) : directory ? (
          <IssuesPanel directory={directory} />
        ) : (
          <PanelMessage
            icon={CircleInfo}
            message={t.pullRequest.noRepository}
          />
        )}
      </div>
    </div>
  );
}

function PanelHeader({
  auth,
  onChanged,
}: {
  auth: GitHubAuthStatus;
  onChanged: () => void;
}) {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const refresh = async () => {
    setIsRefreshing(true);
    try {
      await queryClient.invalidateQueries({ queryKey: githubKeys.all() });
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <div className='border-separator flex shrink-0 items-center gap-1 border-b px-2 py-1.5'>
      <GitHubAccountMenu auth={auth} onChanged={onChanged} />
      <span className='min-w-0 flex-1' />
      <Tooltip>
        <Tooltip.Trigger>
          <IconButton
            className='rounded-lg'
            aria-label={t.pullRequest.refresh}
            isDisabled={isRefreshing}
            onPress={() => void refresh()}
          >
            <Icon
              data={ArrowRotateLeft}
              className={cn(
                isRefreshing && 'animate-spin motion-reduce:animate-none',
              )}
            />
          </IconButton>
        </Tooltip.Trigger>
        <Tooltip.Content>{t.pullRequest.refresh}</Tooltip.Content>
      </Tooltip>
    </div>
  );
}

function BranchTab({ directory }: { directory?: string }) {
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

function PanelMessage({
  icon,
  message,
  tone = 'default',
}: {
  icon: ComponentProps<typeof Icon>['data'];
  message: string;
  tone?: 'default' | 'warning';
}) {
  return (
    <div className='flex h-full min-h-0 flex-col items-center justify-center gap-2 p-6 text-center'>
      <Icon
        data={icon}
        size={20}
        className={tone === 'warning' ? 'text-warning' : 'text-muted'}
      />
      <p className='text-muted max-w-64 text-sm'>{message}</p>
    </div>
  );
}

function PanelSkeleton() {
  return (
    <div className='space-y-2 p-3'>
      <Skeleton className='h-8 w-full rounded' />
      <Skeleton className='h-20 w-full rounded' />
    </div>
  );
}
