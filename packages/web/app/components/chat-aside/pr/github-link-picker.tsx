// app/components/chat-aside/pr/github-link-picker.tsx
//
// Modal picker used by the chat composer to attach a GitHub issue or pull
// request to the next message. Reuses the same list endpoints as the aside.

import { Button, Modal, Skeleton } from '@aero/ui';
import { Check } from '@gravity-ui/icons';
import { Icon } from '@gravity-ui/uikit';
import { useEffect, useMemo, useState } from 'react';

import {
  GithubLinkKind,
  getExternalPartsSession,
  useExternalPartsStore,
} from '@/app/features/chat-page/chat-input/external-parts-store';
import { useGitHubIssueList, useGitHubPullList } from '@/app/hooks/api/github';
import { useI18n } from '@/app/hooks/i18n';
import { useGlobalModalStore } from '@/app/providers';

import { SectionEmpty, StateChip } from './shared';
import type {
  GitHubIssueList,
  GitHubPullList,
  IssueSummary,
  PullSummary,
} from './types';

interface GithubLinkPickerProps {
  directory: string;
  sessionId: string;
  kind: GithubLinkKind;
}

interface PickerItem {
  key: string;
  kind: GithubLinkKind;
  number: number;
  title: string;
  url: string;
  state: string;
}

export function GithubLinkPicker({
  directory,
  sessionId,
  kind,
}: GithubLinkPickerProps) {
  const { t } = useI18n();
  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');
  const [page, setPage] = useState(1);

  const addGithubLink = useExternalPartsStore((state) => state.addGithubLink);
  const links = useExternalPartsStore(
    (state) => getExternalPartsSession(state, sessionId).githubLinks,
  );
  const closeModal = useGlobalModalStore((state) => state.closeModal);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebounced(query.trim());
      setPage(1);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [query]);

  const issueQuery = useGitHubIssueList(directory, debounced, page, {
    enabled: kind === 'issue',
  });
  const pullQuery = useGitHubPullList(directory, debounced, page, {
    enabled: kind === 'pull-request',
  });

  const issueData = issueQuery.data as GitHubIssueList | null | undefined;
  const pullData = pullQuery.data as GitHubPullList | null | undefined;

  const isLoading =
    kind === 'issue' ? issueQuery.isLoading : pullQuery.isLoading;
  const hasMore = kind === 'issue' ? issueData?.hasMore : pullData?.hasMore;

  const items = useMemo<PickerItem[]>(() => {
    if (kind === 'issue') {
      return (issueData?.issues ?? []).map((issue: IssueSummary) => ({
        key: `${issue.sourceRepo?.owner}-${issue.sourceRepo?.repo}-${issue.number}`,
        kind,
        number: issue.number,
        title: issue.title,
        url: issue.url,
        state: issue.state,
      }));
    }

    return (pullData?.prs ?? []).map((pr: PullSummary) => ({
      key: `${pr.sourceRepo?.owner}-${pr.sourceRepo?.repo}-${pr.number}`,
      kind,
      number: pr.number,
      title: pr.title,
      url: pr.url,
      state: pr.state,
    }));
  }, [kind, issueData, pullData]);

  const handleSelect = (item: PickerItem) => {
    addGithubLink(sessionId, {
      kind: item.kind,
      number: item.number,
      title: item.title,
      url: item.url,
      state: item.state,
    });
    closeModal();
  };

  return (
    <Modal.Dialog className='sm:max-w-[520px]'>
      <Modal.CloseTrigger />
      <Modal.Header>
        <Modal.Heading>
          {kind === 'issue'
            ? t.chatInput.linkGithubIssue
            : t.chatInput.linkGithubPr}
        </Modal.Heading>
      </Modal.Header>

      <Modal.Body className='flex min-h-0 flex-col gap-3 px-0 pb-0'>
        <div className='px-5'>
          <input
            autoFocus
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t.chatInput.searchGithubLinks}
            className='border-separator bg-default/30 text-foreground placeholder:text-muted focus:border-accent w-full rounded-md border px-2.5 py-1.5 text-xs outline-none'
          />
        </div>

        <div className='max-h-[50vh] min-h-[160px] overflow-y-auto px-2 pb-2 scrollbar-thin'>
          {isLoading && items.length === 0 ? (
            <div className='space-y-2 p-2'>
              <Skeleton className='h-12 w-full rounded-lg' />
              <Skeleton className='h-12 w-full rounded-lg' />
              <Skeleton className='h-12 w-full rounded-lg' />
            </div>
          ) : items.length === 0 ? (
            <SectionEmpty>{t.chatInput.noGithubLinksFound}</SectionEmpty>
          ) : (
            <div className='space-y-1.5'>
              {items.map((item) => {
                const linked = links.some(
                  (link) =>
                    link.kind === item.kind && link.number === item.number,
                );

                return (
                  <PickerRow
                    key={item.key}
                    item={item}
                    linked={linked}
                    onSelect={() => {
                      if (linked) return;
                      handleSelect(item);
                    }}
                  />
                );
              })}
            </div>
          )}
        </div>

        {(hasMore || page > 1) && (
          <div className='border-separator flex items-center justify-between border-t px-3 py-2'>
            <Button
              size='sm'
              variant='ghost'
              isDisabled={page <= 1}
              onPress={() => setPage((value) => Math.max(1, value - 1))}
            >
              {t.common.previous}
            </Button>
            <span className='text-muted text-xs'>{page}</span>
            <Button
              size='sm'
              variant='ghost'
              isDisabled={!hasMore}
              onPress={() => setPage((value) => value + 1)}
            >
              {t.common.next}
            </Button>
          </div>
        )}
      </Modal.Body>
    </Modal.Dialog>
  );
}

function PickerRow({
  item,
  linked,
  onSelect,
}: {
  item: PickerItem;
  linked: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type='button'
      onClick={onSelect}
      disabled={linked}
      className='border-separator hover:bg-default/40 w-full rounded-lg border p-2.5 text-left transition-colors disabled:cursor-default disabled:opacity-60'
    >
      <div className='flex items-start gap-2'>
        <StateChip state={item.state} />
        <span className='min-w-0 flex-1 text-xs font-medium'>{item.title}</span>
        {linked ? (
          <Icon
            data={Check}
            size={12}
            className='text-accent shrink-0 pt-0.5'
          />
        ) : (
          <span className='text-muted shrink-0 pt-0.5 font-mono text-[10px]'>
            #{item.number}
          </span>
        )}
      </div>
    </button>
  );
}
