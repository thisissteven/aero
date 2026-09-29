// app/components/chat-aside/changes/changes-panel.tsx
import {
  Button,
  Checkbox,
  Chip,
  cn,
  IconButton,
  Skeleton,
  TextArea,
  Tooltip,
  toast,
} from '@aero/ui';
import {
  ArrowRotateLeft,
  ArrowUpRightFromSquare,
  ChevronRight,
  CircleInfo,
  CodeMerge,
} from '@gravity-ui/icons';
import { Icon } from '@gravity-ui/uikit';
import { useEffect, useMemo, useState } from 'react';
import { openFileWhenReady } from '@/app/components/chat-aside/files/open-file-when-ready';
import { getPierreTheme } from '@/app/components/chat-aside/files/pierre-styles';
import { CodeBlock } from '@/app/components/code-block/code-block';
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
import { useTheme } from '@/app/providers';
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

type ChipColor = 'accent' | 'danger' | 'default' | 'success' | 'warning';

function changeBadge(
  entry: ChangeEntry,
  variant: 'staged' | 'working',
): { letter: string; color: ChipColor } {
  const code = (variant === 'staged' ? entry.index : entry.working) ?? ' ';
  const letter =
    entry.untracked || code === '?'
      ? 'A'
      : code.trim()
        ? code[0].toUpperCase()
        : 'M';
  const color: ChipColor =
    letter === 'A'
      ? 'accent'
      : letter === 'D'
        ? 'danger'
        : letter === 'M'
          ? 'warning'
          : 'default';
  return { letter, color };
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

function ChangeGroup({
  variant,
  directory,
  title,
  entries,
  selected,
  expandedKey,
  onToggle,
  onToggleExpanded,
  onOpenFile,
}: {
  variant: 'staged' | 'working';
  directory: string;
  title: string;
  entries: ChangeEntry[];
  selected: Set<string>;
  expandedKey: string | null;
  onToggle: (path: string) => void;
  onToggleExpanded: (key: string) => void;
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
          const entryKey = `${variant}:${entry.path}`;
          const isExpanded = expandedKey === entryKey;
          const { letter, color: badgeColor } = changeBadge(entry, variant);

          return (
            <li key={entry.path} className='overflow-hidden'>
              <div
                role='button'
                tabIndex={0}
                aria-expanded={isExpanded}
                onClick={() => onToggleExpanded(entryKey)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onToggleExpanded(entryKey);
                  }
                }}
                className={cn(
                  'group flex cursor-pointer items-center gap-2 rounded-md px-1 py-1.5 outline-none transition-colors duration-150',
                  'focus-visible:ring-2 focus-visible:ring-accent active:bg-default/60',
                  isExpanded ? 'bg-default/50' : 'hover:bg-default/40',
                )}
              >
                <Icon
                  data={ChevronRight}
                  size={12}
                  className={cn(
                    'text-muted shrink-0 transition-transform duration-150 ease-out motion-reduce:transition-none',
                    isExpanded && 'rotate-90',
                  )}
                />

                <div onClick={(e) => e.stopPropagation()}>
                  <Checkbox
                    variant='secondary'
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
                    {letter}
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
              </div>

              {isExpanded && (
                <ChangeDiffPanel
                  directory={directory}
                  entry={entry}
                  variant={variant}
                  onOpenFile={onOpenFile}
                />
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function buildNewFilePatch(filePath: string, contents: string): string {
  const body = contents.endsWith('\n') ? contents.slice(0, -1) : contents;
  const header = [
    `diff --git a/${filePath} b/${filePath}`,
    'new file mode 100644',
    '--- /dev/null',
    `+++ b/${filePath}`,
  ];

  if (!body.length) return header.join('\n');

  const lines = body.split('\n');
  return [
    ...header,
    `@@ -0,0 +1,${lines.length} @@`,
    lines.map((line) => `+${line}`).join('\n'),
  ].join('\n');
}

const CHANGE_DIFF_UNSAFE_CSS = `
:host {
  --diffs-bg-separator-override: var(--default) !important;
  --diffs-bg-context-override: transparent !important;
  --diffs-fg-number-override: var(--muted) !important;
}
`;

function ChangeDiffPanel({
  directory,
  entry,
  variant,
  onOpenFile,
}: {
  directory: string;
  entry: ChangeEntry;
  variant: 'staged' | 'working';
  onOpenFile: (path: string) => void;
}) {
  const { t } = useI18n();
  const { resolvedTheme, colorTheme } = useTheme();
  const staged = variant === 'staged';
  const isNew = entry.untracked;

  const { data: diffData, isLoading: diffLoading } = useGitDiff(
    directory,
    entry.path,
    staged,
    { enabled: !isNew },
  );
  const { data: fileData, isLoading: fileLoading } = useGitFileDiff(
    directory,
    entry.path,
    staged,
    { enabled: isNew },
  );

  const patch = useMemo(() => {
    if (isNew) {
      const modified =
        (fileData as { modified?: string } | null | undefined)?.modified ?? '';
      return buildNewFilePatch(entry.path, modified);
    }
    return (diffData as { diff?: string } | null | undefined)?.diff ?? '';
  }, [isNew, entry.path, fileData, diffData]);

  const pierreTheme = useMemo(() => getPierreTheme(colorTheme), [colorTheme]);
  const loading = isNew ? fileLoading : diffLoading;

  if (loading) {
    return (
      <div className='border-separator mt-1 mb-1.5 rounded-md border p-3'>
        <div className='space-y-1.5'>
          <Skeleton className='h-3.5 w-3/4 rounded' />
          <Skeleton className='h-3.5 w-full rounded' />
          <Skeleton className='h-3.5 w-2/3 rounded' />
        </div>
      </div>
    );
  }

  if (!patch.trim()) {
    return (
      <div className='border-separator text-muted mt-1 mb-1.5 flex items-center justify-center rounded-md border py-8 text-xs'>
        {t.changesPanel.noChangesToDisplay}
      </div>
    );
  }

  return (
    <div className='animate-in fade-in-0 mt-1 mb-1.5 duration-150 ease-out motion-reduce:animate-none'>
      <CodeBlock defaultViewMode='unified' className='rounded-md'>
        <CodeBlock.Header className='gap-2 pr-1 pl-2'>
          <div className='flex min-w-0 items-center gap-2 text-xs'>
            <FileTypeIcon filePath={entry.path} />
            <MiddleTruncatePath
              path={entry.path}
              className='text-muted text-xs'
              fileClassName='text-foreground text-xs'
            />
          </div>

          <div className='flex shrink-0 items-center'>
            <CodeBlock.ViewModeButton />
            <CodeBlock.WrapButton />
            <CodeBlock.CopyButton code={patch} />
            <CodeBlock.OpenButton
              aria-label={t.toolCall.openInEditor}
              onClick={() => onOpenFile(entry.path)}
            />
          </div>
        </CodeBlock.Header>

        <CodeBlock.Code
          code=''
          variant='diff'
          patch={patch}
          theme={pierreTheme.light}
          darkTheme={pierreTheme.dark}
          themeType={resolvedTheme}
          unsafeCSS={CHANGE_DIFF_UNSAFE_CSS}
          style={{ maxHeight: '45vh' }}
        />
      </CodeBlock>
    </div>
  );
}
