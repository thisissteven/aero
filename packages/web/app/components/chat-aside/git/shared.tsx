// app/components/chat-aside/git/shared.tsx
//
// Small presentational helpers shared across the git panel tabs.

import { Checkbox, Skeleton } from '@aero/ui';
import { Icon } from '@gravity-ui/uikit';
import type { ComponentProps } from 'react';

export function OptionCheckbox({
  isSelected,
  onChange,
  label,
  isDisabled,
}: {
  isSelected: boolean;
  onChange: (isSelected: boolean) => void;
  label: string;
  isDisabled?: boolean;
}) {
  return (
    <Checkbox
      isSelected={isSelected}
      isDisabled={isDisabled}
      onChange={onChange}
    >
      <Checkbox.Content className='gap-2'>
        <Checkbox.Control>
          <Checkbox.Indicator />
        </Checkbox.Control>
        <span className='text-foreground text-sm'>{label}</span>
      </Checkbox.Content>
    </Checkbox>
  );
}

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
      <Skeleton className='h-9 w-full rounded' />
      <Skeleton className='h-16 w-full rounded' />
      <Skeleton className='h-7 w-2/3 rounded' />
    </div>
  );
}

export function ListSkeleton() {
  return (
    <div className='space-y-1 p-2'>
      <Skeleton className='h-7 w-full rounded' />
      <Skeleton className='h-7 w-full rounded' />
      <Skeleton className='h-7 w-3/4 rounded' />
    </div>
  );
}

export function EmptyState({ label }: { label: string }) {
  return (
    <div className='text-muted flex items-center justify-center py-10 text-sm'>
      {label}
    </div>
  );
}
