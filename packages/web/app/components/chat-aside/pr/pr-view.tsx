// app/components/chat-aside/pr/pr-view.tsx
//
// The open-pull-request view: header with actions, and the Overview / Checks /
// Files / Conversation tabs.

import {
  Button,
  Chip,
  Dropdown,
  Input,
  Label,
  TextArea,
  toast,
} from '@aero/ui';
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
import { toastPromise } from '@/app/lib/toast';

import { PrChecks } from './pr-checks';
import { PrConversation } from './pr-conversation';
import { PrFiles } from './pr-files';
import {
  AvatarBadge,
  ChecksChip,
  MarkdownBlock,
  SectionTabs,
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
    owner: pr.sourceRepo?.owner,
    repo: pr.sourceRepo?.repo,
  });
  const contextData = context.data as GitHubPullContext | null | undefined;
  const mergeMutation = useGitHubMergePr();
  const readyMutation = useGitHubMarkPrReady();

  const checks: CheckRunSummary | null | undefined =
    contextData?.checks ?? status.checks;
  const reviewCount = contextData?.reviewComments?.length ?? 0;
  const commentCount = contextData?.issueComments?.length ?? 0;

  const merge = async (method: MergeMethod) => {
    const ok = await toastPromise(
      mergeMutation.mutateAsync({
        directory,
        number: pr.number,
        method,
      }),
      {
        loading: t.pullRequest.merge,
        success: (result) =>
          result.merged === false
            ? result.message || t.pullRequest.mergeBlocked
            : t.pullRequest.merged,
        error: (error) => error.message || t.pullRequest.mergeFailed,
      },
    );
    if (ok) onChanged();
  };

  const markReady = async () => {
    const ok = await toastPromise(
      readyMutation.mutateAsync({ directory, number: pr.number }),
      {
        loading: t.pullRequest.markReady,
        success: t.pullRequest.markReady,
        error: (error) => error.message || t.pullRequest.markReadyFailed,
      },
    );
    if (ok) onChanged();
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
            className='gap-1.5 rounded-lg'
            onPress={() => setEditing((value) => !value)}
          >
            <Icon data={Pencil} size={12} />
            {t.pullRequest.edit}
          </Button>

          {pr.draft && (
            <Button
              size='sm'
              variant='secondary'
              className='rounded-lg'
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
                  className='gap-1.5 rounded-lg'
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
          <SectionTabs
            ariaLabel={t.pullRequest.overview}
            active={tab}
            onChange={setTab}
            tabs={[
              { id: 'overview', label: t.pullRequest.overview },
              {
                id: 'checks',
                label: t.pullRequest.checksTab,
                count: checks?.total,
              },
              {
                id: 'files',
                label: t.pullRequest.files,
                count: contextData?.files?.length,
              },
              {
                id: 'conversation',
                label: t.pullRequest.conversation,
                count: reviewCount + commentCount,
              },
            ]}
          />

          <div className='scrollbar-thin min-h-0 flex-1 overflow-y-auto'>
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
    const ok = await toastPromise(
      updateMutation.mutateAsync({
        directory,
        number,
        title: title.trim(),
        body: body.trim() || undefined,
      }),
      {
        loading: t.pullRequest.save,
        success: t.pullRequest.updated,
        error: (error) => error.message || t.pullRequest.updateFailed,
      },
    );
    if (ok) onDone();
  };

  return (
    <div className='scrollbar-thin min-h-0 flex-1 space-y-3 overflow-y-auto p-3'>
      <div className='flex items-center justify-between'>
        <span className='text-sm font-medium'>{t.pullRequest.editTitle}</span>
      </div>
      <Input
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        className='h-8 w-full px-2.5 text-sm rounded-md'
      />
      <TextArea
        value={body}
        onChange={(event) => setBody(event.target.value)}
        className='scrollbar-thin min-h-40 w-full resize-none rounded-md text-sm'
        rows={12}
      />
      <div className='flex items-center gap-2'>
        <Button
          size='sm'
          variant='primary'
          className='rounded-lg'
          isPending={updateMutation.isPending}
          onPress={save}
        >
          {t.pullRequest.save}
        </Button>
        <Button
          size='sm'
          variant='ghost'
          className='rounded-lg'
          onPress={onCancel}
        >
          {t.pullRequest.cancel}
        </Button>
      </div>
    </div>
  );
}
