// app/components/chat-aside/pr/issues-panel.tsx

import { Button, Input, Skeleton } from '@aero/ui';
import { ArrowLeft, ArrowUpRightFromSquare, Comment } from '@gravity-ui/icons';
import { Icon } from '@gravity-ui/uikit';
import { useEffect, useState } from 'react';

import {
  useGitHubIssue,
  useGitHubIssueComments,
  useGitHubIssueList,
} from '@/app/hooks/api/github';
import { useI18n } from '@/app/hooks/i18n';

import {
  AvatarBadge,
  LabelPill,
  MarkdownBlock,
  SectionEmpty,
  StateChip,
  TimeAgo,
} from './shared';
import type {
  GitHubIssue,
  GitHubIssueComments,
  GitHubIssueList,
  IssueSummary,
} from './types';
import { displayName } from './util';

export function IssuesPanel({ directory }: { directory: string }) {
  const { t } = useI18n();
  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<number | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebounced(query.trim());
      setPage(1);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [query]);

  const listQuery = useGitHubIssueList(directory, debounced, page);
  const data = listQuery.data as GitHubIssueList | null | undefined;
  const isLoading = listQuery.isLoading;

  if (selected !== null) {
    return (
      <IssueDetail
        directory={directory}
        number={selected}
        onBack={() => setSelected(null)}
      />
    );
  }

  const issues = data?.issues ?? [];

  return (
    <div className='flex h-full min-h-0 flex-col'>
      <div className='border-separator border-b p-2'>
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={t.pullRequest.searchIssues}
          className='h-7 w-full px-2 text-xs rounded-md'
        />
      </div>

      <div className='scrollbar-thin min-h-0 flex-1 overflow-y-auto p-2'>
        {isLoading && issues.length === 0 ? (
          <div className='space-y-2'>
            <Skeleton className='h-12 w-full rounded-lg' />
            <Skeleton className='h-12 w-full rounded-lg' />
            <Skeleton className='h-12 w-full rounded-lg' />
          </div>
        ) : issues.length === 0 ? (
          <SectionEmpty>{t.pullRequest.noOpenIssues}</SectionEmpty>
        ) : (
          <div className='space-y-1.5'>
            {issues.map((issue) => (
              <IssueRow
                key={`${issue.sourceRepo?.owner}-${issue.sourceRepo?.repo}-${issue.number}`}
                issue={issue}
                onOpen={() => setSelected(issue.number)}
              />
            ))}
          </div>
        )}
      </div>

      {(data?.hasMore || page > 1) && (
        <div className='border-separator flex items-center justify-between border-t p-2'>
          <Button
            size='sm'
            variant='ghost'
            className='rounded-lg'
            isDisabled={page <= 1}
            onPress={() => setPage((value) => Math.max(1, value - 1))}
          >
            {t.common.previous}
          </Button>
          <span className='text-muted text-xs'>{page}</span>
          <Button
            size='sm'
            variant='ghost'
            className='rounded-lg'
            isDisabled={!data?.hasMore}
            onPress={() => setPage((value) => value + 1)}
          >
            {t.common.next}
          </Button>
        </div>
      )}
    </div>
  );
}

function IssueRow({
  issue,
  onOpen,
}: {
  issue: IssueSummary;
  onOpen: () => void;
}) {
  return (
    <button
      type='button'
      onClick={onOpen}
      className='border-separator hover:bg-default/40 w-full rounded-lg border p-2.5 text-left transition-colors'
    >
      <div className='flex items-start gap-2'>
        <StateChip state={issue.state} />
        <span className='min-w-0 flex-1 text-xs font-medium'>
          {issue.title}
        </span>
        <span className='text-muted shrink-0 pt-0.5 font-mono text-[10px]'>
          #{issue.number}
        </span>
      </div>
      <div className='mt-1.5 flex flex-wrap items-center gap-1.5'>
        {issue.labels?.slice(0, 3).map((label) => (
          <LabelPill key={label.name} name={label.name} color={label.color} />
        ))}
        {issue.author && (
          <span className='text-muted ml-auto text-[10px]'>
            {displayName(issue.author)}
          </span>
        )}
      </div>
    </button>
  );
}

function IssueDetail({
  directory,
  number,
  onBack,
}: {
  directory: string;
  number: number;
  onBack: () => void;
}) {
  const { t } = useI18n();
  const issueQuery = useGitHubIssue(directory, number);
  const commentsQuery = useGitHubIssueComments(directory, number);
  const issueData = issueQuery.data as GitHubIssue | null | undefined;
  const commentsData = commentsQuery.data as
    | GitHubIssueComments
    | null
    | undefined;
  const issue = issueData?.issue ?? null;
  const comments = commentsData?.comments ?? [];

  return (
    <div className='flex h-full min-h-0 flex-col'>
      <div className='border-separator flex items-center gap-2 border-b p-2'>
        <Button
          size='sm'
          variant='ghost'
          className='rounded-lg'
          isIconOnly
          onPress={onBack}
          aria-label={t.common.back}
        >
          <Icon data={ArrowLeft} size={14} />
        </Button>
        {issue && (
          <>
            <span className='text-muted shrink-0 font-mono text-xs'>
              #{issue.number}
            </span>
            <span className='min-w-0 flex-1 truncate text-xs font-medium'>
              {issue.title}
            </span>
            <a
              href={issue.url}
              target='_blank'
              rel='noopener noreferrer'
              className='text-muted hover:text-foreground shrink-0'
              aria-label={t.pullRequest.openOnGitHub}
            >
              <Icon data={ArrowUpRightFromSquare} size={12} />
            </a>
          </>
        )}
      </div>

      <div className='scrollbar-thin min-h-0 flex-1 overflow-y-auto p-3'>
        {issueQuery.isLoading || !issue ? (
          <div className='space-y-2'>
            <Skeleton className='h-20 w-full rounded-lg' />
            <Skeleton className='h-16 w-full rounded-lg' />
          </div>
        ) : (
          <div className='space-y-3'>
            <div className='flex items-center gap-2'>
              <StateChip state={issue.state} />
              <AvatarBadge user={issue.author} size='sm' />
              <span className='text-muted text-xs'>
                {issue.author
                  ? t.pullRequest.openedBy(displayName(issue.author))
                  : ''}
              </span>
              <TimeAgo value={issue.createdAt} />
            </div>

            {issue.labels && issue.labels.length > 0 && (
              <div className='flex flex-wrap gap-1.5'>
                {issue.labels.map((label) => (
                  <LabelPill
                    key={label.name}
                    name={label.name}
                    color={label.color}
                  />
                ))}
              </div>
            )}

            <div className='border-separator bg-default/30 rounded-lg border p-3'>
              {issue.body.trim() ? (
                <MarkdownBlock>{issue.body}</MarkdownBlock>
              ) : (
                <span className='text-muted text-xs'>
                  {t.pullRequest.noDescription}
                </span>
              )}
            </div>

            {issue.assignees && issue.assignees.length > 0 && (
              <div className='flex items-center gap-2'>
                <span className='text-muted text-xs'>
                  {t.pullRequest.issueAssignees}
                </span>
                {issue.assignees.map((assignee) => (
                  <AvatarBadge key={assignee.id} user={assignee} size='sm' />
                ))}
              </div>
            )}

            <div className='space-y-2'>
              {comments.map((comment) => (
                <div
                  key={comment.id}
                  className='border-separator rounded-lg border'
                >
                  <div className='border-separator bg-default/30 flex items-center gap-2 rounded-t-lg border-b px-3 py-1.5'>
                    <AvatarBadge user={comment.author} size='sm' />
                    <span className='text-xs font-medium'>
                      {displayName(comment.author)}
                    </span>
                    <TimeAgo value={comment.createdAt} />
                  </div>
                  <div className='px-3 py-2'>
                    <MarkdownBlock>{comment.body}</MarkdownBlock>
                  </div>
                </div>
              ))}
              {comments.length === 0 && !commentsQuery.isLoading && (
                <div className='text-muted flex items-center justify-center gap-1.5 py-4 text-xs'>
                  <Icon data={Comment} size={12} />
                  {t.pullRequest.noComments}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
