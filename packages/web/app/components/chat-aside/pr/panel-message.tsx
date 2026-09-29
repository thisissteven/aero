// app/components/chat-aside/pr/panel-message.tsx
//
// Empty/loading placeholders shared by the pull request panel and its tabs.

import { Skeleton } from '@aero/ui';
import { Icon } from '@gravity-ui/uikit';
import type { ComponentProps } from 'react';

export function PanelMessage({
  icon,
  message,
  tone = 'default',
}: {
  icon: ComponentProps<typeof Icon>['data'];
  message: string;
  tone?: 'default' | 'warning';
}) {
  return (
    <div className='flex h-full min-h-0 flex-col items-center justify-center gap-2 p-6 text-center'>
      <Icon
        data={icon}
        size={20}
        className={tone === 'warning' ? 'text-warning' : 'text-muted'}
      />
      <p className='text-muted max-w-64 text-sm'>{message}</p>
    </div>
  );
}

export function PanelSkeleton() {
  return (
    <div className='space-y-2 p-3'>
      <Skeleton className='h-8 w-full rounded' />
      <Skeleton className='h-20 w-full rounded' />
    </div>
  );
}
