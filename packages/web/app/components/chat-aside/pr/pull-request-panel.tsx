// app/components/chat-aside/pr/pull-request-panel.tsx
//
// Entry point for the GitHub side panel. Signs the user in, then shows either
// the pull request for the current branch (or a form to open one) and the
// repository's issue list.

import { cn, Skeleton, Tabs } from '@aero/ui';
import { ArrowRotateLeft } from '@gravity-ui/icons';
import { Icon } from '@gravity-ui/uikit';
import { useState } from 'react';

import { useGitCurrentBranch } from '@/app/hooks/api/git';
import { useGitHubAuthStatus, useGitHubPrStatus } from '@/app/hooks/api/github';
import { useSessionDirectory } from '@/app/hooks/api/sessions';
import { useI18n } from '@/app/hooks/i18n';

import { GitHubAccountMenu } from './github-account-menu';
import { GitHubConnectCard } from './github-connect-card';
import { IssuesPanel } from './issues-panel';
import { PrCreateForm } from './pr-create-form';
import { PrView } from './pr-view';
import type { GitHubPrStatus } from './types';

export function PullRequestPanel() {
  const { t } = useI18n();
  const directory = useSessionDirectory();
  const {
    data: auth,
    isLoading: authLoading,
    refetch: refetchAuth,
  } = useGitHubAuthStatus();
  const [tab, setTab] = useState<'pr' | 'issues'>('pr');

  if (authLoading && !auth) return <AuthSkeleton />;

  const connected = Boolean(auth?.connected);

  if (!connected || !auth) {
    return (
      <GitHubConnectCard
        auth={auth ?? null}
        onConnected={() => refetchAuth()}
      />
    );
  }

  return (
    <div className='flex h-full flex-col overflow-hidden'>
      <div className='border-separator flex items-center gap-1 border-b px-2 py-1.5'>
        <GitHubAccountMenu auth={auth} onChanged={() => refetchAuth()} />
        <Tabs
          selectedKey={tab}
          onSelectionChange={(key) => setTab(key as 'pr' | 'issues')}
          className='ml-1 min-w-0 flex-1'
          variant='secondary'
        >
          <Tabs.ListContainer>
            <Tabs.List aria-label={t.pullRequest.repository}>
              <Tabs.Tab id='pr'>
                {t.pullRequest.pullRequests}
                <Tabs.Indicator />
              </Tabs.Tab>
              <Tabs.Tab id='issues'>
                {t.pullRequest.issues}
                <Tabs.Indicator />
              </Tabs.Tab>
            </Tabs.List>
          </Tabs.ListContainer>
        </Tabs>
      </div>

      {tab === 'pr' ? (
        <PrTab directory={directory} />
      ) : directory ? (
        <IssuesPanel directory={directory} />
      ) : null}
    </div>
  );
}

function PrTab({ directory }: { directory?: string }) {
  const { t } = useI18n();
  const { data: branchData } = useGitCurrentBranch(directory);
  const branch = branchData?.currentBranch ?? undefined;

  const { data, isLoading, refetch, isFetching } = useGitHubPrStatus(
    directory,
    branch,
  );
  const status = data as GitHubPrStatus | null | undefined;

  if (!branch) {
    return (
      <div className='text-muted flex flex-1 items-center justify-center p-6 text-center text-sm'>
        {t.pullRequest.noBranchCheckedOut}
      </div>
    );
  }

  if (isLoading && !status) {
    return (
      <div className='space-y-2 p-3'>
        <Skeleton className='h-6 w-3/4 rounded' />
        <Skeleton className='h-4 w-1/2 rounded' />
        <Skeleton className='h-16 w-full rounded' />
      </div>
    );
  }

  return (
    <div className='flex min-h-0 flex-1 flex-col'>
      <div className='border-separator flex items-center justify-between border-b px-3 py-1.5'>
        <span className='text-muted truncate font-mono text-xs'>{branch}</span>
        <button
          type='button'
          onClick={() => void refetch()}
          aria-label={t.pullRequest.refresh}
          className='text-muted hover:text-foreground shrink-0'
        >
          <Icon
            data={ArrowRotateLeft}
            size={12}
            className={cn(isFetching && 'animate-spin')}
          />
        </button>
      </div>

      {!status?.repo || !directory ? (
        <div className='text-muted flex flex-1 items-center justify-center p-6 text-center text-sm'>
          {t.pullRequest.noRepository}
        </div>
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

function AuthSkeleton() {
  return (
    <div className='space-y-2 p-3'>
      <Skeleton className='h-8 w-full rounded' />
      <Skeleton className='h-20 w-full rounded' />
    </div>
  );
}
