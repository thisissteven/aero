// app/components/chat-aside/changes/changes-panel.tsx
import {
  Button,
  Checkbox,
  cn,
  IconButton,
  Skeleton,
  TextArea,
  Tooltip,
  toast,
} from '@aero/ui';
import { ArrowRotateLeft, CircleInfo, CodeMerge } from '@gravity-ui/icons';
import { Icon } from '@gravity-ui/uikit';
import { useEffect, useMemo, useState } from 'react';

import { openFileWhenReady } from '@/app/components/chat-aside/files/open-file-when-ready';
import {
  useGitCommit,
  useGitErrorCode,
  useGitStatus,
  useGitSummary,
} from '@/app/hooks/api/git';
import { useSessionDirectory } from '@/app/hooks/api/sessions';
import { useI18n } from '@/app/hooks/i18n';
import { toWorkspaceRelative } from '@/app/lib/file';
import { toastPromise } from '@/app/lib/toast';
import { useSidePanelStore } from '@/app/stores/side-panel-store';

import { ChangeGroup } from './change-group';
import { buildEntries } from './lib';
import type { DiffStatEntry, GitStatusShape } from './types';

export function ChangesPanel() {
  const { t } = useI18n();
  const directory = useSessionDirectory();

  const { data: errorCode, isLoading: repoLoading } =
    useGitErrorCode(directory);
  const code = (errorCode as { code?: string | null } | null | undefined)?.code;

  const { data, isLoading, refetch, isFetching } = useGitStatus(directory);
  const { data: summaryData } = useGitSummary(directory);
  const commitMutation = useGitCommit();

  const status = data as GitStatusShape | null | undefined;
  const summary =
    (summaryData as { summary?: DiffStatEntry[] } | null | undefined)
      ?.summary ?? [];
  const entries = useMemo(
    () => buildEntries(status, summary),
    [status, summary],
  );

  const [message, setMessage] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [expandedKey, setExpandedKey] = useState<string | null>(null);

  useEffect(() => {
    if (!entries.length) return;
    setSelected((prev) => {
      if (prev.size > 0) return prev;
      const next = new Set<string>();
      for (const entry of entries) {
        if (!entry.staged || entry.untracked) next.add(entry.path);
      }
      return next;
    });
  }, [entries]);

  const stagedEntries = entries.filter(
    (entry) => entry.index !== ' ' && entry.index !== '?',
  );
  const workingEntries = entries.filter(
    (entry) => entry.untracked || entry.working !== ' ',
  );

  const totalAdditions = entries.reduce((a, e) => a + e.additions, 0);
  const totalDeletions = entries.reduce((a, e) => a + e.deletions, 0);

  const toggle = (path: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  };

  const handleCommit = async (addAll: boolean) => {
    if (!directory) return;
    if (!message.trim()) {
      toast.danger(t.changesPanel.commitMessageRequired);
      return;
    }

    const ok = await toastPromise(
      commitMutation.mutateAsync({
        directory,
        message: message.trim(),
        ...(addAll ? { addAll: true } : { files: Array.from(selected) }),
      }),
      {
        loading: t.changesPanel.commit,
        success: t.changesPanel.commitCreated,
        error: (error) => error.message || t.changesPanel.failedToCreateCommit,
      },
    );
    if (ok) {
      setMessage('');
      setSelected(new Set());
      refetch();
    }
  };

  const openFileInEditor = (path: string) => {
    if (!directory) return;
    const relative = toWorkspaceRelative(path, directory);
    useSidePanelStore.getState().setActiveNavItem('files');
    openFileWhenReady(relative);
  };

  const toggleExpanded = (key: string) => {
    setExpandedKey((prev) => (prev === key ? null : key));
  };

  if (!directory) {
    return (
      <div className='text-muted flex h-full min-h-0 flex-col items-center justify-center gap-2 p-6 text-center'>
        <Icon data={CodeMerge} size={20} className='text-muted' />
        <p className='max-w-64 text-sm'>{t.gitPanel.noDirectory}</p>
      </div>
    );
  }

  if (repoLoading || isLoading) {
    return (
      <div className='space-y-2 p-3'>
        <Skeleton className='h-8 w-full rounded' />
        <Skeleton className='h-6 w-3/4 rounded' />
        <Skeleton className='h-6 w-1/2 rounded' />
      </div>
    );
  }

  if (code === 'DIRECTORY_NOT_FOUND' || code === 'INVALID_GIT_REPOSITORY') {
    return (
      <div className='text-muted flex h-full min-h-0 flex-col items-center justify-center gap-2 p-6 text-center'>
        <Icon data={CircleInfo} size={20} />
        <p className='max-w-64 text-sm'>
          {code === 'DIRECTORY_NOT_FOUND'
            ? t.gitPanel.directoryNotFound
            : t.gitPanel.noRepository}
        </p>
      </div>
    );
  }

  const allSelected = entries.length > 0 && selected.size === entries.length;

  return (
    <div className='flex h-full min-h-0 flex-col overflow-hidden'>
      <div className='border-separator flex items-center justify-between border-b px-3 py-2 text-sm'>
        <div className='flex min-w-0 items-center gap-2'>
          <span className='font-medium'>
            {t.changesPanel.changeCount(entries.length)}
          </span>
          {totalAdditions > 0 && (
            <span className='text-success text-xs tabular-nums'>
              +{totalAdditions}
            </span>
          )}
          {totalDeletions > 0 && (
            <span className='text-danger text-xs tabular-nums'>
              -{totalDeletions}
            </span>
          )}
        </div>

        <div className='flex shrink-0 items-center gap-2'>
          <Checkbox
            variant='secondary'
            isSelected={allSelected}
            isIndeterminate={selected.size > 0 && !allSelected}
            onChange={(isSelected) => {
              setSelected(
                isSelected
                  ? new Set(entries.map((entry) => entry.path))
                  : new Set(),
              );
            }}
            isDisabled={!entries.length}
          >
            <Checkbox.Content className='gap-2'>
              <Checkbox.Control>
                <Checkbox.Indicator />
              </Checkbox.Control>
              <span className='text-muted text-xs'>
                {allSelected
                  ? t.changesPanel.deselectAll
                  : t.changesPanel.selectAll}
              </span>
            </Checkbox.Content>
          </Checkbox>
          <Tooltip>
            <Tooltip.Trigger>
              <IconButton
                aria-label={t.changesPanel.refresh}
                onPress={() => refetch()}
              >
                <Icon
                  data={ArrowRotateLeft}
                  className={cn(isFetching && 'animate-spin')}
                />
              </IconButton>
            </Tooltip.Trigger>
            <Tooltip.Content>{t.changesPanel.refresh}</Tooltip.Content>
          </Tooltip>
        </div>
      </div>

      <div className='scrollbar-thin min-h-0 flex-1 overflow-y-auto'>
        {entries.length === 0 ? (
          <div className='text-muted flex h-full items-center justify-center px-4 text-center text-sm'>
            {t.changesPanel.workingTreeClean}
          </div>
        ) : (
          <div className='p-1'>
            <ChangeGroup
              variant='staged'
              directory={directory}
              title={t.changesPanel.stagedChanges}
              entries={stagedEntries}
              selected={selected}
              expandedKey={expandedKey}
              onToggle={toggle}
              onToggleExpanded={toggleExpanded}
              onOpenFile={openFileInEditor}
            />
            <ChangeGroup
              variant='working'
              directory={directory}
              title={t.changesPanel.workingChanges}
              entries={workingEntries}
              selected={selected}
              expandedKey={expandedKey}
              onToggle={toggle}
              onToggleExpanded={toggleExpanded}
              onOpenFile={openFileInEditor}
            />
          </div>
        )}
      </div>

      <div className='border-separator shrink-0 border-t p-2'>
        <TextArea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder={t.changesPanel.commitMessage}
          className='text-sm w-full scrollbar-thin rounded-md text-xs px-2 resize-none'
          rows={3}
        />

        <div className='flex items-center justify-end gap-2'>
          <Button
            size='sm'
            variant='primary'
            onPress={() => handleCommit(false)}
            isPending={commitMutation.isPending}
            isDisabled={!message.trim() || selected.size === 0}
            className='text-xs rounded-md h-7'
          >
            {t.changesPanel.commit}
            {selected.size > 0 && ` (${selected.size})`}
          </Button>
          <Button
            size='sm'
            variant='ghost'
            onPress={() => handleCommit(true)}
            isPending={commitMutation.isPending}
            isDisabled={!message.trim() || entries.length === 0}
            className='text-xs rounded-md h-7'
          >
            {t.changesPanel.commitAll}
          </Button>
        </div>
      </div>
    </div>
  );
}
