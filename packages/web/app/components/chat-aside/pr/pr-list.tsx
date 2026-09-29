// app/components/chat-aside/pr/pr-list.tsx
//
// Browse the repository's open pull requests and open one for review without
// checking out its branch. The current branch gets its own tab; this is the
// "everything else in the repo" view.

import {
  Button,
  Chip,
  cn,
  IconButton,
  Input,
  Skeleton,
  Tooltip,
} from '@aero/ui';
import { ArrowLeft, ArrowRotateLeft, ChevronRight } from '@gravity-ui/icons';
import { Icon } from '@gravity-ui/uikit';
import { useEffect, useState } from 'react';

import { useGitHubPullList } from '@/app/hooks/api/github';
import { useI18n } from '@/app/hooks/i18n';

import { PrView } from './pr-view';
import { AvatarBadge, SectionEmpty, StateChip } from './shared';
import type {
  GitHubPrStatus,
  GitHubPullList,
  PullRequest,
  PullSummary,
} from './types';
import { displayName } from './util';

export function PullList({ directory }: { directory: string }) {
  const { t } = useI18n();
  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<PullSummary | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebounced(query.trim());
      setPage(1);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [query]);

  const listQuery = useGitHubPullList(directory, debounced, page);
  const data = listQuery.data as GitHubPullList | null | undefined;
  const prs = data?.prs ?? [];

  if (selected) {
    return (
      <PullDetail
        directory={directory}
        pull={selected}
        onBack={() => setSelected(null)}
      />
    );
  }

  return (
    <div className='flex h-full min-h-0 flex-col'>
      <div className='border-separator flex shrink-0 items-center gap-1.5 border-b p-2'>
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={t.pullRequest.searchPullRequests}
          className='h-7 min-w-0 flex-1 px-2 text-xs rounded-md'
        />
        <Tooltip>
          <Tooltip.Trigger>
            <IconButton
              className='rounded-lg'
              aria-label={t.pullRequest.refresh}
              onPress={() => void listQuery.refetch()}
            >
              <Icon
                data={ArrowRotateLeft}
                className={cn(
                  listQuery.isFetching &&
                    'animate-spin motion-reduce:animate-none',
                )}
              />
            </IconButton>
          </Tooltip.Trigger>
          <Tooltip.Content>{t.pullRequest.refresh}</Tooltip.Content>
        </Tooltip>
      </div>

      <div className='scrollbar-thin min-h-0 flex-1 overflow-y-auto p-2'>
        {listQuery.isLoading && prs.length === 0 ? (
          <ListSkeleton />
        ) : prs.length === 0 ? (
          <SectionEmpty>
            {debounced ? t.common.noResults : t.pullRequest.noOpenPullRequests}
          </SectionEmpty>
        ) : (
          <ul className='space-y-1'>
            {prs.map((pull) => (
              <PullRow
                key={`${pull.sourceRepo?.owner}/${pull.sourceRepo?.repo}#${pull.number}`}
                pull={pull}
                onOpen={() => setSelected(pull)}
              />
            ))}
          </ul>
        )}
      </div>

      {(data?.hasMore || page > 1) && (
        <div className='border-separator flex shrink-0 items-center justify-between border-t p-2'>
          <Button
            size='sm'
            variant='ghost'
            className='rounded-lg'
            isDisabled={page <= 1}
            onPress={() => setPage((value) => Math.max(1, value - 1))}
          >
            {t.common.previous}
          </Button>
          <span className='text-muted text-xs tabular-nums'>{page}</span>
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

function PullRow({ pull, onOpen }: { pull: PullSummary; onOpen: () => void }) {
  const { t } = useI18n();

  return (
    <li>
      <button
        type='button'
        onClick={onOpen}
        className={cn(
          'border-separator hover:bg-default/40 active:bg-default/60 w-full rounded-lg border p-2.5 text-left transition-colors',
          'focus-visible:ring-accent outline-none focus-visible:ring-2',
        )}
      >
        <div className='flex items-start gap-2'>
          <StateChip state={pull.state} />
          {pull.draft && (
            <Chip size='sm' variant='soft' color='default'>
              {t.pullRequest.draft}
            </Chip>
          )}
          <span className='min-w-0 flex-1 text-xs font-medium'>
            {pull.title}
          </span>
          <span className='text-muted shrink-0 pt-0.5 font-mono text-[10px]'>
            #{pull.number}
          </span>
          <Icon
            data={ChevronRight}
            size={12}
            className='text-muted shrink-0 self-center'
          />
        </div>

        <div className='mt-1.5 flex items-center gap-2'>
          {pull.author && (
            <>
              <AvatarBadge user={pull.author} size='sm' />
              <span className='text-muted text-[10px]'>
                {displayName(pull.author)}
              </span>
            </>
          )}
          {pull.head && pull.base && (
            <span className='text-muted ml-auto truncate font-mono text-[10px]'>
              {pull.head} → {pull.base}
            </span>
          )}
        </div>
      </button>
    </li>
  );
}

function PullDetail({
  directory,
  pull,
  onBack,
}: {
  directory: string;
  pull: PullSummary;
  onBack: () => void;
}) {
  const { t } = useI18n();

  // `PrView` is written against the branch-status shape. A list item carries
  // enough to satisfy it; merging stays disabled because we have not resolved
  // the viewer's permission for this repo.
  const status: GitHubPrStatus = {
    connected: true,
    repo: pull.sourceRepo ?? null,
    branch: pull.head,
    canMerge: false,
    pr: {
      number: pull.number,
      title: pull.title,
      url: pull.url,
      state: pull.state as PullRequest['state'],
      draft: pull.draft,
      base: pull.base,
      head: pull.head,
      author: pull.author,
      sourceRepo: pull.sourceRepo,
    },
  };

  return (
    <div className='flex h-full min-h-0 flex-col'>
      <div className='border-separator flex shrink-0 items-center gap-2 border-b px-2 py-2'>
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
        <span className='text-muted shrink-0 font-mono text-xs'>
          #{pull.number}
        </span>
        <span className='min-w-0 flex-1 truncate text-xs font-medium'>
          {pull.title}
        </span>
      </div>

      <div className='min-h-0 flex-1 overflow-hidden'>
        <PrView directory={directory} status={status} onChanged={() => {}} />
      </div>
    </div>
  );
}

function ListSkeleton() {
  return (
    <div className='space-y-1'>
      <Skeleton className='h-14 w-full rounded-lg' />
      <Skeleton className='h-14 w-full rounded-lg' />
      <Skeleton className='h-14 w-full rounded-lg' />
    </div>
  );
}
