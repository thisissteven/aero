// app/components/chat-aside/git/stashes-tab.tsx
import { Button, IconButton, Input, Tooltip } from '@aero/ui';
import { ArrowUp, Check, TrashBin } from '@gravity-ui/icons';
import { Icon } from '@gravity-ui/uikit';
import { useState } from 'react';

import {
  useGitStashApply,
  useGitStashDrop,
  useGitStashes,
  useGitStashPop,
  useGitStashPush,
} from '@/app/hooks/api/git';
import { useI18n } from '@/app/hooks/i18n';
import { toastPromise } from '@/app/lib/toast';

import { EmptyState, ListSkeleton } from './shared';
import type { Stash } from './types';

export function StashesTab({ directory }: { directory: string }) {
  const { t } = useI18n();
  const { data, isLoading } = useGitStashes(directory);
  const push = useGitStashPush();
  const apply = useGitStashApply();
  const pop = useGitStashPop();
  const drop = useGitStashDrop();

  const [message, setMessage] = useState('');

  const stashes =
    (data as { stashes?: Stash[] } | null | undefined)?.stashes ?? [];

  const run = (
    mutation: { mutateAsync: (input: any) => Promise<unknown> },
    input: Record<string, unknown>,
    label: string,
  ) =>
    toastPromise(mutation.mutateAsync({ directory, ...input }), {
      loading: label,
      success: t.gitPanel.operationComplete(label),
      error: (error) => error.message || t.gitPanel.operationFailed(label),
    });

  if (isLoading) return <ListSkeleton />;

  return (
    <div className='space-y-2 p-2'>
      <div className='flex items-center gap-1.5'>
        <Input
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder={t.gitPanel.stashMessagePlaceholder}
          className='min-w-0 flex-1 h-7 text-xs rounded-md px-2'
        />
        <Button
          size='sm'
          variant='primary'
          onPress={() => {
            void run(
              push,
              { message: message.trim() || undefined },
              t.gitPanel.stash,
            );
            setMessage('');
          }}
          isPending={push.isPending}
          className='rounded-md h-7 text-xs'
        >
          {t.gitPanel.stash}
        </Button>
      </div>

      {stashes.length === 0 ? (
        <EmptyState label={t.gitPanel.noStashes} />
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

              <div className='flex shrink-0 items-center gap-0.5'>
                <Tooltip>
                  <Tooltip.Trigger>
                    <IconButton
                      aria-label={t.gitPanel.applyStash}
                      onPress={() =>
                        run(apply, { ref: stash.ref }, t.gitPanel.applyStash)
                      }
                    >
                      <Icon data={Check} />
                    </IconButton>
                  </Tooltip.Trigger>
                  <Tooltip.Content>{t.gitPanel.apply}</Tooltip.Content>
                </Tooltip>
                <Tooltip>
                  <Tooltip.Trigger>
                    <IconButton
                      aria-label={t.gitPanel.popStash}
                      onPress={() =>
                        run(pop, { ref: stash.ref }, t.gitPanel.popStash)
                      }
                    >
                      <Icon data={ArrowUp} />
                    </IconButton>
                  </Tooltip.Trigger>
                  <Tooltip.Content>{t.gitPanel.pop}</Tooltip.Content>
                </Tooltip>
                <Tooltip>
                  <Tooltip.Trigger>
                    <IconButton
                      aria-label={t.gitPanel.dropStash}
                      onPress={() =>
                        run(drop, { ref: stash.ref }, t.gitPanel.dropStash)
                      }
                    >
                      <Icon data={TrashBin} />
                    </IconButton>
                  </Tooltip.Trigger>
                  <Tooltip.Content>{t.gitPanel.drop}</Tooltip.Content>
                </Tooltip>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
