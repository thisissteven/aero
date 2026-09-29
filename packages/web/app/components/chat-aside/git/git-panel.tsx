// app/components/chat-aside/git/git-panel.tsx
import { Button } from '@aero/ui';
import { CircleInfo, CodeMerge } from '@gravity-ui/icons';
import { Icon } from '@gravity-ui/uikit';
import { useState } from 'react';

import { SectionTabs } from '@/app/components/chat-aside/pr/shared';
import {
  useGitErrorCode,
  useGitMergeAbort,
  useGitMergeContinue,
  useGitRebaseAbort,
  useGitRebaseContinue,
} from '@/app/hooks/api/git';
import { useSessionDirectory } from '@/app/hooks/api/sessions';
import { useI18n } from '@/app/hooks/i18n';
import { toastPromise } from '@/app/lib/toast';

import { BranchHeader } from './branch-header';
import { BranchesTab } from './branches-tab';
import { HistoryTab } from './history-tab';
import { RemotesTab } from './remotes-tab';
import { PanelMessage, PanelSkeleton } from './shared';
import { StashesTab } from './stashes-tab';
import type { GitSection, Operation } from './types';
import { WorktreesTab } from './worktrees-tab';

export function GitPanel() {
  const { t } = useI18n();
  const directory = useSessionDirectory();
  const { data: errorCode, isLoading: repoLoading } =
    useGitErrorCode(directory);

  const code = (errorCode as { code?: string | null } | null | undefined)?.code;

  if (!directory) {
    return <PanelMessage icon={CodeMerge} message={t.gitPanel.noDirectory} />;
  }

  if (repoLoading) {
    return <PanelSkeleton />;
  }

  if (code === 'DIRECTORY_NOT_FOUND') {
    return (
      <PanelMessage icon={CircleInfo} message={t.gitPanel.directoryNotFound} />
    );
  }

  if (code === 'INVALID_GIT_REPOSITORY') {
    return (
      <PanelMessage
        icon={CodeMerge}
        message={t.gitPanel.noRepository}
        tone='default'
      />
    );
  }

  return (
    <div className='flex h-full min-h-0 flex-col overflow-hidden'>
      <BranchHeader directory={directory} />
      <GitTabs directory={directory} />
    </div>
  );
}

function GitTabs({ directory }: { directory: string }) {
  const { t } = useI18n();
  const [operation, setOperation] = useState<Operation | null>(null);
  const [section, setSection] = useState<GitSection>('branches');

  const sections: Array<{ id: GitSection; label: string }> = [
    { id: 'branches', label: t.gitPanel.branches },
    { id: 'history', label: t.gitPanel.history },
    { id: 'stashes', label: t.gitPanel.stashes },
    { id: 'worktrees', label: t.gitPanel.worktrees },
    { id: 'remotes', label: t.gitPanel.remotes },
  ];

  const abortMerge = useGitMergeAbort();
  const continueMerge = useGitMergeContinue();
  const abortRebase = useGitRebaseAbort();
  const continueRebase = useGitRebaseContinue();

  const busy =
    abortMerge.isPending ||
    continueMerge.isPending ||
    abortRebase.isPending ||
    continueRebase.isPending;

  const handleAbort = async () => {
    if (!operation) return;
    await toastPromise(
      (operation === 'merge' ? abortMerge : abortRebase).mutateAsync({
        directory,
      }),
      {
        loading: t.gitPanel.abort,
        success: t.gitPanel.operationComplete(t.gitPanel.abort),
        error: (error) =>
          error.message || t.gitPanel.operationFailed(t.gitPanel.abort),
      },
    );
    setOperation(null);
  };

  const handleContinue = async () => {
    if (!operation) return;
    const ok = await toastPromise(
      (operation === 'merge' ? continueMerge : continueRebase).mutateAsync({
        directory,
      }),
      {
        loading: t.common.continue,
        success: t.gitPanel.operationComplete(t.common.continue),
        error: (error) =>
          error.message || t.gitPanel.operationFailed(t.common.continue),
      },
    );
    if (ok) setOperation(null);
  };

  return (
    <>
      {operation && (
        <div className='border-warning/40 bg-warning/10 flex shrink-0 items-center gap-2 border-b px-3 py-2 text-xs'>
          <Icon data={CircleInfo} size={14} className='text-warning shrink-0' />
          <span className='min-w-0 flex-1 truncate'>
            {t.gitPanel.operationConflict(
              operation === 'merge' ? t.gitPanel.merge : t.gitPanel.rebase,
            )}
          </span>
          <Button
            size='sm'
            variant='ghost'
            onPress={handleContinue}
            isPending={busy}
          >
            {t.common.continue}
          </Button>
          <Button
            size='sm'
            variant='ghost'
            onPress={handleAbort}
            isDisabled={busy}
          >
            {t.gitPanel.abort}
          </Button>
        </div>
      )}

      <SectionTabs<GitSection>
        ariaLabel={t.gitPanel.sectionsAria}
        active={section}
        onChange={setSection}
        tabs={sections}
      />

      <div
        role='tabpanel'
        aria-label={sections.find((item) => item.id === section)?.label}
        className='scrollbar-thin min-h-0 flex-1 overflow-y-auto'
      >
        {section === 'branches' && (
          <BranchesTab directory={directory} onOperation={setOperation} />
        )}
        {section === 'history' && <HistoryTab directory={directory} />}
        {section === 'stashes' && <StashesTab directory={directory} />}
        {section === 'worktrees' && <WorktreesTab directory={directory} />}
        {section === 'remotes' && <RemotesTab directory={directory} />}
      </div>
    </>
  );
}
