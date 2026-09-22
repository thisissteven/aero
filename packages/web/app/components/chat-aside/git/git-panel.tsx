// app/components/chat-aside/git/git-panel.tsx
import {
  Button,
  Chip,
  cn,
  Input,
  Label,
  Modal,
  Skeleton,
  Tabs,
  TextField,
  Tooltip,
  toast,
} from '@aero/ui';
import {
  ArrowDown,
  ArrowsRotateRight,
  ArrowUp,
  Check,
  CircleTree,
  Plus,
  TrashBin,
} from '@gravity-ui/icons';
import { Icon } from '@gravity-ui/uikit';
import { useState } from 'react';

import {
  useGitBranches,
  useGitCheckout,
  useGitCurrentBranch,
  useGitFetch,
  useGitPull,
  useGitPush,
  useGitRemotes,
  useGitRemoveRemote,
  useGitStashApply,
  useGitStashDrop,
  useGitStashes,
  useGitStashPop,
  useGitStashPush,
  useGitStatus,
  useGitWorktrees,
} from '@/app/hooks/api/git';
import { useSessionDirectory } from '@/app/hooks/api/sessions';

export function GitPanel() {
  const directory = useSessionDirectory();

  return (
    <div className='flex h-full flex-col overflow-hidden'>
      <BranchHeader directory={directory} />

      <Tabs
        defaultSelectedKey='branches'
        variant='secondary'
        className='flex flex-1 min-h-0 flex-col'
      >
        <Tabs.ListContainer className='shrink-0'>
          <Tabs.List aria-label='Git sections' className='px-2'>
            <Tabs.Tab id='branches'>
              <Tabs.Indicator />
              Branches
            </Tabs.Tab>
            <Tabs.Tab id='stashes'>
              <Tabs.Indicator />
              Stashes
            </Tabs.Tab>
            <Tabs.Tab id='worktrees'>
              <Tabs.Indicator />
              Worktrees
            </Tabs.Tab>
            <Tabs.Tab id='remotes'>
              <Tabs.Indicator />
              Remotes
            </Tabs.Tab>
          </Tabs.List>
        </Tabs.ListContainer>

        <Tabs.Panel
          id='branches'
          className='flex-1 min-h-0 overflow-y-auto p-0'
        >
          <BranchesTab directory={directory} />
        </Tabs.Panel>
        <Tabs.Panel id='stashes' className='flex-1 min-h-0 overflow-y-auto p-0'>
          <StashesTab directory={directory} />
        </Tabs.Panel>
        <Tabs.Panel
          id='worktrees'
          className='flex-1 min-h-0 overflow-y-auto p-0'
        >
          <WorktreesTab directory={directory} />
        </Tabs.Panel>
        <Tabs.Panel id='remotes' className='flex-1 min-h-0 overflow-y-auto p-0'>
          <RemotesTab directory={directory} />
        </Tabs.Panel>
      </Tabs>
    </div>
  );
}

function BranchHeader({ directory }: { directory?: string }) {
  const { data: statusData } = useGitStatus(directory);
  const { data: branchData } = useGitCurrentBranch(directory);

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

  const busy = pull.isPending || push.isPending || fetch.isPending;

  const run = async (
    mutation: { mutateAsync: (input: any) => Promise<unknown> },
    label: string,
  ) => {
    if (!directory) return;
    try {
      await mutation.mutateAsync({ directory });
      toast.success(`${label} complete`);
    } catch (error) {
      toast.danger(error instanceof Error ? error.message : `${label} failed`);
    }
  };

  return (
    <div className='border-separator shrink-0 border-b px-3 py-2'>
      <div className='flex items-center gap-2'>
        <Icon data={CircleTree} size={14} className='text-accent shrink-0' />
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
      </div>

      {status?.tracking && (
        <div className='text-muted mt-0.5 truncate pl-5 text-xs'>
          → {status.tracking}
        </div>
      )}

      <div className='mt-2 flex items-center gap-1.5'>
        <Button
          size='sm'
          variant='ghost'
          className='flex-1'
          isDisabled={!directory || busy}
          onPress={() => run(pull, 'Pull')}
        >
          <Icon data={ArrowDown} size={12} />
          Pull
        </Button>
        <Button
          size='sm'
          variant='ghost'
          className='flex-1'
          isDisabled={!directory || busy}
          onPress={() => run(push, 'Push')}
        >
          <Icon data={ArrowUp} size={12} />
          Push
        </Button>
        <Button
          size='sm'
          variant='ghost'
          className='flex-1'
          isDisabled={!directory || busy}
          onPress={() => run(fetch, 'Fetch')}
        >
          <Icon
            data={ArrowsRotateRight}
            size={12}
            className={cn(fetch.isPending && 'animate-spin')}
          />
          Fetch
        </Button>
      </div>
    </div>
  );
}

function BranchesTab({ directory }: { directory?: string }) {
  const { data, isLoading } = useGitBranches(directory);
  const checkout = useGitCheckout();
  const [isCreateOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState('');

  if (isLoading) return <ListSkeleton />;
  if (!data) return <EmptyState label='No branches' />;

  const branches =
    (
      data as {
        branches?: Array<{
          name: string;
          current: boolean;
          commit: string;
          label: string;
        }>;
      }
    ).branches ?? [];

  const handleCheckout = async (name: string) => {
    if (!directory || checkout.isPending) return;
    try {
      await checkout.mutateAsync({ directory, target: name });
      toast.success(`Switched to ${name}`);
    } catch (error) {
      toast.danger(error instanceof Error ? error.message : 'Checkout failed');
    }
  };

  const handleCreate = async () => {
    const target = newName.trim();
    if (!directory || !target) return;
    try {
      await checkout.mutateAsync({
        directory,
        target,
        createBranch: true,
      });
      toast.success(`Created ${target}`);
      setNewName('');
      setCreateOpen(false);
    } catch (error) {
      toast.danger(
        error instanceof Error ? error.message : 'Branch creation failed',
      );
    }
  };

  return (
    <div className='p-1'>
      <div className='flex justify-end px-1 py-1'>
        <Button size='sm' variant='ghost' onPress={() => setCreateOpen(true)}>
          <Icon data={Plus} size={12} />
          New branch
        </Button>
      </div>

      <ul>
        {branches.map((branch) => (
          <li
            key={branch.name}
            className={cn(
              'hover:bg-default/40 flex items-center gap-2 rounded-md px-2 py-1.5 text-sm',
              !branch.current && 'cursor-pointer',
            )}
            onClick={() => {
              if (!branch.current) handleCheckout(branch.name);
            }}
          >
            <Icon
              data={CircleTree}
              size={12}
              className={cn(
                'shrink-0',
                branch.current ? 'text-accent' : 'text-muted',
              )}
            />
            <span
              className={cn(
                'min-w-0 flex-1 truncate',
                branch.current && 'font-medium',
              )}
            >
              {branch.name}
            </span>
            {branch.commit && (
              <span className='text-muted shrink-0 font-mono text-xs'>
                {branch.commit.slice(0, 7)}
              </span>
            )}
            {branch.current && (
              <Chip size='sm' variant='soft' color='success'>
                Current
              </Chip>
            )}
          </li>
        ))}
      </ul>

      <Modal isOpen={isCreateOpen} onOpenChange={setCreateOpen}>
        <Modal.Backdrop>
          <Modal.Container>
            <Modal.Dialog>
              {({ close }) => (
                <>
                  <Modal.Header>Create branch</Modal.Header>
                  <Modal.Body>
                    <TextField>
                      <Label>Branch name</Label>
                      <Input
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        placeholder='feature/my-thing'
                      />
                    </TextField>
                  </Modal.Body>
                  <Modal.Footer>
                    <Button size='sm' variant='ghost' onPress={close}>
                      Cancel
                    </Button>
                    <Button
                      size='sm'
                      variant='primary'
                      onPress={handleCreate}
                      isPending={checkout.isPending}
                      isDisabled={!newName.trim()}
                    >
                      Create
                    </Button>
                  </Modal.Footer>
                </>
              )}
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>
    </div>
  );
}

function StashesTab({ directory }: { directory?: string }) {
  const { data, isLoading } = useGitStashes(directory);
  const push = useGitStashPush();
  const apply = useGitStashApply();
  const pop = useGitStashPop();
  const drop = useGitStashDrop();

  const [message, setMessage] = useState('');

  if (isLoading) return <ListSkeleton />;

  const stashes =
    (
      data as
        | {
            stashes?: Array<{
              ref: string;
              message: string;
              relativeTime: string;
            }>;
          }
        | null
        | undefined
    )?.stashes ?? [];

  const run = async (
    mutation: { mutateAsync: (input: any) => Promise<unknown> },
    input: Record<string, unknown>,
    label: string,
  ) => {
    if (!directory) return;
    try {
      await mutation.mutateAsync({ directory, ...input });
      toast.success(`${label} complete`);
    } catch (error) {
      toast.danger(error instanceof Error ? error.message : `${label} failed`);
    }
  };

  return (
    <div className='space-y-2 p-2'>
      <div className='flex items-center gap-2'>
        <Input
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder='Stash message (optional)'
        />
        <Button
          size='sm'
          variant='primary'
          onPress={() => {
            void run(push, { message: message.trim() || undefined }, 'Stash');
            setMessage('');
          }}
          isPending={push.isPending}
        >
          Stash
        </Button>
      </div>

      {stashes.length === 0 ? (
        <EmptyState label='No stashes' />
      ) : (
        <ul className='space-y-1'>
          {stashes.map((stash) => (
            <li
              key={stash.ref}
              className='bg-default/40 flex items-center gap-2 rounded-md px-2 py-1.5 text-sm'
            >
              <div className='min-w-0 flex-1'>
                <div className='truncate font-medium'>{stash.ref}</div>
                <div className='text-muted truncate text-xs'>
                  {stash.message} · {stash.relativeTime}
                </div>
              </div>

              <Tooltip>
                <Tooltip.Trigger>
                  <Button
                    size='sm'
                    variant='ghost'
                    isIconOnly
                    onPress={() =>
                      run(apply, { ref: stash.ref }, 'Apply stash')
                    }
                  >
                    <Icon data={Check} size={12} />
                  </Button>
                </Tooltip.Trigger>
                <Tooltip.Content>Apply</Tooltip.Content>
              </Tooltip>
              <Tooltip>
                <Tooltip.Trigger>
                  <Button
                    size='sm'
                    variant='ghost'
                    isIconOnly
                    onPress={() => run(pop, { ref: stash.ref }, 'Pop stash')}
                  >
                    <Icon data={ArrowUp} size={12} />
                  </Button>
                </Tooltip.Trigger>
                <Tooltip.Content>Pop</Tooltip.Content>
              </Tooltip>
              <Tooltip>
                <Tooltip.Trigger>
                  <Button
                    size='sm'
                    variant='danger'
                    isIconOnly
                    onPress={() => run(drop, { ref: stash.ref }, 'Drop stash')}
                  >
                    <Icon data={TrashBin} size={12} />
                  </Button>
                </Tooltip.Trigger>
                <Tooltip.Content>Drop</Tooltip.Content>
              </Tooltip>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function WorktreesTab({ directory }: { directory?: string }) {
  const { data, isLoading } = useGitWorktrees(directory);

  if (isLoading) return <ListSkeleton />;
  if (!data) return <EmptyState label='No worktrees' />;

  const worktrees = Array.isArray(data)
    ? data
    : ((data as { worktrees?: unknown[] }).worktrees ?? []);

  if (!worktrees.length) return <EmptyState label='No worktrees' />;

  return (
    <ul className='space-y-1 p-2'>
      {(
        worktrees as Array<{
          path?: string;
          branch?: string;
          head?: string;
        }>
      ).map((wt, i) => (
        <li
          key={wt.path ?? i}
          className='bg-default/40 rounded-md px-2 py-1.5 text-sm'
        >
          <div className='truncate font-mono text-xs'>{wt.path}</div>
          <div className='mt-0.5 flex items-center gap-2 text-xs'>
            {wt.branch && (
              <Chip size='sm' variant='soft' color='accent'>
                {wt.branch}
              </Chip>
            )}
            {wt.head && (
              <span className='text-muted font-mono'>
                {wt.head.slice(0, 7)}
              </span>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}

function RemotesTab({ directory }: { directory?: string }) {
  const { data, isLoading } = useGitRemotes(directory);
  const removeRemote = useGitRemoveRemote();

  if (isLoading) return <ListSkeleton />;
  if (!data) return <EmptyState label='No remotes' />;

  const remotes = Array.isArray(data) ? data : [];
  if (!remotes.length) return <EmptyState label='No remotes' />;

  return (
    <ul className='space-y-1 p-2'>
      {(
        remotes as Array<{
          name: string;
          refs?: { fetch?: string; push?: string };
        }>
      ).map((remote) => (
        <li
          key={remote.name}
          className='bg-default/40 flex items-center gap-2 rounded-md px-2 py-1.5 text-sm'
        >
          <div className='min-w-0 flex-1'>
            <div className='font-medium'>{remote.name}</div>
            {remote.refs?.fetch && (
              <div className='text-muted truncate text-xs'>
                {remote.refs.fetch}
              </div>
            )}
          </div>
          <Tooltip>
            <Tooltip.Trigger>
              <Button
                size='sm'
                variant='danger'
                isIconOnly
                onPress={async () => {
                  if (!directory) return;
                  try {
                    await removeRemote.mutateAsync({
                      directory,
                      remote: remote.name,
                    });
                    toast.success(`Removed ${remote.name}`);
                  } catch (error) {
                    toast.danger(
                      error instanceof Error
                        ? error.message
                        : 'Remove remote failed',
                    );
                  }
                }}
              >
                <Icon data={TrashBin} size={12} />
              </Button>
            </Tooltip.Trigger>
            <Tooltip.Content>Remove remote</Tooltip.Content>
          </Tooltip>
        </li>
      ))}
    </ul>
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
