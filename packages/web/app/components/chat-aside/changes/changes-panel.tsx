// app/components/chat-aside/changes/changes-panel.tsx
import {
  Button,
  Checkbox,
  Chip,
  cn,
  IconButton,
  Modal,
  Skeleton,
  TextArea,
  Tooltip,
  toast,
} from '@aero/ui';
import {
  ArrowRotateLeft,
  ArrowUpRightFromSquare,
  CircleInfo,
  CodeMerge,
  Xmark,
} from '@gravity-ui/icons';
import { Icon } from '@gravity-ui/uikit';
import { useEffect, useMemo, useState } from 'react';
import { openFileWhenReady } from '@/app/components/chat-aside/files/open-file-when-ready';
import { GitDiffContent } from '@/app/components/chat-aside/git/git-diff-content';
import { FileTypeIcon } from '@/app/components/file-type-icon';
import { MiddleTruncatePath } from '@/app/components/tool-call-view/middle-truncate-path';
import {
  useGitCommit,
  useGitDiff,
  useGitErrorCode,
  useGitFileDiff,
  useGitStatus,
  useGitSummary,
} from '@/app/hooks/api/git';
import { useSessionDirectory } from '@/app/hooks/api/sessions';
import { useI18n } from '@/app/hooks/i18n';
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

interface DiffTarget {
  path: string;
  staged: boolean;
  untracked: boolean;
}

type DiffMode = 'diff' | 'source';

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
  summary: DiffStatEntry[],
): ChangeEntry[] {
  if (!status) return [];

  const stats =
    summary.length > 0
      ? new Map(summary.map((entry) => [entry.path, entry]))
      : mergeStats(status);

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
  const [diffTarget, setDiffTarget] = useState<DiffTarget | null>(null);

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

    try {
      await commitMutation.mutateAsync({
        directory,
        message: message.trim(),
        ...(addAll ? { addAll: true } : { files: Array.from(selected) }),
      });
      toast.success(t.changesPanel.commitCreated);
      setMessage('');
      setSelected(new Set());
      refetch();
    } catch (error) {
      toast.danger(
        error instanceof Error
          ? error.message
          : t.changesPanel.failedToCreateCommit,
      );
    }
  };

  const openFileInEditor = (path: string) => {
    if (!directory) return;
    const relative = toWorkspaceRelative(path, directory);
    useSidePanelStore.getState().setActiveNavItem('files');
    openFileWhenReady(relative);
  };

  const openDiff = (entry: ChangeEntry, variant: 'staged' | 'working') => {
    setDiffTarget({
      path: entry.path,
      staged: variant === 'staged',
      untracked: variant === 'working' && entry.untracked,
    });
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
              title={t.changesPanel.stagedChanges}
              entries={stagedEntries}
              selected={selected}
              onToggle={toggle}
              onOpen={openDiff}
              onOpenFile={openFileInEditor}
            />
            <ChangeGroup
              variant='working'
              title={t.changesPanel.workingChanges}
              entries={workingEntries}
              selected={selected}
              onToggle={toggle}
              onOpen={openDiff}
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
          className='text-sm w-full scrollbar-thin rounded-md text-xs px-2'
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

      <ChangesDiffModal
        directory={directory}
        target={diffTarget}
        onClose={() => setDiffTarget(null)}
      />
    </div>
  );
}

function ChangeGroup({
  variant,
  title,
  entries,
  selected,
  onToggle,
  onOpen,
  onOpenFile,
}: {
  variant: 'staged' | 'working';
  title: string;
  entries: ChangeEntry[];
  selected: Set<string>;
  onToggle: (path: string) => void;
  onOpen: (entry: ChangeEntry, variant: 'staged' | 'working') => void;
  onOpenFile: (path: string) => void;
}) {
  const { t } = useI18n();

  if (!entries.length) return null;

  return (
    <section className='mb-1'>
      <div className='text-muted flex items-center justify-between px-2 py-1 text-[10px] font-medium tracking-wide uppercase'>
        <span>{title}</span>
        <span className='tabular-nums'>{entries.length}</span>
      </div>

      <ul>
        {entries.map((entry) => {
          const isSelected = selected.has(entry.path);
          const badge =
            variant === 'staged'
              ? t.changesPanel.staged
              : entry.untracked
                ? t.changesPanel.new
                : t.changesPanel.modified;
          const badgeColor =
            variant === 'staged'
              ? 'success'
              : entry.untracked
                ? 'accent'
                : 'warning';

          return (
            <li
              key={entry.path}
              onClick={() => onOpen(entry, variant)}
              className='group hover:bg-default/40 flex cursor-pointer items-center gap-2 rounded-md px-1 py-1.5'
            >
              <div onClick={(e) => e.stopPropagation()}>
                <Checkbox
                  isSelected={isSelected}
                  onChange={() => onToggle(entry.path)}
                  aria-label={t.changesPanel.selectFile(entry.path)}
                >
                  <Checkbox.Content>
                    <Checkbox.Control>
                      <Checkbox.Indicator />
                    </Checkbox.Control>
                  </Checkbox.Content>
                </Checkbox>
              </div>

              <FileTypeIcon filePath={entry.path} />

              <div className='min-w-0 flex-1'>
                <MiddleTruncatePath
                  path={entry.path}
                  className='text-muted text-xs'
                  fileClassName='text-foreground text-xs'
                />
              </div>

              <div className='flex shrink-0 items-center gap-1.5 text-xs tabular-nums'>
                {entry.additions > 0 && (
                  <span className='text-success'>+{entry.additions}</span>
                )}
                {entry.deletions > 0 && (
                  <span className='text-danger'>-{entry.deletions}</span>
                )}
                <Chip
                  size='sm'
                  className='text-xs'
                  variant='soft'
                  color={badgeColor}
                >
                  {badge}
                </Chip>
              </div>

              <div onClick={(e) => e.stopPropagation()}>
                <Tooltip>
                  <Tooltip.Trigger>
                    <IconButton
                      aria-label={t.toolCall.openInEditor}
                      onPress={() => onOpenFile(entry.path)}
                    >
                      <Icon data={ArrowUpRightFromSquare} />
                    </IconButton>
                  </Tooltip.Trigger>
                  <Tooltip.Content>{t.toolCall.openInEditor}</Tooltip.Content>
                </Tooltip>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function ChangesDiffModal({
  directory,
  target,
  onClose,
}: {
  directory: string;
  target: DiffTarget | null;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const path = target?.path;
  const [mode, setMode] = useState<DiffMode>('diff');
  const [staged, setStaged] = useState(false);

  useEffect(() => {
    if (!target) return;
    setMode(target.untracked ? 'source' : 'diff');
    setStaged(target.staged);
  }, [target]);

  const { data: diffData, isLoading: diffLoading } = useGitDiff(
    directory,
    path,
    staged,
    { enabled: Boolean(path) && mode === 'diff' },
  );
  const { data: fileData, isLoading: fileLoading } = useGitFileDiff(
    directory,
    path,
    staged,
    { enabled: Boolean(path) && mode === 'source' },
  );

  const diff = (diffData as { diff?: string } | null | undefined)?.diff;
  const original =
    (fileData as { original?: string } | null | undefined)?.original ?? '';
  const modified =
    (fileData as { modified?: string } | null | undefined)?.modified ?? '';

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
                <Modal.Header className='flex items-center gap-2'>
                  <FileTypeIcon filePath={path ?? ''} />
                  <span className='min-w-0 flex-1 truncate font-mono text-sm'>
                    {path}
                  </span>
                  <div className='flex shrink-0 items-center gap-1'>
                    <Button
                      size='sm'
                      variant={mode === 'diff' ? 'secondary' : 'ghost'}
                      onPress={() => setMode('diff')}
                    >
                      {t.changesPanel.diff}
                    </Button>
                    <Button
                      size='sm'
                      variant={mode === 'source' ? 'secondary' : 'ghost'}
                      onPress={() => setMode('source')}
                    >
                      {t.changesPanel.source}
                    </Button>
                  </div>
                </Modal.Header>

                <Modal.Body>
                  {mode === 'diff' ? (
                    diffLoading ? (
                      <Skeleton className='h-40 w-full rounded' />
                    ) : (
                      <GitDiffContent
                        diff={diff}
                        emptyLabel={t.changesPanel.noChangesToDisplay}
                        className='max-h-[60vh]'
                      />
                    )
                  ) : fileLoading ? (
                    <Skeleton className='h-40 w-full rounded' />
                  ) : (
                    <div className='grid h-[50vh] grid-cols-1 gap-2 overflow-hidden sm:grid-cols-2'>
                      <SourcePane
                        label={t.changesPanel.original}
                        content={original}
                        emptyLabel={t.changesPanel.noChangesToDisplay}
                      />
                      <SourcePane
                        label={t.common.current}
                        content={modified}
                        emptyLabel={t.changesPanel.noChangesToDisplay}
                      />
                    </div>
                  )}
                </Modal.Body>

                <Modal.Footer>
                  <Button size='sm' variant='ghost' onPress={close}>
                    <Icon data={Xmark} size={14} />
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

function SourcePane({
  label,
  content,
  emptyLabel,
}: {
  label: string;
  content: string;
  emptyLabel: string;
}) {
  return (
    <div className='border-separator flex min-h-0 flex-col overflow-hidden rounded-md border'>
      <div className='border-separator text-muted shrink-0 border-b px-2 py-1 text-[10px] font-medium tracking-wide uppercase'>
        {label}
      </div>
      {content ? (
        <pre className='scrollbar-thin bg-default/40 min-h-0 flex-1 overflow-auto p-2 font-mono text-xs leading-relaxed whitespace-pre'>
          {content}
        </pre>
      ) : (
        <div className='text-muted flex min-h-24 flex-1 items-center justify-center p-4 text-center text-xs'>
          {emptyLabel}
        </div>
      )}
    </div>
  );
}
