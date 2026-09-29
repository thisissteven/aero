import { cn } from '@aero/ui';
import {
  type PointerEvent as ReactPointerEvent,
  type RefObject,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';

import { useI18n } from '@/app/hooks/i18n';
import type { ActivityDay, ActivitySummary } from '@/server/services/activity';

const LEVEL_COLORS: Record<number, string> = {
  0: 'color-mix(in oklab, var(--foreground) 6%, transparent)',
  1: 'color-mix(in srgb, var(--success) 25%, transparent)',
  2: 'color-mix(in srgb, var(--success) 45%, transparent)',
  3: 'color-mix(in srgb, var(--success) 70%, transparent)',
  4: 'var(--success)',
};

const LEGEND_LEVELS = [0, 1, 2, 3, 4];

function todayKey(): string {
  const date = new Date();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

interface HoveredDay {
  day: ActivityDay;
  x: number;
  y: number;
}

function ActivityGraph({
  days,
  label,
}: {
  days: ActivityDay[];
  label: string;
}) {
  const { t } = useI18n();
  const [hovered, setHovered] = useState<HoveredDay | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{
    left: number;
    top: number;
  } | null>(null);
  const lastDateRef = useRef<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  const today = todayKey();

  useLayoutEffect(() => {
    const element = scrollRef.current;
    if (element) element.scrollLeft = element.scrollWidth;
  }, [days]);

  useLayoutEffect(() => {
    if (!hovered || !tooltipRef.current) {
      setTooltipPos(null);
      return;
    }

    const rect = tooltipRef.current.getBoundingClientRect();
    const margin = 8;
    const maxLeft = Math.max(margin, window.innerWidth - rect.width - margin);

    setTooltipPos({
      left: Math.min(Math.max(hovered.x - rect.width / 2, margin), maxLeft),
      top: Math.max(margin, hovered.y - 6 - rect.height),
    });
  }, [hovered]);

  const clearHover = useCallback(() => {
    lastDateRef.current = null;
    setHovered((prev) => (prev ? null : prev));
  }, []);

  useEffect(() => {
    window.addEventListener('scroll', clearHover, true);
    return () => window.removeEventListener('scroll', clearHover, true);
  }, [clearHover]);

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const target = (event.target as HTMLElement).closest<HTMLElement>(
      '[data-activity-day]',
    );

    if (!target) {
      clearHover();
      return;
    }

    const index = Number(target.dataset.activityDay);
    const day = days[index];

    if (!day || day.date > today) {
      clearHover();
      return;
    }

    if (lastDateRef.current === day.date) {
      return;
    }

    lastDateRef.current = day.date;

    const rect = target.getBoundingClientRect();

    setHovered({
      day,
      x: rect.left + rect.width / 2,
      y: rect.top,
    });
  };

  return (
    <>
      <div
        ref={scrollRef}
        className='scrollbar-thin overflow-x-auto pb-1'
        onScroll={clearHover}
      >
        <div
          aria-label={label}
          className='grid w-max grid-flow-col grid-rows-7 gap-0.5 py-1'
          onPointerLeave={clearHover}
          onPointerMove={handlePointerMove}
          role='img'
        >
          {days.map((day, index) => {
            const isFuture = day.date > today;

            return (
              <div
                key={day.date}
                className={cn(
                  'size-2 rounded-[2px]',
                  !isFuture &&
                    'motion-safe:transition-transform motion-safe:duration-100 motion-safe:ease-[cubic-bezier(0.23,1,0.32,1)] motion-safe:hover:scale-125',
                )}
                data-activity-day={index}
                style={{
                  backgroundColor: isFuture
                    ? 'transparent'
                    : LEVEL_COLORS[day.level],
                }}
              />
            );
          })}
        </div>
      </div>

      <div className='text-muted mt-1.5 hidden items-center justify-end gap-1.5 text-[10px] @sm:flex'>
        <span>{t.activity.less}</span>
        {LEGEND_LEVELS.map((level) => (
          <span
            key={level}
            className='size-2 rounded-[2px]'
            style={{ backgroundColor: LEVEL_COLORS[level] }}
          />
        ))}
        <span>{t.activity.more}</span>
      </div>

      {hovered &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            ref={tooltipRef}
            className='bg-overlay text-overlay-foreground border-separator pointer-events-none fixed z-50 rounded-md border px-2 py-1 text-xs whitespace-nowrap shadow-[var(--overlay-shadow)] motion-safe:animate-[fade-in_100ms_ease-out]'
            role='tooltip'
            style={
              tooltipPos
                ? { left: tooltipPos.left, top: tooltipPos.top }
                : { left: 0, top: 0, visibility: 'hidden' }
            }
          >
            <span className='font-medium'>
              {t.activity.sessionCount(hovered.day.count)}
            </span>
            <span className='text-muted'>
              {' · '}
              {t.activity.onDate(hovered.day.date)}
            </span>
          </div>,
          document.body,
        )}
    </>
  );
}

function ActivityStats({
  summary,
  showWorkspaces,
  emphasizeStats,
  className,
}: {
  summary: ActivitySummary;
  showWorkspaces: boolean;
  emphasizeStats: boolean;
  className?: string;
}) {
  const { t } = useI18n();

  const formatDays = (count: number) =>
    `${count} ${count === 1 ? t.activity.day : t.activity.days}`;

  return (
    <dl className={cn('grid gap-x-4 gap-y-1.5', className)}>
      <Stat
        emphasize={emphasizeStats}
        label={t.activity.currentStreak}
        value={formatDays(summary.currentStreak)}
      />
      <Stat
        emphasize={emphasizeStats}
        label={t.activity.activeDays}
        value={summary.activeDays}
      />
      <Stat
        emphasize={emphasizeStats}
        label={t.activity.sessions}
        value={summary.totalSessions}
      />
      <Stat
        emphasize={emphasizeStats}
        label={t.activity.last7Days}
        value={summary.last7Days}
      />
      <Stat
        emphasize={emphasizeStats}
        label={t.activity.longestStreak}
        value={formatDays(summary.longestStreak)}
      />
    </dl>
  );
}

function Stat({
  label,
  value,
  emphasize,
}: {
  label: string;
  value: string | number;
  emphasize: boolean;
}) {
  return (
    <div className='flex min-w-0 items-baseline justify-between gap-2'>
      <dt className='text-muted whitespace-nowrap text-xs'>{label}</dt>
      <dd
        className={cn(
          'whitespace-nowrap tabular-nums',
          emphasize ? 'text-sm font-semibold' : 'text-xs',
        )}
      >
        {value}
      </dd>
    </div>
  );
}

const GRAPH_COLUMN_PITCH = 10;
const RANGE_DAYS = [364, 182, 91, 28];

function useContainerWidth<T extends HTMLElement>(ref: RefObject<T | null>) {
  const [width, setWidth] = useState(0);

  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;

    setWidth(element.clientWidth);

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) setWidth(entry.contentRect.width);
    });

    observer.observe(element);
    return () => observer.disconnect();
  }, [ref]);

  return width;
}

export function ActivitySummaryContent({
  summary,
  showWorkspaces = true,
  emphasizeStats = true,
  range = 'auto',
}: {
  summary: ActivitySummary;
  showWorkspaces?: boolean;
  emphasizeStats?: boolean;
  range?: 'auto' | 'year';
}) {
  const { t } = useI18n();
  const graphRef = useRef<HTMLDivElement>(null);
  const width = useContainerWidth(graphRef);

  const days = useMemo(() => {
    if (range === 'year') return summary.days;

    const fitColumns = Math.max(
      1,
      Math.floor((width + 2) / GRAPH_COLUMN_PITCH),
    );
    const fitDays = fitColumns * 7;
    const selected =
      RANGE_DAYS.find((count) => count <= fitDays) ??
      RANGE_DAYS[RANGE_DAYS.length - 1];

    return summary.days.slice(-selected);
  }, [range, summary.days, width]);

  return (
    <div className='@container'>
      <div className='flex flex-col gap-4 @sm:flex-row @sm:items-center'>
        <div ref={graphRef} className='min-w-0 @sm:flex-1'>
          <ActivityGraph days={days} label={t.activity.title} />
        </div>

        <ActivityStats
          className='grid-cols-1 @min-[280px]:@max-[383px]:grid-cols-2 @sm:w-36 @sm:shrink-0 @sm:grid-cols-1'
          emphasizeStats={emphasizeStats}
          showWorkspaces={showWorkspaces}
          summary={summary}
        />
      </div>
    </div>
  );
}

export function ActivitySummarySkeleton() {
  return (
    <div className='@container motion-safe:animate-pulse'>
      <div className='flex flex-col gap-4 @sm:flex-row @sm:items-center'>
        <div className='h-[68px] min-w-0 rounded-md bg-surface-secondary @sm:flex-1' />
        <div className='grid grid-cols-1 gap-x-4 gap-y-1.5 @min-[280px]:@max-[383px]:grid-cols-2 @sm:w-36 @sm:shrink-0 @sm:grid-cols-1'>
          {Array.from({ length: 5 }, (_, index) => (
            <div key={index} className='h-4 rounded bg-surface-secondary' />
          ))}
        </div>
      </div>
    </div>
  );
}
