// app/components/chat-aside/pr/pr-conversation.tsx

import { Skeleton } from '@aero/ui';
import { Comment } from '@gravity-ui/icons';
import { Icon } from '@gravity-ui/uikit';
import { useMemo } from 'react';

import { useI18n } from '@/app/hooks/i18n';

import { AvatarBadge, MarkdownBlock, SectionEmpty, TimeAgo } from './shared';
import type { PullComment } from './types';
import { displayName } from './util';

export function PrConversation({
  issueComments,
  reviewComments,
  isLoading,
}: {
  issueComments?: PullComment[];
  reviewComments?: PullComment[];
  isLoading?: boolean;
}) {
  const { t } = useI18n();

  const comments = useMemo(() => {
    const merged = [
      ...(issueComments ?? []).map((comment) => ({
        ...comment,
        kind: 'issue' as const,
      })),
      ...(reviewComments ?? []).map((comment) => ({
        ...comment,
        kind: 'review' as const,
      })),
    ];
    return merged.sort((a, b) => {
      const aTime = a.createdAt ? Date.parse(a.createdAt) : 0;
      const bTime = b.createdAt ? Date.parse(b.createdAt) : 0;
      return aTime - bTime;
    });
  }, [issueComments, reviewComments]);

  if (isLoading && comments.length === 0) {
    return (
      <div className='space-y-2 p-3'>
        <Skeleton className='h-16 w-full rounded-lg' />
        <Skeleton className='h-16 w-full rounded-lg' />
      </div>
    );
  }

  if (comments.length === 0) {
    return <SectionEmpty>{t.pullRequest.noComments}</SectionEmpty>;
  }

  return (
    <div className='space-y-2 p-3'>
      {comments.map((comment) => (
        <div
          key={`${comment.kind}-${comment.id}`}
          className='border-separator rounded-lg border'
        >
          <div className='border-separator bg-default/30 flex items-center gap-2 rounded-t-lg border-b px-3 py-1.5'>
            <AvatarBadge user={comment.author} size='sm' />
            <span className='text-xs font-medium'>
              {displayName(comment.author)}
            </span>
            <TimeAgo value={comment.createdAt} />
            {comment.kind === 'review' && comment.path && (
              <span className='text-muted ml-auto flex items-center gap-1 truncate font-mono text-[10px]'>
                <Icon data={Comment} size={10} />
                {t.pullRequest.reviewCommentOn(comment.path)}
                {comment.line ? `:${comment.line}` : ''}
              </span>
            )}
          </div>
          <div className='px-3 py-2'>
            <MarkdownBlock>{comment.body}</MarkdownBlock>
          </div>
        </div>
      ))}
    </div>
  );
}
