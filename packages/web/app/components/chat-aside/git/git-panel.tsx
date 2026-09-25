// app/components/chat-aside/git/git-panel.tsx
import {
  Button,
  Checkbox,
  Chip,
  cn,
  Dropdown,
  IconButton,
  Input,
  Label,
  Modal,
  Separator,
  Skeleton,
  TextField,
  Tooltip,
  toast,
} from '@aero/ui';
import {
  ArrowDown,
  ArrowRotateLeft,
  ArrowsRotateRight,
  ArrowUp,
  BranchesRight,
  Check,
  CircleCheck,
  CircleInfo,
  CodeCompare,
  CodeMerge,
  EllipsisVertical,
  FileText,
  Plus,
  TrashBin,
} from '@gravity-ui/icons';
import { Icon } from '@gravity-ui/uikit';
import { useIsFetching, useQueryClient } from '@tanstack/react-query';
import { type ComponentProps, useEffect, useState } from 'react';

import {
  gitKeys,
  useGitBranches,
  useGitCheckout,
  useGitCurrentBranch,
  useGitDeleteBranch,
  useGitErrorCode,
  useGitFetch,
  useGitMerge,
  useGitMergeAbort,
  useGitMergeContinue,
  useGitPull,
  useGitPush,
  useGitRangeDiff,
  useGitRebase,
  useGitRebaseAbort,
  useGitRebaseContinue,
  useGitRemotes,
  useGitRemoveRemote,
  useGitStashApply,
  useGitStashDrop,
  useGitStashes,
  useGitStashPop,
  useGitStashPush,
  useGitStatus,
  useGitSummary,
  useGitWorktrees,
} from '@/app/hooks/api/git';
import { useSessionDirectory } from '@/app/hooks/api/sessions';
import { useDeleteWorktree } from '@/app/hooks/api/worktree';
import { useI18n } from '@/app/hooks/i18n';
import { getLastPathName } from '@/app/lib/file';
import { useSidePanelStore } from '@/app/stores/side-panel-store';

import { GitDiffContent } from './git-diff-content';

type Operation = 'merge' | 'rebase';
type GitSection = 'branches' | 'stashes' | 'worktrees' | 'remotes';

interface GitBranch {
  name: string;
  current: boolean;
  commit: string;
  label: string;
}

interface Worktree {
  path?: string;
  directory?: string;
  branch?: string;
  head?: string;
  isMain?: boolean;
}

interface Remote {
  name: string;
  refs?: { fetch?: string; push?: string };
}

interface Stash {
  ref: string;
  message: string;
  relativeTime: string;
}

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

function BranchHeader({ directory }: { directory: string }) {
  const { t } = useI18n();
  const { data: statusData } = useGitStatus(directory);
  const { data: branchData } = useGitCurrentBranch(directory);
  const { data: summaryData } = useGitSummary(directory);

  const pull = useGitPull();
  const push = useGitPush();
  const fetch = useGitFetch();

  const status = statusData as
    | {
        tracking?: string | null;
        ahead?: number;
        behind?: number;
        isClean?: boolean;
      }
    | null
    | undefined;

  const branch =
    (branchData as { currentBranch?: string | null } | null | undefined)
      ?.currentBranch ?? '—';

  const summary =
    (
      summaryData as {
        summary?: Array<{ additions: number; deletions: number }>;
      }
    )?.summary ?? [];
  const additions = summary.reduce((sum, entry) => sum + entry.additions, 0);
  const deletions = summary.reduce((sum, entry) => sum + entry.deletions, 0);
  const changeCount = summary.length;

  const busy = pull.isPending || push.isPending || fetch.isPending;

  const run = async (
    mutation: { mutateAsync: (input: any) => Promise<unknown> },
    label: string,
  ) => {
    try {
      await mutation.mutateAsync({ directory });
      toast.success(t.gitPanel.operationComplete(label));
    } catch (error) {
      toast.danger(
        error instanceof Error
          ? error.message
          : t.gitPanel.operationFailed(label),
      );
    }
  };

  return (
    <div className='border-separator shrink-0 border-b px-3 py-2'>
      <div className='flex items-center gap-2'>
        <Icon data={CodeMerge} size={14} className='text-accent shrink-0' />
        <span className='min-w-0 flex-1 truncate text-sm font-medium'>
          {branch}
        </span>

        {typeof status?.ahead === 'number' && status.ahead > 0 && (
          <Chip size='sm' variant='soft' color='accent'>
            <Icon data={ArrowUp} size={10} />
            {status.ahead}
          </Chip>
        )}
        {typeof status?.behind === 'number' && status.behind > 0 && (
          <Chip size='sm' variant='soft' color='warning'>
            <Icon data={ArrowDown} size={10} />
            {status.behind}
          </Chip>
        )}

        <div className='flex shrink-0 items-center gap-0.5'>
          <Tooltip>
            <Tooltip.Trigger>
              <IconButton
                isDisabled={busy}
                aria-label={t.gitPanel.pull}
                onPress={() => run(pull, t.gitPanel.pull)}
              >
                <Icon data={ArrowDown} />
              </IconButton>
            </Tooltip.Trigger>
            <Tooltip.Content>{t.gitPanel.pull}</Tooltip.Content>
          </Tooltip>
          <Tooltip>
            <Tooltip.Trigger>
              <IconButton
                isDisabled={busy}
                aria-label={t.gitPanel.push}
                onPress={() => run(push, t.gitPanel.push)}
              >
                <Icon data={ArrowUp} />
              </IconButton>
            </Tooltip.Trigger>
            <Tooltip.Content>{t.gitPanel.push}</Tooltip.Content>
          </Tooltip>
          <Tooltip>
            <Tooltip.Trigger>
              <IconButton
                isDisabled={busy}
                aria-label={t.gitPanel.fetch}
                onPress={() => run(fetch, t.gitPanel.fetch)}
              >
                <Icon
                  data={ArrowsRotateRight}
                  className={cn(fetch.isPending && 'animate-spin')}
                />
              </IconButton>
            </Tooltip.Trigger>
            <Tooltip.Content>{t.gitPanel.fetch}</Tooltip.Content>
          </Tooltip>
          <GitRefreshButton directory={directory} />
        </div>
      </div>

      {status?.tracking && (
        <div className='text-muted mt-0.5 truncate pl-5 text-xs'>
          → {status.tracking}
        </div>
      )}

      <SummaryStrip
        changeCount={changeCount}
        additions={additions}
        deletions={deletions}
        clean={changeCount === 0}
      />
    </div>
  );
}

function SummaryStrip({
  changeCount,
  additions,
  deletions,
  clean,
}: {
  changeCount: number;
  additions: number;
  deletions: number;
  clean: boolean;
}) {
  const { t } = useI18n();
  const setActiveNavItem = useSidePanelStore((s) => s.setActiveNavItem);

  return (
    <button
      type='button'
      onClick={() => setActiveNavItem('changes')}
      className='border-separator bg-default/30 hover:bg-default/60 mt-2 flex w-full items-center gap-2 rounded-md border px-2 py-1.5 text-xs transition-colors'
    >
      <Icon
        data={clean ? CircleCheck : FileText}
        size={12}
        className={cn('shrink-0', clean ? 'text-success' : 'text-muted')}
      />
      <span className='min-w-0 flex-1 truncate text-left'>
        {clean
          ? t.changesPanel.workingTreeClean
          : t.changesPanel.changeCount(changeCount)}
      </span>
      {additions > 0 && (
        <span className='text-success shrink-0 tabular-nums'>+{additions}</span>
      )}
      {deletions > 0 && (
        <span className='text-danger shrink-0 tabular-nums'>-{deletions}</span>
      )}
    </button>
  );
}

function GitRefreshButton({ directory }: { directory: string }) {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const isFetching = useIsFetching({ queryKey: gitKeys.all(directory) }) > 0;

  return (
    <Tooltip>
      <Tooltip.Trigger>
        <IconButton
          aria-label={t.gitPanel.refresh}
          onPress={() => {
            void queryClient.invalidateQueries({
              queryKey: gitKeys.all(directory),
            });
          }}
        >
          <Icon
            data={ArrowRotateLeft}
            className={cn(isFetching && 'animate-spin')}
          />
        </IconButton>
      </Tooltip.Trigger>
      <Tooltip.Content>{t.gitPanel.refresh}</Tooltip.Content>
    </Tooltip>
  );
}

function GitTabs({ directory }: { directory: string }) {
  const { t } = useI18n();
  const [operation, setOperation] = useState<Operation | null>(null);
  const [section, setSection] = useState<GitSection>('branches');

  const sections: Array<{ id: GitSection; label: string }> = [
    { id: 'branches', label: t.gitPanel.branches },
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
    try {
      await (operation === 'merge' ? abortMerge : abortRebase).mutateAsync({
        directory,
      });
      toast.success(t.gitPanel.operationComplete(t.gitPanel.abort));
    } catch (error) {
      toast.danger(
        error instanceof Error
          ? error.message
          : t.gitPanel.operationFailed(t.gitPanel.abort),
      );
    } finally {
      setOperation(null);
    }
  };

  const handleContinue = async () => {
    if (!operation) return;
    try {
      await (operation === 'merge'
        ? continueMerge
        : continueRebase
      ).mutateAsync({ directory });
      toast.success(t.gitPanel.operationComplete(t.common.continue));
      setOperation(null);
    } catch (error) {
      toast.danger(
        error instanceof Error
          ? error.message
          : t.gitPanel.operationFailed(t.common.continue),
      );
    }
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

      <div
        role='tablist'
        aria-label={t.gitPanel.sectionsAria}
        className='border-separator flex shrink-0 items-center gap-0.5 border-b px-2'
      >
        {sections.map((item) => {
          const isActive = section === item.id;
          return (
            <button
              key={item.id}
              type='button'
              role='tab'
              aria-selected={isActive}
              onClick={() => setSection(item.id)}
              className={cn(
                'relative px-2.5 py-2 text-xs outline-none transition-colors',
                isActive
                  ? 'text-foreground font-medium'
                  : 'text-muted hover:text-foreground',
              )}
            >
              {item.label}
              {isActive && (
                <span className='bg-accent absolute inset-x-1.5 -bottom-px h-0.5 rounded-full' />
              )}
            </button>
          );
        })}
      </div>

      <div
        role='tabpanel'
        aria-label={sections.find((item) => item.id === section)?.label}
        className='scrollbar-thin min-h-0 flex-1 overflow-y-auto'
      >
        {section === 'branches' && (
          <BranchesTab directory={directory} onOperation={setOperation} />
        )}
        {section === 'stashes' && <StashesTab directory={directory} />}
        {section === 'worktrees' && <WorktreesTab directory={directory} />}
        {section === 'remotes' && <RemotesTab directory={directory} />}
      </div>
    </>
  );
}

function BranchesTab({
  directory,
  onOperation,
}: {
  directory: string;
  onOperation: (operation: Operation) => void;
}) {
  const { t } = useI18n();
  const { data, isLoading } = useGitBranches(directory);
  const { data: remotesData } = useGitRemotes(directory);
  const checkout = useGitCheckout();
  const merge = useGitMerge();
  const rebase = useGitRebase();

  const [isCreateOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [filter, setFilter] = useState('');
  const [compareBranch, setCompareBranch] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{
    branch: string;
    remote?: string;
    display: string;
  } | null>(null);

  const branches =
    (data as { branches?: GitBranch[] } | null | undefined)?.branches ?? [];
  const currentBranch = branches.find((b) => b.current)?.name ?? null;

  const remoteNames = (
    Array.isArray(remotesData) ? (remotesData as Remote[]) : []
  ).map((remote) => remote.name);

  const query = filter.trim().toLowerCase();
  const visible = query
    ? branches.filter((b) => b.name.toLowerCase().includes(query))
    : branches;

  const handleCheckout = async (name: string) => {
    if (checkout.isPending) return;
    try {
      await checkout.mutateAsync({ directory, target: name });
      toast.success(t.gitPanel.switchedToBranch(name));
    } catch (error) {
      toast.danger(
        error instanceof Error ? error.message : t.gitPanel.checkoutFailed,
      );
    }
  };

  const handleMerge = async (name: string) => {
    try {
      await merge.mutateAsync({ directory, branch: name });
      toast.success(t.gitPanel.operationComplete(t.gitPanel.merge));
    } catch (error) {
      toast.danger(
        error instanceof Error ? error.message : t.gitPanel.mergeFailed,
      );
      onOperation('merge');
    }
  };

  const handleRebase = async (name: string) => {
    try {
      await rebase.mutateAsync({ directory, upstream: name });
      toast.success(t.gitPanel.operationComplete(t.gitPanel.rebase));
    } catch (error) {
      toast.danger(
        error instanceof Error ? error.message : t.gitPanel.rebaseFailed,
      );
      onOperation('rebase');
    }
  };

  const handleCreate = async () => {
    const target = newName.trim();
    if (!target) return;
    try {
      await checkout.mutateAsync({
        directory,
        target,
        createBranch: true,
      });
      toast.success(t.gitPanel.createdBranch(target));
      setNewName('');
      setCreateOpen(false);
    } catch (error) {
      toast.danger(
        error instanceof Error
          ? error.message
          : t.gitPanel.branchCreationFailed,
      );
    }
  };

  if (isLoading) return <ListSkeleton />;

  return (
    <div className='flex flex-col gap-1 p-2'>
      <div className='flex items-center gap-1.5'>
        <Input
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder={t.gitPanel.filterBranches}
          className='min-w-0 flex-1 h-7 px-2 text-xs rounded-md'
        />
        <Tooltip>
          <Tooltip.Trigger>
            <IconButton
              aria-label={t.gitPanel.newBranch}
              onPress={() => setCreateOpen(true)}
            >
              <Icon data={Plus} />
            </IconButton>
          </Tooltip.Trigger>
          <Tooltip.Content>{t.gitPanel.newBranch}</Tooltip.Content>
        </Tooltip>
      </div>

      {visible.length === 0 ? (
        <EmptyState
          label={query ? t.common.noResults : t.gitPanel.noBranches}
        />
      ) : (
        <ul className='space-y-0.5'>
          {visible.map((branch) => {
            const remote = remoteNames.find((name) =>
              branch.name.startsWith(`${name}/`),
            );
            const isRemote = Boolean(remote);

            return (
              <li
                key={branch.name}
                className='group hover:bg-default/40 grid grid-cols-[minmax(0,1fr)_4.5rem_1.75rem] items-center gap-0 rounded-md px-2 py-1.5 text-sm'
              >
                <div className='flex min-w-0 items-center gap-2'>
                  {branch.current ? (
                    <>
                      <Icon
                        data={CodeMerge}
                        size={12}
                        className='text-accent shrink-0'
                      />
                      <span className='min-w-0 truncate font-medium'>
                        {branch.name}
                      </span>
                    </>
                  ) : isRemote ? (
                    <>
                      <Icon
                        data={CodeMerge}
                        size={12}
                        className='text-muted shrink-0'
                      />
                      <span className='text-muted min-w-0 truncate'>
                        {branch.name}
                      </span>
                    </>
                  ) : (
                    <button
                      type='button'
                      onClick={() => handleCheckout(branch.name)}
                      className='flex min-w-0 flex-1 cursor-pointer items-center gap-2 text-left'
                    >
                      <Icon
                        data={CodeMerge}
                        size={12}
                        className='text-muted shrink-0'
                      />
                      <span className='min-w-0 truncate'>{branch.name}</span>
                    </button>
                  )}
                </div>

                <span className='text-muted min-w-0 truncate text-right font-mono text-xs tabular-nums'>
                  {branch.commit ? branch.commit.slice(0, 7) : ''}
                </span>

                <div className='flex h-6 items-center justify-end'>
                  {branch.current ? (
                    <Chip size='sm' variant='soft' color='success'>
                      {t.gitPanel.currentBranch}
                    </Chip>
                  ) : (
                    <BranchActionsMenu
                      name={branch.name}
                      showCheckout={!isRemote}
                      onCheckout={() => handleCheckout(branch.name)}
                      onMerge={() => handleMerge(branch.name)}
                      onRebase={() => handleRebase(branch.name)}
                      onCompare={() => setCompareBranch(branch.name)}
                      onDelete={() =>
                        setDeleteTarget(
                          remote
                            ? {
                                branch: branch.name.slice(remote.length + 1),
                                remote,
                                display: branch.name,
                              }
                            : {
                                branch: branch.name,
                                display: branch.name,
                              },
                        )
                      }
                    />
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <Modal isOpen={isCreateOpen} onOpenChange={setCreateOpen}>
        <Modal.Backdrop>
          <Modal.Container>
            <Modal.Dialog>
              {({ close }) => (
                <>
                  <Modal.Header>{t.gitPanel.createBranch}</Modal.Header>
                  <Modal.Body>
                    <TextField>
                      <Label>{t.gitPanel.branchName}</Label>
                      <Input
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        placeholder='feature/my-thing'
                      />
                    </TextField>
                  </Modal.Body>
                  <Modal.Footer>
                    <Button size='sm' variant='ghost' onPress={close}>
                      {t.common.cancel}
                    </Button>
                    <Button
                      size='sm'
                      variant='primary'
                      onPress={handleCreate}
                      isPending={checkout.isPending}
                      isDisabled={!newName.trim()}
                    >
                      {t.common.create}
                    </Button>
                  </Modal.Footer>
                </>
              )}
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>

      <RangeDiffModal
        directory={directory}
        base={currentBranch}
        head={compareBranch}
        onClose={() => setCompareBranch(null)}
      />

      <DeleteBranchModal
        directory={directory}
        target={deleteTarget}
        onClose={() => setDeleteTarget(null)}
      />
    </div>
  );
}

function BranchActionsMenu({
  name,
  showCheckout,
  onCheckout,
  onMerge,
  onRebase,
  onCompare,
  onDelete,
}: {
  name: string;
  showCheckout: boolean;
  onCheckout: () => void;
  onMerge: () => void;
  onRebase: () => void;
  onCompare: () => void;
  onDelete: () => void;
}) {
  const { t } = useI18n();

  return (
    <Dropdown size='sm'>
      <IconButton aria-label={t.gitPanel.branchActions(name)}>
        <Icon data={EllipsisVertical} />
      </IconButton>
      <Dropdown.Popover placement='bottom end'>
        <Dropdown.Menu
          onAction={(key) => {
            if (key === 'checkout') onCheckout();
            else if (key === 'merge') onMerge();
            else if (key === 'rebase') onRebase();
            else if (key === 'compare') onCompare();
            else if (key === 'delete') onDelete();
          }}
        >
          {showCheckout && (
            <Dropdown.Item id='checkout' textValue={t.gitPanel.checkout}>
              <Icon data={Check} />
              <Label>{t.gitPanel.checkout}</Label>
            </Dropdown.Item>
          )}
          <Dropdown.Item id='merge' textValue={t.gitPanel.mergeIntoCurrent}>
            <Icon data={CodeMerge} />
            <Label>{t.gitPanel.mergeIntoCurrent}</Label>
          </Dropdown.Item>
          <Dropdown.Item id='rebase' textValue={t.gitPanel.rebaseOnto}>
            <Icon data={BranchesRight} />
            <Label>{t.gitPanel.rebaseOnto}</Label>
          </Dropdown.Item>
          <Dropdown.Item id='compare' textValue={t.gitPanel.compareWithCurrent}>
            <Icon data={CodeCompare} />
            <Label>{t.gitPanel.compareWithCurrent}</Label>
          </Dropdown.Item>
          <Separator />
          <Dropdown.Item
            id='delete'
            variant='danger'
            textValue={t.gitPanel.deleteBranch}
          >
            <Icon data={TrashBin} className='text-danger-soft-foreground' />
            <Label className='text-danger-soft-foreground! font-medium'>
              {t.gitPanel.deleteBranch}
            </Label>
          </Dropdown.Item>
        </Dropdown.Menu>
      </Dropdown.Popover>
    </Dropdown>
  );
}

function OptionCheckbox({
  isSelected,
  onChange,
  label,
  isDisabled,
}: {
  isSelected: boolean;
  onChange: (isSelected: boolean) => void;
  label: string;
  isDisabled?: boolean;
}) {
  return (
    <Checkbox
      isSelected={isSelected}
      isDisabled={isDisabled}
      onChange={onChange}
    >
      <Checkbox.Content className='gap-2'>
        <Checkbox.Control>
          <Checkbox.Indicator />
        </Checkbox.Control>
        <span className='text-foreground text-sm'>{label}</span>
      </Checkbox.Content>
    </Checkbox>
  );
}

function DeleteBranchModal({
  directory,
  target,
  onClose,
}: {
  directory: string;
  target: { branch: string; remote?: string; display: string } | null;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const deleteBranch = useGitDeleteBranch();

  const [deleteLocal, setDeleteLocal] = useState(true);
  const [deleteRemote, setDeleteRemote] = useState(false);
  const [remote, setRemote] = useState('origin');

  useEffect(() => {
    if (!target) return;
    setDeleteLocal(!target.remote);
    setDeleteRemote(Boolean(target.remote));
    setRemote(target.remote ?? 'origin');
  }, [target]);

  const isRemoteOnly = Boolean(target?.remote);

  const handleDelete = async () => {
    if (!target) return;
    try {
      await deleteBranch.mutateAsync({
        directory,
        branch: target.branch,
        force: true,
        deleteLocal,
        deleteRemote,
        remote: deleteRemote ? remote.trim() || 'origin' : undefined,
      });
      toast.success(t.gitPanel.branchDeleted(target.display));
      onClose();
    } catch (error) {
      toast.danger(
        error instanceof Error ? error.message : t.gitPanel.deleteBranchFailed,
      );
    }
  };

  return (
    <Modal
      isOpen={Boolean(target)}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <Modal.Backdrop>
        <Modal.Container>
          <Modal.Dialog>
            {({ close }) => (
              <>
                <Modal.Header>{t.gitPanel.deleteBranchTitle}</Modal.Header>
                <Modal.Body>
                  <p className='text-muted text-sm'>
                    {t.gitPanel.deleteBranchConfirm(target?.display ?? '')}
                  </p>

                  {!isRemoteOnly && (
                    <div className='mt-4 space-y-3'>
                      <OptionCheckbox
                        isSelected={deleteLocal}
                        onChange={setDeleteLocal}
                        label={t.gitPanel.deleteLocalBranch}
                      />
                      <OptionCheckbox
                        isSelected={deleteRemote}
                        onChange={setDeleteRemote}
                        label={t.gitPanel.deleteRemoteBranch}
                      />
                      {deleteRemote && (
                        <Input
                          value={remote}
                          onChange={(e) => setRemote(e.target.value)}
                          placeholder='origin'
                          className='h-7 px-2 text-xs rounded-md'
                          aria-label={t.gitPanel.remote}
                        />
                      )}
                    </div>
                  )}
                </Modal.Body>
                <Modal.Footer>
                  <Button size='sm' variant='ghost' onPress={close}>
                    {t.common.cancel}
                  </Button>
                  <Button
                    size='sm'
                    variant='danger'
                    onPress={handleDelete}
                    isPending={deleteBranch.isPending}
                    isDisabled={!isRemoteOnly && !deleteLocal && !deleteRemote}
                  >
                    {t.gitPanel.deleteBranch}
                  </Button>
                </Modal.Footer>
              </>
            )}
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}

function RangeDiffModal({
  directory,
  base,
  head,
  onClose,
}: {
  directory: string;
  base: string | null;
  head: string | null;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const { data, isLoading } = useGitRangeDiff(
    directory,
    base ?? undefined,
    head ?? undefined,
  );
  const diff = (data as { diff?: string } | null | undefined)?.diff;

  return (
    <Modal
      isOpen={Boolean(base && head)}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <Modal.Backdrop>
        <Modal.Container>
          <Modal.Dialog>
            {({ close }) => (
              <>
                <Modal.Header className='flex items-center gap-2'>
                  <Icon data={CodeCompare} size={14} className='text-accent' />
                  <span className='min-w-0 truncate font-mono text-sm'>
                    {base} → {head}
                  </span>
                </Modal.Header>

                <Modal.Body>
                  {isLoading ? (
                    <Skeleton className='h-40 w-full rounded' />
                  ) : (
                    <GitDiffContent
                      diff={diff}
                      emptyLabel={t.changesPanel.noChangesToDisplay}
                      className='max-h-[60vh]'
                    />
                  )}
                </Modal.Body>

                <Modal.Footer>
                  <Button size='sm' variant='ghost' onPress={close}>
                    {t.common.close}
                  </Button>
                </Modal.Footer>
              </>
            )}
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}

function StashesTab({ directory }: { directory: string }) {
  const { t } = useI18n();
  const { data, isLoading } = useGitStashes(directory);
  const push = useGitStashPush();
  const apply = useGitStashApply();
  const pop = useGitStashPop();
  const drop = useGitStashDrop();

  const [message, setMessage] = useState('');

  const stashes =
    (data as { stashes?: Stash[] } | null | undefined)?.stashes ?? [];

  const run = async (
    mutation: { mutateAsync: (input: any) => Promise<unknown> },
    input: Record<string, unknown>,
    label: string,
  ) => {
    try {
      await mutation.mutateAsync({ directory, ...input });
      toast.success(t.gitPanel.operationComplete(label));
    } catch (error) {
      toast.danger(
        error instanceof Error
          ? error.message
          : t.gitPanel.operationFailed(label),
      );
    }
  };

  if (isLoading) return <ListSkeleton />;

  return (
    <div className='space-y-2 p-2'>
      <div className='flex items-center gap-1.5'>
        <Input
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder={t.gitPanel.stashMessagePlaceholder}
          className='min-w-0 flex-1 h-7 text-xs rounded-md px-2'
        />
        <Button
          size='sm'
          variant='primary'
          onPress={() => {
            void run(
              push,
              { message: message.trim() || undefined },
              t.gitPanel.stash,
            );
            setMessage('');
          }}
          isPending={push.isPending}
          className='rounded-md h-7 text-xs'
        >
          {t.gitPanel.stash}
        </Button>
      </div>

      {stashes.length === 0 ? (
        <EmptyState label={t.gitPanel.noStashes} />
      ) : (
        <ul className='space-y-1'>
          {stashes.map((stash) => (
            <li
              key={stash.ref}
              className='bg-default/40 flex items-center gap-1.5 rounded-md px-2 py-1.5 text-sm'
            >
              <div className='min-w-0 flex-1'>
                <div className='truncate font-medium'>{stash.ref}</div>
                <div className='text-muted truncate text-xs'>
                  {stash.message} · {stash.relativeTime}
                </div>
              </div>

              <Tooltip>
                <Tooltip.Trigger>
                  <IconButton
                    aria-label={t.gitPanel.applyStash}
                    onPress={() =>
                      run(apply, { ref: stash.ref }, t.gitPanel.applyStash)
                    }
                  >
                    <Icon data={Check} />
                  </IconButton>
                </Tooltip.Trigger>
                <Tooltip.Content>{t.gitPanel.apply}</Tooltip.Content>
              </Tooltip>
              <Tooltip>
                <Tooltip.Trigger>
                  <IconButton
                    aria-label={t.gitPanel.popStash}
                    onPress={() =>
                      run(pop, { ref: stash.ref }, t.gitPanel.popStash)
                    }
                  >
                    <Icon data={ArrowUp} />
                  </IconButton>
                </Tooltip.Trigger>
                <Tooltip.Content>{t.gitPanel.pop}</Tooltip.Content>
              </Tooltip>
              <Tooltip>
                <Tooltip.Trigger>
                  <IconButton
                    aria-label={t.gitPanel.dropStash}
                    onPress={() =>
                      run(drop, { ref: stash.ref }, t.gitPanel.dropStash)
                    }
                  >
                    <Icon data={TrashBin} />
                  </IconButton>
                </Tooltip.Trigger>
                <Tooltip.Content>{t.gitPanel.drop}</Tooltip.Content>
              </Tooltip>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function WorktreesTab({ directory }: { directory: string }) {
  const { t } = useI18n();
  const { data, isLoading } = useGitWorktrees(directory);
  const [deleteTarget, setDeleteTarget] = useState<Worktree | null>(null);

  if (isLoading) return <ListSkeleton />;

  const worktrees = Array.isArray(data)
    ? (data as Worktree[])
    : ((data as { worktrees?: Worktree[] } | null | undefined)?.worktrees ??
      []);

  if (!worktrees.length) return <EmptyState label={t.gitPanel.noWorktrees} />;

  return (
    <>
      <ul className='space-y-1 p-2'>
        {worktrees.map((wt, i) => {
          const path = wt.directory ?? wt.path ?? '';
          const name = getLastPathName(path);

          return (
            <li
              key={path || i}
              className='bg-default/40 flex items-start gap-1.5 rounded-md px-2 py-1.5 text-sm'
            >
              <div className='min-w-0 flex-1'>
                <div className='truncate font-mono text-xs'>{path}</div>
                <div className='mt-1 flex items-center gap-2 text-xs'>
                  {wt.branch && (
                    <Chip size='sm' variant='soft' color='accent'>
                      {wt.branch}
                    </Chip>
                  )}
                  {wt.head && (
                    <span className='text-muted font-mono tabular-nums'>
                      {wt.head.slice(0, 7)}
                    </span>
                  )}
                </div>
              </div>

              {!wt.isMain && (
                <Dropdown size='sm'>
                  <IconButton aria-label={t.workspace.worktreeActions(name)}>
                    <Icon data={EllipsisVertical} />
                  </IconButton>
                  <Dropdown.Popover placement='bottom end'>
                    <Dropdown.Menu
                      onAction={(key) => {
                        if (key === 'delete') setDeleteTarget(wt);
                      }}
                    >
                      <Dropdown.Item
                        id='delete'
                        variant='danger'
                        textValue={t.gitPanel.deleteWorktree}
                      >
                        <Icon
                          data={TrashBin}
                          className='text-danger-soft-foreground'
                        />
                        <Label className='text-danger-soft-foreground! font-medium'>
                          {t.gitPanel.deleteWorktree}
                        </Label>
                      </Dropdown.Item>
                    </Dropdown.Menu>
                  </Dropdown.Popover>
                </Dropdown>
              )}
            </li>
          );
        })}
      </ul>

      <DeleteWorktreeModal
        directory={directory}
        worktree={deleteTarget}
        onClose={() => setDeleteTarget(null)}
      />
    </>
  );
}

function DeleteWorktreeModal({
  directory,
  worktree,
  onClose,
}: {
  directory: string;
  worktree: Worktree | null;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const deleteWorktree = useDeleteWorktree();

  const [alsoDeleteBranch, setAlsoDeleteBranch] = useState(false);
  const [deleteLocal, setDeleteLocal] = useState(true);
  const [deleteRemote, setDeleteRemote] = useState(false);
  const [remote, setRemote] = useState('origin');

  const branch = worktree?.branch ?? undefined;
  const name = worktree?.directory
    ? getLastPathName(worktree.directory)
    : (branch ?? '');

  useEffect(() => {
    if (!worktree) return;
    setAlsoDeleteBranch(false);
    setDeleteLocal(true);
    setDeleteRemote(false);
    setRemote('origin');
  }, [worktree]);

  const handleDelete = async () => {
    if (!worktree?.directory) return;
    try {
      await deleteWorktree.mutateAsync({
        directory,
        worktreeDirectory: worktree.directory,
        force: true,
        branch,
        deleteBranch: alsoDeleteBranch && Boolean(branch),
        deleteRemote: alsoDeleteBranch && deleteRemote,
        remote:
          alsoDeleteBranch && deleteRemote
            ? remote.trim() || 'origin'
            : undefined,
      });
      toast.success(t.workspace.worktreeDeleted);
      onClose();
    } catch (error) {
      toast.danger(
        error instanceof Error
          ? error.message
          : t.gitPanel.deleteWorktreeFailed,
      );
    }
  };

  return (
    <Modal
      isOpen={Boolean(worktree)}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <Modal.Backdrop>
        <Modal.Container>
          <Modal.Dialog>
            {({ close }) => (
              <>
                <Modal.Header>{t.workspace.deleteWorktree}</Modal.Header>
                <Modal.Body>
                  <p className='text-muted text-sm'>
                    {t.workspace.deleteWorktreeConfirm(name)}
                  </p>

                  <div className='mt-4 space-y-3'>
                    <OptionCheckbox
                      isSelected={alsoDeleteBranch}
                      onChange={setAlsoDeleteBranch}
                      label={t.gitPanel.alsoDeleteBranch}
                      isDisabled={!branch}
                    />
                    {alsoDeleteBranch && branch && (
                      <>
                        <OptionCheckbox
                          isSelected={deleteLocal}
                          onChange={setDeleteLocal}
                          label={t.gitPanel.deleteLocalBranch}
                        />
                        <OptionCheckbox
                          isSelected={deleteRemote}
                          onChange={setDeleteRemote}
                          label={t.gitPanel.deleteRemoteBranch}
                        />
                        {deleteRemote && (
                          <Input
                            value={remote}
                            onChange={(e) => setRemote(e.target.value)}
                            placeholder='origin'
                            className='h-7 px-2 text-xs rounded-md'
                            aria-label={t.gitPanel.remote}
                          />
                        )}
                      </>
                    )}
                  </div>
                </Modal.Body>
                <Modal.Footer>
                  <Button size='sm' variant='ghost' onPress={close}>
                    {t.common.cancel}
                  </Button>
                  <Button
                    size='sm'
                    variant='danger'
                    onPress={handleDelete}
                    isPending={deleteWorktree.isPending}
                  >
                    {t.gitPanel.deleteWorktree}
                  </Button>
                </Modal.Footer>
              </>
            )}
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}

function RemotesTab({ directory }: { directory: string }) {
  const { t } = useI18n();
  const { data, isLoading } = useGitRemotes(directory);
  const removeRemote = useGitRemoveRemote();
  const fetch = useGitFetch();

  if (isLoading) return <ListSkeleton />;

  const remotes = Array.isArray(data) ? (data as Remote[]) : [];
  if (!remotes.length) return <EmptyState label={t.gitPanel.noRemotes} />;

  return (
    <ul className='space-y-1 p-2'>
      {remotes.map((remote) => (
        <li
          key={remote.name}
          className='bg-default/40 flex items-center gap-1.5 rounded-md px-2 py-1.5 text-sm'
        >
          <div className='min-w-0 flex-1'>
            <div className='font-medium'>{remote.name}</div>
            {remote.refs?.fetch && (
              <div className='text-muted truncate font-mono text-xs'>
                {remote.refs.fetch}
              </div>
            )}
          </div>

          <Tooltip>
            <Tooltip.Trigger>
              <IconButton
                aria-label={t.gitPanel.fetch}
                isDisabled={fetch.isPending}
                onPress={async () => {
                  try {
                    await fetch.mutateAsync({ directory, remote: remote.name });
                    toast.success(
                      t.gitPanel.operationComplete(t.gitPanel.fetch),
                    );
                  } catch (error) {
                    toast.danger(
                      error instanceof Error
                        ? error.message
                        : t.gitPanel.operationFailed(t.gitPanel.fetch),
                    );
                  }
                }}
              >
                <Icon data={ArrowsRotateRight} />
              </IconButton>
            </Tooltip.Trigger>
            <Tooltip.Content>{t.gitPanel.fetch}</Tooltip.Content>
          </Tooltip>

          <Tooltip>
            <Tooltip.Trigger>
              <IconButton
                aria-label={t.gitPanel.removeRemote}
                isDisabled={removeRemote.isPending}
                onPress={async () => {
                  try {
                    await removeRemote.mutateAsync({
                      directory,
                      remote: remote.name,
                    });
                    toast.success(t.gitPanel.removedRemote(remote.name));
                  } catch (error) {
                    toast.danger(
                      error instanceof Error
                        ? error.message
                        : t.gitPanel.removeRemoteFailed,
                    );
                  }
                }}
              >
                <Icon data={TrashBin} />
              </IconButton>
            </Tooltip.Trigger>
            <Tooltip.Content>{t.gitPanel.removeRemote}</Tooltip.Content>
          </Tooltip>
        </li>
      ))}
    </ul>
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
      <Skeleton className='h-9 w-full rounded' />
      <Skeleton className='h-16 w-full rounded' />
      <Skeleton className='h-7 w-2/3 rounded' />
    </div>
  );
}

function ListSkeleton() {
  return (
    <div className='space-y-1 p-2'>
      <Skeleton className='h-7 w-full rounded' />
      <Skeleton className='h-7 w-full rounded' />
      <Skeleton className='h-7 w-3/4 rounded' />
    </div>
  );
}

function EmptyState({ label }: { label: string }) {
  return (
    <div className='text-muted flex items-center justify-center py-10 text-sm'>
      {label}
    </div>
  );
}
