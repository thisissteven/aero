// app/components/chat-aside/git/branches-tab.tsx
import {
  Button,
  Chip,
  Dropdown,
  IconButton,
  Input,
  Label,
  Modal,
  Separator,
  Skeleton,
  TextField,
  Tooltip,
} from '@aero/ui';
import {
  BranchesRight,
  Check,
  CodeCompare,
  CodeMerge,
  EllipsisVertical,
  Plus,
  TrashBin,
} from '@gravity-ui/icons';
import { Icon } from '@gravity-ui/uikit';
import { useEffect, useState } from 'react';

import {
  useGitBranches,
  useGitCheckout,
  useGitDeleteBranch,
  useGitMerge,
  useGitRangeDiff,
  useGitRebase,
  useGitRemotes,
} from '@/app/hooks/api/git';
import { useI18n } from '@/app/hooks/i18n';
import { toastPromise } from '@/app/lib/toast';

import { GitDiffContent } from './git-diff-content';
import { EmptyState, ListSkeleton, OptionCheckbox } from './shared';
import type { GitBranch, Operation, Remote } from './types';

export function BranchesTab({
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
    await toastPromise(checkout.mutateAsync({ directory, target: name }), {
      loading: t.gitPanel.checkout,
      success: t.gitPanel.switchedToBranch(name),
      error: (error) => error.message || t.gitPanel.checkoutFailed,
    });
  };

  const handleMerge = async (name: string) => {
    const ok = await toastPromise(
      merge.mutateAsync({ directory, branch: name }),
      {
        loading: t.gitPanel.merge,
        success: t.gitPanel.operationComplete(t.gitPanel.merge),
        error: (error) => error.message || t.gitPanel.mergeFailed,
      },
    );
    if (!ok) onOperation('merge');
  };

  const handleRebase = async (name: string) => {
    const ok = await toastPromise(
      rebase.mutateAsync({ directory, upstream: name }),
      {
        loading: t.gitPanel.rebase,
        success: t.gitPanel.operationComplete(t.gitPanel.rebase),
        error: (error) => error.message || t.gitPanel.rebaseFailed,
      },
    );
    if (!ok) onOperation('rebase');
  };

  const handleCreate = async () => {
    const target = newName.trim();
    if (!target) return;
    const ok = await toastPromise(
      checkout.mutateAsync({ directory, target, createBranch: true }),
      {
        loading: t.gitPanel.createBranch,
        success: t.gitPanel.createdBranch(target),
        error: (error) => error.message || t.gitPanel.branchCreationFailed,
      },
    );
    if (ok) {
      setNewName('');
      setCreateOpen(false);
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
                className='group hover:bg-default/40 grid grid-cols-[minmax(0,1fr)_4.5rem_auto] items-center gap-2 rounded-md pl-2 pr-1 py-1.5 text-sm'
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
    const ok = await toastPromise(
      deleteBranch.mutateAsync({
        directory,
        branch: target.branch,
        force: true,
        deleteLocal,
        deleteRemote,
        remote: deleteRemote ? remote.trim() || 'origin' : undefined,
      }),
      {
        loading: t.gitPanel.deleteBranch,
        success: t.gitPanel.branchDeleted(target.display),
        error: (error) => error.message || t.gitPanel.deleteBranchFailed,
      },
    );
    if (ok) onClose();
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
