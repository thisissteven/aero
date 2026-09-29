// app/components/chat-aside/pr/pull-request-panel.tsx
//
// Entry point for the GitHub side panel. Signs the user in, then shows the
// pull request for the current branch, a browsable list of the repository's
// open pull requests, and the repository's issue list.

import { CircleInfo } from '@gravity-ui/icons';
import { useState } from 'react';

import { useGitHubAuthStatus } from '@/app/hooks/api/github';
import { useSessionDirectory } from '@/app/hooks/api/sessions';
import { useI18n } from '@/app/hooks/i18n';

import { BranchTab } from './branch-tab';
import { GitHubConnectCard } from './github-connect-card';
import { IssuesPanel } from './issues-panel';
import { PanelHeader } from './panel-header';
import { PanelMessage, PanelSkeleton } from './panel-message';
import { PullList } from './pr-list';
import { SectionTabs } from './shared';

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
