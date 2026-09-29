// app/components/chat-aside/pr/pr-view.tsx
//
// The open-pull-request view: header with actions, and the Overview / Checks /
// Files / Conversation tabs.

import { Button, Chip, Dropdown, Label, Tabs, TextArea, toast } from '@aero/ui';
import {
  ArrowUpRightFromSquare,
  CodeMerge,
  Pencil,
  TriangleExclamation,
} from '@gravity-ui/icons';
import { Icon } from '@gravity-ui/uikit';
import { useState } from 'react';

import {
  useGitHubMarkPrReady,
  useGitHubMergePr,
  useGitHubPullContext,
  useGitHubUpdatePr,
} from '@/app/hooks/api/github';
import { useI18n } from '@/app/hooks/i18n';

import { PrChecks } from './pr-checks';
import { PrConversation } from './pr-conversation';
import { PrFiles } from './pr-files';
import {
  AvatarBadge,
  ChecksChip,
  MarkdownBlock,
  StateChip,
  TimeAgo,
} from './shared';
import type {
  CheckRunSummary,
  GitHubPrStatus,
  GitHubPullContext,
} from './types';
import { displayName } from './util';

type MergeMethod = 'merge' | 'squash' | 'rebase';

export function PrView({
  directory,
  status,
  onChanged,
}: {
  directory: string;
  status: GitHubPrStatus;
  onChanged: () => void;
}) {
  const { t } = useI18n();
  const pr = status.pr!;
  const [tab, setTab] = useState<
    'overview' | 'checks' | 'files' | 'conversation'
  >('overview');
  const [editing, setEditing] = useState(false);

  const context = useGitHubPullContext(directory, pr.number, {
    checkDetails: tab === 'checks',
    enabled: true,
  });
  const contextData = context.data as GitHubPullContext | null | undefined;
  const mergeMutation = useGitHubMergePr();
  const readyMutation = useGitHubMarkPrReady();

  const checks: CheckRunSummary | null | undefined =
    contextData?.checks ?? status.checks;
  const reviewCount = contextData?.reviewComments?.length ?? 0;
  const commentCount = contextData?.issueComments?.length ?? 0;

  const merge = async (method: MergeMethod) => {
    try {
      const result = await mergeMutation.mutateAsync({
        directory,
        number: pr.number,
        method,
      });
      if (result.merged === false) {
        toast.warning(result.message || t.pullRequest.mergeBlocked);
      } else {
        toast.success(t.pullRequest.merged);
      }
      onChanged();
    } catch (error) {
      toast.danger(
        error instanceof Error ? error.message : t.pullRequest.mergeFailed,
      );
    }
  };

  const markReady = async () => {
    try {
      await readyMutation.mutateAsync({ directory, number: pr.number });
      toast.success(t.pullRequest.markReady);
      onChanged();
    } catch (error) {
      toast.danger(
        error instanceof Error ? error.message : t.pullRequest.markReadyFailed,
      );
    }
  };

  const canMerge = status.canMerge !== false && pr.state === 'open';

  return (
    <div className='flex h-full min-h-0 flex-col'>
      <div className='border-separator border-b p-3'>
        <div className='flex items-start gap-2'>
          <span className='text-muted shrink-0 pt-0.5 font-mono text-xs'>
            #{pr.number}
          </span>
          <div className='min-w-0 flex-1 text-sm font-medium'>{pr.title}</div>
          <a
            href={pr.url}
            target='_blank'
            rel='noopener noreferrer'
            aria-label={t.pullRequest.openOnGitHub}
            className='text-muted hover:text-foreground shrink-0 pt-0.5'
          >
            <Icon data={ArrowUpRightFromSquare} size={12} />
          </a>
        </div>

        <div className='mt-2 flex flex-wrap items-center gap-1.5'>
          <StateChip state={pr.state} />
          {pr.draft && (
            <Chip size='sm' variant='soft' color='default'>
              {t.pullRequest.draft}
            </Chip>
          )}
          {checks && <ChecksChip summary={checks} />}
        </div>

        <div className='text-muted mt-2 flex items-center gap-2 text-xs'>
          <AvatarBadge user={pr.author} size='sm' />
          <span>{pr.author ? displayName(pr.author) : ''}</span>
          <TimeAgo value={pr.createdAt ?? pr.updatedAt} />
          {pr.base && pr.head && (
            <span className='ml-auto truncate font-mono'>
              {pr.head} → {pr.base}
            </span>
          )}
        </div>

        <div className='mt-3 flex items-center gap-2'>
          <Button
            size='sm'
            variant='secondary'
            className='gap-1.5'
            onPress={() => setEditing((value) => !value)}
          >
            <Icon data={Pencil} size={12} />
            {t.pullRequest.edit}
          </Button>

          {pr.draft && (
            <Button
              size='sm'
              variant='secondary'
              isPending={readyMutation.isPending}
              onPress={markReady}
            >
              {t.pullRequest.markReady}
            </Button>
          )}

          {canMerge && (
            <Dropdown size='sm'>
              <Dropdown.Trigger
                aria-label={t.pullRequest.mergePullRequest}
                className='inline-flex'
              >
                <Button
                  size='sm'
                  variant='primary'
                  className='gap-1.5'
                  isPending={mergeMutation.isPending}
                >
                  <Icon data={CodeMerge} size={12} />
                  {t.pullRequest.merge}
                </Button>
              </Dropdown.Trigger>
              <Dropdown.Popover placement='bottom end'>
                <Dropdown.Menu
                  onAction={(key) => void merge(key as MergeMethod)}
                >
                  <Dropdown.Item
                    id='merge'
                    textValue={t.pullRequest.mergeCommit}
                  >
                    <Label>{t.pullRequest.mergeCommit}</Label>
                  </Dropdown.Item>
                  <Dropdown.Item
                    id='squash'
                    textValue={t.pullRequest.mergeSquash}
                  >
                    <Label>{t.pullRequest.mergeSquash}</Label>
                  </Dropdown.Item>
                  <Dropdown.Item
                    id='rebase'
                    textValue={t.pullRequest.mergeRebase}
                  >
                    <Label>{t.pullRequest.mergeRebase}</Label>
                  </Dropdown.Item>
                </Dropdown.Menu>
              </Dropdown.Popover>
            </Dropdown>
          )}
        </div>

        {pr.mergeable === false && (
          <div className='text-warning mt-2 flex items-center gap-1.5 text-xs'>
            <Icon data={TriangleExclamation} size={12} />
            {t.pullRequest.mergeConflictsOrChecksPending}
          </div>
        )}
      </div>

      {editing ? (
        <EditForm
          directory={directory}
          number={pr.number}
          title={pr.title}
          body={pr.body ?? ''}
          onDone={() => {
            setEditing(false);
            onChanged();
          }}
          onCancel={() => setEditing(false)}
        />
      ) : (
        <>
          <Tabs
            selectedKey={tab}
            onSelectionChange={(key) => setTab(key as typeof tab)}
            className='border-separator shrink-0 border-b px-1'
          >
            <Tabs.ListContainer>
              <Tabs.List aria-label={t.pullRequest.overview}>
                <Tabs.Tab id='overview'>
                  {t.pullRequest.overview}
                  <Tabs.Indicator />
                </Tabs.Tab>
                <Tabs.Tab id='checks'>
                  {t.pullRequest.checksTab}
                  {checks && checks.total > 0 ? ` (${checks.total})` : ''}
                  <Tabs.Indicator />
                </Tabs.Tab>
                <Tabs.Tab id='files'>
                  {t.pullRequest.files}
                  {contextData?.files?.length
                    ? ` (${contextData.files.length})`
                    : ''}
                  <Tabs.Indicator />
                </Tabs.Tab>
                <Tabs.Tab id='conversation'>
                  {t.pullRequest.conversation}
                  {reviewCount + commentCount > 0
                    ? ` (${reviewCount + commentCount})`
                    : ''}
                  <Tabs.Indicator />
                </Tabs.Tab>
              </Tabs.List>
            </Tabs.ListContainer>
          </Tabs>

          <div className='min-h-0 flex-1 overflow-y-auto'>
            {tab === 'overview' && (
              <OverviewTab
                body={pr.body}
                checks={checks}
                mergeable={pr.mergeable}
              />
            )}
            {tab === 'checks' && (
              <PrChecks
                summary={checks}
                runs={contextData?.checkRuns}
                isLoading={context.isLoading}
              />
            )}
            {tab === 'files' && (
              <PrFiles
                files={contextData?.files}
                isLoading={context.isLoading}
              />
            )}
            {tab === 'conversation' && (
              <PrConversation
                issueComments={contextData?.issueComments}
                reviewComments={contextData?.reviewComments}
                isLoading={context.isLoading}
              />
            )}
          </div>
        </>
      )}
    </div>
  );
}

function OverviewTab({
  body,
  checks,
  mergeable,
}: {
  body?: string;
  checks?: CheckRunSummary | null;
  mergeable?: boolean | null;
}) {
  const { t } = useI18n();

  if (checks?.state === 'failure') {
    return (
      <div className='space-y-3 p-3'>
        <div className='border-separator bg-default/30 rounded-lg border p-3'>
          <MarkdownBlock>{body}</MarkdownBlock>
          {!body?.trim() && (
            <span className='text-muted text-xs'>
              {t.pullRequest.noDescription}
            </span>
          )}
        </div>
        <div className='border-danger/40 bg-danger/5 text-danger flex items-center gap-2 rounded-lg border p-3 text-xs'>
          <Icon data={TriangleExclamation} size={14} />
          {t.pullRequest.someChecksFailed}
        </div>
      </div>
    );
  }

  return (
    <div className='space-y-3 p-3'>
      <div className='border-separator bg-default/30 rounded-lg border p-3'>
        {body?.trim() ? (
          <MarkdownBlock>{body}</MarkdownBlock>
        ) : (
          <span className='text-muted text-xs'>
            {t.pullRequest.noDescription}
          </span>
        )}
      </div>

      {checks && checks.total > 0 && (
        <div className='border-separator bg-default/30 rounded-lg border p-3'>
          <div className='mb-2 flex items-center justify-between'>
            <span className='text-sm font-medium'>{t.pullRequest.checks}</span>
            <ChecksChip summary={checks} />
          </div>
          <div className='grid grid-cols-3 gap-2 text-center text-xs'>
            <Stat
              label={t.pullRequest.passed}
              value={checks.success}
              tone='success'
            />
            <Stat
              label={t.pullRequest.failed}
              value={checks.failure}
              tone='danger'
            />
            <Stat
              label={t.pullRequest.pending}
              value={checks.pending}
              tone='warning'
            />
          </div>
        </div>
      )}

      {mergeable === true && (
        <div className='text-muted flex items-center gap-2 text-xs'>
          <span className='bg-success size-1.5 rounded-full' />
          {t.pullRequest.readyToMerge}
        </div>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: 'success' | 'danger' | 'warning';
}) {
  const colorClass =
    tone === 'success'
      ? 'text-success'
      : tone === 'danger'
        ? 'text-danger'
        : 'text-warning';
  return (
    <div className='bg-default/40 rounded-md py-1.5'>
      <div className={`text-sm font-semibold ${colorClass}`}>{value}</div>
      <div className='text-muted text-[10px] tracking-wide uppercase'>
        {label}
      </div>
    </div>
  );
}

function EditForm({
  directory,
  number,
  title: initialTitle,
  body: initialBody,
  onDone,
  onCancel,
}: {
  directory: string;
  number: number;
  title: string;
  body: string;
  onDone: () => void;
  onCancel: () => void;
}) {
  const { t } = useI18n();
  const [title, setTitle] = useState(initialTitle);
  const [body, setBody] = useState(initialBody);
  const updateMutation = useGitHubUpdatePr();

  const save = async () => {
    if (!title.trim()) {
      toast.danger(t.pullRequest.titleRequired);
      return;
    }
    try {
      await updateMutation.mutateAsync({
        directory,
        number,
        title: title.trim(),
        body: body.trim() || undefined,
      });
      toast.success(t.pullRequest.updated);
      onDone();
    } catch (error) {
      toast.danger(
        error instanceof Error ? error.message : t.pullRequest.updateFailed,
      );
    }
  };

  return (
    <div className='min-h-0 flex-1 space-y-3 overflow-y-auto p-3'>
      <div className='flex items-center justify-between'>
        <span className='text-sm font-medium'>{t.pullRequest.editTitle}</span>
      </div>
      <input
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        className='border-separator bg-default/30 text-foreground focus:border-accent w-full rounded-md border px-2.5 py-1.5 text-sm outline-none'
      />
      <TextArea
        value={body}
        onChange={(event) => setBody(event.target.value)}
        className='scrollbar-thin min-h-40 w-full rounded-md text-sm'
        rows={12}
      />
      <div className='flex items-center gap-2'>
        <Button
          size='sm'
          variant='primary'
          isPending={updateMutation.isPending}
          onPress={save}
        >
          {t.pullRequest.save}
        </Button>
        <Button size='sm' variant='ghost' onPress={onCancel}>
          {t.pullRequest.cancel}
        </Button>
      </div>
    </div>
  );
}
