// app/components/chat-aside/git/worktrees-tab.tsx
import {
  Button,
  Chip,
  Dropdown,
  IconButton,
  Input,
  Label,
  Modal,
  Separator,
} from '@aero/ui';
import {
  ArrowDown,
  ArrowsRotateRight,
  ArrowUp,
  EllipsisVertical,
  TrashBin,
} from '@gravity-ui/icons';
import { Icon } from '@gravity-ui/uikit';
import { useEffect, useState } from 'react';

import { OpenIsolatedWorkspace } from '@/app/components/chat-sidebar/session/session-actions';
import {
  useGitFetch,
  useGitPull,
  useGitPush,
  useGitRemotes,
  useGitWorktrees,
} from '@/app/hooks/api/git';
import { useWorkspace } from '@/app/hooks/api/workspaces';
import { useDeleteWorktree } from '@/app/hooks/api/worktree';
import { useI18n } from '@/app/hooks/i18n';
import { getLastPathName } from '@/app/lib/file';
import { toastPromise } from '@/app/lib/toast';

import { EmptyState, ListSkeleton, OptionCheckbox } from './shared';
import type { Remote, Worktree } from './types';

export function WorktreesTab({ directory }: { directory: string }) {
  const { t } = useI18n();
  const { data, isLoading } = useGitWorktrees(directory);
  const { data: remotesData } = useGitRemotes(directory);
  const { data: workspace } = useWorkspace(directory);
  const [deleteTarget, setDeleteTarget] = useState<Worktree | null>(null);

  if (isLoading) return <ListSkeleton />;

  const worktrees = Array.isArray(data)
    ? (data as Worktree[])
    : ((data as { worktrees?: Worktree[] } | null | undefined)?.worktrees ??
      []);

  const remoteNames = (
    Array.isArray(remotesData) ? (remotesData as Remote[]) : []
  ).map((remote) => remote.name);
  const remote = remoteNames.includes('origin')
    ? 'origin'
    : (remoteNames[0] ?? 'origin');

  // "Open workspace" should reveal the workspace that owns this worktree, not
  // the worktree's own checkout directory.
  const workspaceDirectory =
    workspace?.directory ??
    worktrees.find((wt) => wt.isMain)?.directory ??
    directory;

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
                <div className='mt-1 space-y-2 text-xs'>
                  {wt.branch && (
                    <Chip size='sm' variant='soft' color='accent'>
                      {wt.branch}
                    </Chip>
                  )}
                  <div className='ml-1 truncate font-mono text-xs'>{path}</div>
                  {wt.head && (
                    <span className='text-muted font-mono tabular-nums'>
                      {wt.head.slice(0, 7)}
                    </span>
                  )}
                </div>
              </div>

              {path && (
                <WorktreeActionsMenu
                  name={name}
                  path={path}
                  branch={wt.branch ?? null}
                  remote={remote}
                  isMain={Boolean(wt.isMain)}
                  workspaceDirectory={workspaceDirectory}
                  onDelete={() => setDeleteTarget(wt)}
                />
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

function WorktreeActionsMenu({
  name,
  path,
  branch,
  remote,
  isMain,
  workspaceDirectory,
  onDelete,
}: {
  name: string;
  path: string;
  branch: string | null;
  remote: string;
  isMain: boolean;
  workspaceDirectory: string;
  onDelete: () => void;
}) {
  const { t } = useI18n();
  const push = useGitPush();
  const pull = useGitPull();
  const fetch = useGitFetch();

  const busy = push.isPending || pull.isPending || fetch.isPending;

  const run = (
    mutation: { mutateAsync: (input: any) => Promise<unknown> },
    input: Record<string, unknown>,
    label: string,
  ) =>
    toastPromise(mutation.mutateAsync({ directory: path, ...input }), {
      loading: label,
      success: t.gitPanel.operationComplete(label),
      error: (error) => error.message || t.gitPanel.operationFailed(label),
    });

  return (
    <Dropdown size='sm'>
      <IconButton aria-label={t.workspace.worktreeActions(name)}>
        <Icon data={EllipsisVertical} />
      </IconButton>
      <Dropdown.Popover placement='bottom end'>
        <Dropdown.Menu aria-label={t.workspace.worktreeActions(name)}>
          <OpenIsolatedWorkspace directory={workspaceDirectory} />

          {branch && (
            <>
              <Dropdown.Item
                className='gap-1'
                isDisabled={busy}
                onPress={() =>
                  run(
                    push,
                    { branch, remote, setUpstream: true },
                    t.gitPanel.push,
                  )
                }
              >
                <Icon size={14} data={ArrowUp} />
                <Label>{t.gitPanel.push}</Label>
              </Dropdown.Item>
              <Dropdown.Item
                className='gap-1'
                isDisabled={busy}
                onPress={() => run(pull, { branch, remote }, t.gitPanel.pull)}
              >
                <Icon size={14} data={ArrowDown} />
                <Label>{t.gitPanel.pull}</Label>
              </Dropdown.Item>
            </>
          )}

          <Dropdown.Item
            className='gap-1'
            isDisabled={busy}
            onPress={() => run(fetch, { remote }, t.gitPanel.fetch)}
          >
            <Icon size={14} data={ArrowsRotateRight} />
            <Label>{t.gitPanel.fetch}</Label>
          </Dropdown.Item>

          {!isMain && (
            <>
              <Separator />
              <Dropdown.Item
                className='gap-1'
                variant='danger'
                onPress={onDelete}
              >
                <Icon
                  size={14}
                  data={TrashBin}
                  className='text-danger-soft-foreground'
                />
                <Label className='text-danger-soft-foreground! font-medium'>
                  {t.gitPanel.deleteWorktree}
                </Label>
              </Dropdown.Item>
            </>
          )}
        </Dropdown.Menu>
      </Dropdown.Popover>
    </Dropdown>
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
    const ok = await toastPromise(
      deleteWorktree.mutateAsync({
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
      }),
      {
        loading: t.workspace.deleteWorktree,
        success: t.workspace.worktreeDeleted,
        error: (error) => error.message || t.gitPanel.deleteWorktreeFailed,
      },
    );
    if (ok) onClose();
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
