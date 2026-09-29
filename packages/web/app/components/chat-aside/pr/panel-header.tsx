// app/components/chat-aside/pr/panel-header.tsx
import { cn, IconButton, Tooltip } from '@aero/ui';
import { ArrowRotateLeft } from '@gravity-ui/icons';
import { Icon } from '@gravity-ui/uikit';
import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import { githubKeys } from '@/app/hooks/api/github';
import { useI18n } from '@/app/hooks/i18n';

import { GitHubAccountMenu } from './github-account-menu';
import type { GitHubAuthStatus } from './types';

export function PanelHeader({
  auth,
  onChanged,
}: {
  auth: GitHubAuthStatus;
  onChanged: () => void;
}) {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const refresh = async () => {
    setIsRefreshing(true);
    try {
      await queryClient.invalidateQueries({ queryKey: githubKeys.all() });
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <div className='border-separator flex shrink-0 items-center gap-1 border-b px-2 py-1.5'>
      <GitHubAccountMenu auth={auth} onChanged={onChanged} />
      <span className='min-w-0 flex-1' />
      <Tooltip>
        <Tooltip.Trigger>
          <IconButton
            className='rounded-lg'
            aria-label={t.pullRequest.refresh}
            isDisabled={isRefreshing}
            onPress={() => void refresh()}
          >
            <Icon
              data={ArrowRotateLeft}
              className={cn(
                isRefreshing && 'animate-spin motion-reduce:animate-none',
              )}
            />
          </IconButton>
        </Tooltip.Trigger>
        <Tooltip.Content>{t.pullRequest.refresh}</Tooltip.Content>
      </Tooltip>
    </div>
  );
}
