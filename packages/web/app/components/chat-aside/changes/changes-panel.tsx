// app/components/chat-aside/changes/changes-panel.tsx
import {
  Button,
  Checkbox,
  Chip,
  cn,
  Modal,
  Skeleton,
  TextArea,
  toast,
} from '@aero/ui';
import { ArrowUpRightFromSquare, Check, Xmark } from '@gravity-ui/icons';
import { Icon } from '@gravity-ui/uikit';
import { useEffect, useMemo, useState } from 'react';

import { openFileWhenReady } from '@/app/components/chat-aside/files/open-file-when-ready';
import { FileTypeIcon } from '@/app/components/file-type-icon';
import { MiddleTruncatePath } from '@/app/components/tool-call-view/middle-truncate-path';
import { useGitCommit, useGitDiff, useGitStatus } from '@/app/hooks/api/git';
import { useSessionDirectory } from '@/app/hooks/api/sessions';
import { toWorkspaceRelative } from '@/app/lib/file';
import { useSidePanelStore } from '@/app/stores/side-panel-store';

interface DiffStatEntry {
  path: string;
  additions: number;
  deletions: number;
}

interface GitStatusFile {
  path: string;
  index: string;
  working_dir: string;
}

interface GitStatusShape {
  currentBranch?: string | null;
  files?: GitStatusFile[];
  diffStats?: {
    staged?: Record<string, DiffStatEntry>;
    working?: Record<string, DiffStatEntry>;
  };
  not_added?: string[];
}

interface ChangeEntry {
  path: string;
  index: string;
  working: string;
  staged: boolean;
  untracked: boolean;
  additions: number;
  deletions: number;
}

function mergeStats(status: GitStatusShape | null | undefined) {
  const merged = new Map<string, { additions: number; deletions: number }>();
  for (const bucketKey of ['staged', 'working'] as const) {
    const bucket = status?.diffStats?.[bucketKey];
    if (!bucket) continue;
    for (const entry of Object.values(bucket)) {
      const prev = merged.get(entry.path) ?? { additions: 0, deletions: 0 };
      merged.set(entry.path, {
        additions: prev.additions + entry.additions,
        deletions: prev.deletions + entry.deletions,
      });
    }
  }
  return merged;
}

function buildEntries(
  status: GitStatusShape | null | undefined,
): ChangeEntry[] {
  if (!status) return [];
  const stats = mergeStats(status);

  const entries: ChangeEntry[] = (status.files ?? []).map((file) => {
    const index = file.index ?? ' ';
    const working = file.working_dir ?? ' ';
    const untracked = index === '?' && working === '?';
    const staged = index !== ' ' && index !== '?';
    const stat = stats.get(file.path) ?? { additions: 0, deletions: 0 };
    return {
      path: file.path,
      index,
      working,
      staged,
      untracked,
      additions: stat.additions,
      deletions: stat.deletions,
    };
  });

  for (const untracked of status.not_added ?? []) {
    if (!entries.some((e) => e.path === untracked)) {
      entries.push({
        path: untracked,
        index: '?',
        working: '?',
        staged: false,
        untracked: true,
        additions: 0,
        deletions: 0,
      });
    }
  }

  return entries;
}

export function ChangesPanel() {
  const directory = useSessionDirectory();
  const { data, isLoading, refetch, isFetching } = useGitStatus(directory);
  const commitMutation = useGitCommit();

  const status = data as GitStatusShape | null | undefined;
  const entries = useMemo(() => buildEntries(status), [status]);

  const [message, setMessage] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [diffPath, setDiffPath] = useState<string | null>(null);

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

  const toggleAll = () => {
    if (selected.size === entries.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(entries.map((e) => e.path)));
    }
  };

  const handleCommit = async (addAll: boolean) => {
    if (!directory) return;
    if (!message.trim()) {
      toast.danger('Commit message is required');
      return;
    }

    try {
      await commitMutation.mutateAsync({
        directory,
        message: message.trim(),
        ...(addAll ? { addAll: true } : { files: Array.from(selected) }),
      });
      toast.success('Commit created');
      setMessage('');
      setSelected(new Set());
      refetch();
    } catch (error) {
      toast.danger(
        error instanceof Error ? error.message : 'Failed to create commit',
      );
    }
  };

  const openFileInEditor = (path: string) => {
    if (!directory) return;
    const relative = toWorkspaceRelative(path, directory);
    useSidePanelStore.getState().setActiveNavItem('files');
    openFileWhenReady(relative);
  };

  if (isLoading) {
    return (
      <div className='space-y-2 p-3'>
        <Skeleton className='h-6 w-full rounded' />
        <Skeleton className='h-6 w-full rounded' />
        <Skeleton className='h-6 w-2/3 rounded' />
      </div>
    );
  }

  return (
    <div className='flex h-full flex-col overflow-hidden'>
      <div className='border-separator flex items-center justify-between border-b px-3 py-2 text-sm'>
        <div className='flex items-center gap-2'>
          <span className='font-medium'>
            {entries.length} {entries.length === 1 ? 'change' : 'changes'}
          </span>
          {totalAdditions > 0 && (
            <span className='text-success text-xs'>+{totalAdditions}</span>
          )}
          {totalDeletions > 0 && (
            <span className='text-danger text-xs'>-{totalDeletions}</span>
          )}
        </div>

        <div className='flex items-center gap-1'>
          <Button
            size='sm'
            variant='ghost'
            onPress={toggleAll}
            isDisabled={!entries.length}
          >
            {selected.size === entries.length && entries.length > 0
              ? 'Deselect all'
              : 'Select all'}
          </Button>
          <Button
            size='sm'
            variant='ghost'
            isIconOnly
            onPress={() => refetch()}
            aria-label='Refresh'
          >
            <Icon
              data={Check}
              size={14}
              className={cn(isFetching && 'animate-pulse')}
            />
          </Button>
        </div>
      </div>

      <div className='min-h-0 flex-1 overflow-y-auto'>
        {entries.length === 0 ? (
          <div className='text-muted flex h-full items-center justify-center px-4 text-center text-sm'>
            Working tree clean
          </div>
        ) : (
          <ul className='p-1'>
            {entries.map((entry) => {
              const isSelected = selected.has(entry.path);
              const badge = entry.staged
                ? 'Staged'
                : entry.untracked
                  ? 'New'
                  : 'Modified';
              const badgeColor = entry.staged
                ? 'success'
                : entry.untracked
                  ? 'accent'
                  : 'warning';

              return (
                <li
                  key={entry.path}
                  className='hover:bg-default/40 flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5'
                  onClick={() => setDiffPath(entry.path)}
                >
                  <div onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      isSelected={isSelected}
                      onChange={() => toggle(entry.path)}
                      aria-label={`Select ${entry.path}`}
                    />
                  </div>

                  <FileTypeIcon filePath={entry.path} />

                  <div className='min-w-0 flex-1'>
                    <MiddleTruncatePath
                      path={entry.path}
                      className='text-muted text-xs'
                      fileClassName='text-foreground text-sm'
                    />
                  </div>

                  <div className='flex shrink-0 items-center gap-1.5 text-xs'>
                    {entry.additions > 0 && (
                      <span className='text-success'>+{entry.additions}</span>
                    )}
                    {entry.deletions > 0 && (
                      <span className='text-danger'>-{entry.deletions}</span>
                    )}
                    <Chip size='sm' variant='soft' color={badgeColor}>
                      {badge}
                    </Chip>
                  </div>

                  <button
                    type='button'
                    title='Open in editor'
                    onClick={(e) => {
                      e.stopPropagation();
                      openFileInEditor(entry.path);
                    }}
                    className='text-muted hover:text-foreground shrink-0 p-0.5'
                  >
                    <Icon data={ArrowUpRightFromSquare} size={12} />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className='border-separator shrink-0 border-t p-2'>
        <TextArea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder='Commit message'
          className='text-sm'
        />

        <div className='mt-2 flex items-center gap-2'>
          <Button
            size='sm'
            variant='primary'
            className='flex-1'
            onPress={() => handleCommit(false)}
            isPending={commitMutation.isPending}
            isDisabled={!message.trim() || selected.size === 0}
          >
            Commit {selected.size > 0 && `(${selected.size})`}
          </Button>
          <Button
            size='sm'
            variant='ghost'
            onPress={() => handleCommit(true)}
            isPending={commitMutation.isPending}
            isDisabled={!message.trim() || entries.length === 0}
          >
            Commit all
          </Button>
        </div>
      </div>

      <ChangesDiffModal
        directory={directory}
        path={diffPath}
        onClose={() => setDiffPath(null)}
      />
    </div>
  );
}

function ChangesDiffModal({
  directory,
  path,
  onClose,
}: {
  directory?: string;
  path: string | null;
  onClose: () => void;
}) {
  const { data, isLoading } = useGitDiff(directory, path ?? undefined);

  const lines = useMemo(() => {
    const raw = (data as { diff?: string } | null | undefined)?.diff ?? '';
    return raw.split('\n');
  }, [data]);

  return (
    <Modal
      isOpen={Boolean(path)}
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
                  <FileTypeIcon filePath={path ?? ''} />
                  <span className='truncate text-sm'>{path}</span>
                </Modal.Header>

                <Modal.Body>
                  {isLoading ? (
                    <Skeleton className='h-40 w-full rounded' />
                  ) : lines.length === 0 ||
                    (lines.length === 1 && !lines[0]) ? (
                    <div className='text-muted py-8 text-center text-sm'>
                      No changes to display
                    </div>
                  ) : (
                    <pre className='bg-default/40 scrollbar-thin overflow-x-auto rounded-md p-3 font-mono text-xs leading-relaxed'>
                      {lines.map((line, i) => (
                        <div
                          key={i}
                          className={cn(
                            'whitespace-pre',
                            line.startsWith('+') && !line.startsWith('+++')
                              ? 'text-success'
                              : line.startsWith('-') && !line.startsWith('---')
                                ? 'text-danger'
                                : line.startsWith('@@')
                                  ? 'text-accent'
                                  : 'text-muted',
                          )}
                        >
                          {line || ' '}
                        </div>
                      ))}
                    </pre>
                  )}
                </Modal.Body>

                <Modal.Footer>
                  <Button size='sm' variant='ghost' onPress={close}>
                    <Icon data={Xmark} size={14} />
                    Close
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
