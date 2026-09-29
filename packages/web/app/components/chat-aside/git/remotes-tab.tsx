// app/components/chat-aside/git/remotes-tab.tsx
import { IconButton, Tooltip } from '@aero/ui';
import { ArrowsRotateRight, TrashBin } from '@gravity-ui/icons';
import { Icon } from '@gravity-ui/uikit';

import {
  useGitFetch,
  useGitRemotes,
  useGitRemoveRemote,
} from '@/app/hooks/api/git';
import { useI18n } from '@/app/hooks/i18n';
import { toastPromise } from '@/app/lib/toast';

import { EmptyState, ListSkeleton } from './shared';
import type { Remote } from './types';

export function RemotesTab({ directory }: { directory: string }) {
  const { t } = useI18n();
  const { data, isLoading } = useGitRemotes(directory);
  const removeRemote = useGitRemoveRemote();
  const fetch = useGitFetch();

  if (isLoading) return <ListSkeleton />;

  const remotes = Array.isArray(data) ? (data as Remote[]) : [];
  if (!remotes.length) return <EmptyState label={t.gitPanel.noRemotes} />;

  return (
    <ul className='space-y-1 p-2'>
      {remotes.map((remote) => (
        <li
          key={remote.name}
          className='bg-default/40 flex items-center gap-2 rounded-md px-2 py-1.5 text-sm'
        >
          <div className='min-w-0 flex-1'>
            <div className='font-medium'>{remote.name}</div>
            {remote.refs?.fetch && (
              <div className='text-muted truncate font-mono text-xs'>
                {remote.refs.fetch}
              </div>
            )}
          </div>

          <div className='flex shrink-0 items-center gap-0.5'>
            <Tooltip>
              <Tooltip.Trigger>
                <IconButton
                  aria-label={t.gitPanel.fetch}
                  isDisabled={fetch.isPending}
                  onPress={() =>
                    toastPromise(
                      fetch.mutateAsync({ directory, remote: remote.name }),
                      {
                        loading: t.gitPanel.fetch,
                        success: t.gitPanel.operationComplete(t.gitPanel.fetch),
                        error: (error) =>
                          error.message ||
                          t.gitPanel.operationFailed(t.gitPanel.fetch),
                      },
                    )
                  }
                >
                  <Icon data={ArrowsRotateRight} />
                </IconButton>
              </Tooltip.Trigger>
              <Tooltip.Content>{t.gitPanel.fetch}</Tooltip.Content>
            </Tooltip>

            <Tooltip>
              <Tooltip.Trigger>
                <IconButton
                  aria-label={t.gitPanel.removeRemote}
                  isDisabled={removeRemote.isPending}
                  onPress={() =>
                    toastPromise(
                      removeRemote.mutateAsync({
                        directory,
                        remote: remote.name,
                      }),
                      {
                        loading: t.gitPanel.removeRemote,
                        success: t.gitPanel.removedRemote(remote.name),
                        error: (error) =>
                          error.message || t.gitPanel.removeRemoteFailed,
                      },
                    )
                  }
                >
                  <Icon data={TrashBin} />
                </IconButton>
              </Tooltip.Trigger>
              <Tooltip.Content>{t.gitPanel.removeRemote}</Tooltip.Content>
            </Tooltip>
          </div>
        </li>
      ))}
    </ul>
  );
}
