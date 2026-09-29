// app/components/chat-aside/pr/shared.tsx
//
// Small presentational pieces shared by the pull request and issue views.

import { Avatar, Chip, cn, ScrollShadow } from '@aero/ui';
import {
  ChevronLeft,
  ChevronRight,
  CircleCheck,
  CircleXmark,
  Clock,
} from '@gravity-ui/icons';
import { Icon } from '@gravity-ui/uikit';
import type { ReactNode } from 'react';
import { useEffect, useId, useRef, useState } from 'react';

import { Markdown } from '@/app/components/markdown/markdown';
import { useI18n } from '@/app/hooks/i18n';
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

export interface SectionTab<T extends string> {
  id: T;
  label: string;
  count?: number;
}

/**
 * Underline tab bar matching the git panel's sections. Kept local instead of
 * the HeroUI `Tabs` so every aside panel shares one tab rhythm.
 */
export function SectionTabs<T extends string>({
  tabs,
  active,
  onChange,
  ariaLabel,
  className,
}: {
  tabs: ReadonlyArray<SectionTab<T>>;
  active: T;
  onChange: (id: T) => void;
  ariaLabel: string;
  className?: string;
}) {
  const { t } = useI18n();
  const scrollRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef<HTMLButtonElement>(null);
  const [overflow, setOverflow] = useState({ left: false, right: false });

  const scrollByPage = (direction: -1 | 1) => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollBy({
      left: direction * Math.max(120, el.clientWidth * 0.6),
      behavior: 'smooth',
    });
  };

  // Scroll with the selection: centre the newly active tab so the tabs on
  // either side come into view. `scrollTo` clamps at both ends, so the first
  // and last tabs settle against the edges instead of overshooting.
  useEffect(() => {
    const container = scrollRef.current;
    const button = activeRef.current;
    if (!container || !button) return;
    if (container.scrollWidth <= container.clientWidth) return;

    const containerRect = container.getBoundingClientRect();
    const buttonRect = button.getBoundingClientRect();
    const buttonCenter =
      buttonRect.left -
      containerRect.left +
      container.scrollLeft +
      buttonRect.width / 2;

    container.scrollTo({
      left: buttonCenter - container.clientWidth / 2,
      behavior: 'smooth',
    });
  }, [active]);

  return (
    <div
      className={cn(
        'border-separator relative flex shrink-0 border-b',
        className,
      )}
    >
      <ScrollShadow
        ref={scrollRef}
        role='tablist'
        aria-label={ariaLabel}
        orientation='horizontal'
        hideScrollBar
        size={24}
        onVisibilityChange={(visibility) =>
          setOverflow({
            left: visibility === 'left' || visibility === 'both',
            right: visibility === 'right' || visibility === 'both',
          })
        }
        className='flex min-w-0 flex-1 items-center gap-0.5 px-2'
      >
        {tabs.map((tab) => {
          const isActive = tab.id === active;
          return (
            <button
              key={tab.id}
              ref={isActive ? activeRef : undefined}
              type='button'
              role='tab'
              aria-selected={isActive}
              onClick={() => onChange(tab.id)}
              className={cn(
                'focus-visible:ring-accent relative rounded-sm px-2.5 py-2 text-xs outline-none transition-colors',
                'focus-visible:ring-2',
                isActive
                  ? 'text-foreground font-medium'
                  : 'text-muted hover:text-foreground',
              )}
            >
              <span className='inline-flex items-center gap-1.5'>
                {tab.label}
                {typeof tab.count === 'number' && tab.count > 0 && (
                  <span className='text-muted tabular-nums'>{tab.count}</span>
                )}
              </span>
              <span
                className={cn(
                  'bg-accent absolute inset-x-1.5 bottom-0 h-0.5 rounded-full transition-opacity duration-150 ease-out motion-reduce:transition-none',
                  isActive ? 'opacity-100' : 'opacity-0',
                )}
              />
            </button>
          );
        })}
      </ScrollShadow>

      {overflow.left && (
        <button
          type='button'
          aria-label={t.common.scrollTabsLeft}
          onClick={() => scrollByPage(-1)}
          className='text-muted hover:text-foreground absolute inset-y-0 left-0 z-10 flex w-6 items-center justify-center transition-colors'
        >
          <Icon data={ChevronLeft} size={14} />
        </button>
      )}

      {overflow.right && (
        <button
          type='button'
          aria-label={t.common.scrollTabsRight}
          onClick={() => scrollByPage(1)}
          className='text-muted hover:text-foreground absolute inset-y-0 right-0 z-10 flex w-6 items-center justify-center transition-colors'
        >
          <Icon data={ChevronRight} size={14} />
        </button>
      )}
    </div>
  );
}
