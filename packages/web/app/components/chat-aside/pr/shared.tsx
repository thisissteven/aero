// app/components/chat-aside/pr/shared.tsx
//
// Small presentational pieces shared by the pull request and issue views.

import { Avatar, Chip, cn } from '@aero/ui';
import { CircleCheck, CircleXmark, Clock } from '@gravity-ui/icons';
import { Icon } from '@gravity-ui/uikit';
import type { ReactNode } from 'react';
import { useId } from 'react';

import { Markdown } from '@/app/components/markdown/markdown';
import { formatCompactRelativeTime } from '@/app/lib';

import type {
  CheckRunSummary,
  CheckState,
  GitHubAuthor,
  GitHubUserSummary,
} from './types';

export type ChipColor = 'accent' | 'default' | 'success' | 'warning' | 'danger';

export function AvatarBadge({
  user,
  size = 'sm',
}: {
  user?: GitHubAuthor | GitHubUserSummary | null;
  size?: 'sm' | 'md' | 'lg';
}) {
  const login = user?.login ?? '';
  return (
    <Avatar size={size}>
      <Avatar.Image src={user?.avatarUrl ?? undefined} alt={login} />
      <Avatar.Fallback>
        {login.slice(0, 2).toUpperCase() || '?'}
      </Avatar.Fallback>
    </Avatar>
  );
}

export function TimeAgo({ value }: { value?: string | null }) {
  if (!value) return null;
  return (
    <span className='text-muted text-xs'>
      {formatCompactRelativeTime(value, true)}
    </span>
  );
}

const STATE_COLORS: Record<string, ChipColor> = {
  open: 'success',
  merged: 'accent',
  closed: 'danger',
};

export function StateChip({ state }: { state?: string }) {
  const normalized = (state ?? '').toLowerCase();
  return (
    <Chip
      size='sm'
      variant='soft'
      color={STATE_COLORS[normalized] ?? 'default'}
    >
      {state ?? 'unknown'}
    </Chip>
  );
}

const CHECK_COLORS: Record<CheckState, ChipColor> = {
  success: 'success',
  failure: 'danger',
  pending: 'warning',
  unknown: 'default',
};

const CHECK_ICONS = {
  success: CircleCheck,
  failure: CircleXmark,
  pending: Clock,
  unknown: CircleCheck,
} as const;

export function ChecksChip({
  summary,
  label,
}: {
  summary: CheckRunSummary;
  label?: string;
}) {
  return (
    <Chip size='sm' variant='soft' color={CHECK_COLORS[summary.state]}>
      <Icon data={CHECK_ICONS[summary.state]} size={10} />
      {label ?? summary.state}
    </Chip>
  );
}

export function CheckStatusIcon({
  conclusion,
}: {
  conclusion?: string | null;
}) {
  const isSuccess =
    conclusion === 'success' ||
    conclusion === 'skipped' ||
    conclusion === 'neutral';
  const isFailure =
    conclusion === 'failure' ||
    conclusion === 'timed_out' ||
    conclusion === 'cancelled';

  const icon = isSuccess ? CircleCheck : isFailure ? CircleXmark : Clock;
  const className = isSuccess
    ? 'text-success'
    : isFailure
      ? 'text-danger'
      : 'text-warning';

  return <Icon data={icon} size={14} className={cn('shrink-0', className)} />;
}

export function LabelPill({ name, color }: { name: string; color?: string }) {
  return (
    <span
      className='border-separator inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium'
      style={
        color
          ? {
              borderColor: `#${color}55`,
              backgroundColor: `#${color}22`,
              color: `#${color}`,
            }
          : undefined
      }
    >
      {name}
    </span>
  );
}

/** Renders GitHub-flavored markdown with the app's chat markdown renderer. */
export function MarkdownBlock({ children }: { children?: string | null }) {
  const id = useId();
  if (!children?.trim()) return null;
  return (
    <div className='text-foreground text-sm leading-relaxed [&_a]:text-accent [&_code]:text-xs'>
      <Markdown id={id}>{children}</Markdown>
    </div>
  );
}

export function SectionEmpty({ children }: { children: ReactNode }) {
  return (
    <div className='text-muted flex items-center justify-center py-8 text-xs'>
      {children}
    </div>
  );
}
