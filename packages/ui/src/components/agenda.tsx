/* oxlint-disable jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions -- HeroUI Pro uses pointer-driven event surfaces; all-day events expose button semantics. */
'use client';

import { Button, cn } from '@heroui/react';
import {
  CalendarDate,
  CalendarDateTime,
  getLocalTimeZone,
  isSameDay,
  startOfWeek,
  today,
} from '@internationalized/date';
import {
  animate,
  domAnimation,
  LazyMotion,
  m,
  type MotionStyle,
  useMotionValue,
  useTransform,
} from 'motion/react';
import type {
  ComponentPropsWithRef,
  CSSProperties,
  MouseEvent as ReactMouseEvent,
  PointerEvent as ReactPointerEvent,
  ReactElement,
  ReactNode,
  Ref,
} from 'react';
import {
  Children,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useLocale } from 'react-aria-components';

import { Segment } from './segment';

export type AgendaView = 'day' | 'month' | 'week';
export type AgendaEventStatus = 'confirmed' | 'unconfirmed';
const defaultCollapsedLabel = (count: number) =>
  `${count} event${count === 1 ? '' : 's'}`;
const defaultMoreLabel = (count: number) => `${count} more`;

export interface AgendaEventData {
  color?: string;
  end: CalendarDateTime;
  id: string;
  isAllDay?: boolean;
  isReadOnly?: boolean;
  start: CalendarDateTime;
  status?: AgendaEventStatus;
  title: string;
}
export interface AgendaStateOptions {
  date?: CalendarDate;
  defaultDate?: CalendarDate;
  defaultSelectedEventId?: null | string;
  defaultView?: AgendaView;
  endHour?: number;
  events: AgendaEventData[];
  onDateChange?: (date: CalendarDate) => void;
  onEventCreate?: (event: {
    end: CalendarDateTime;
    start: CalendarDateTime;
  }) => void;
  onEventDelete?: (id: string) => void;
  onEventMove?: (
    id: string,
    start: CalendarDateTime,
    end: CalendarDateTime,
  ) => void;
  onEventResize?: (
    id: string,
    start: CalendarDateTime,
    end: CalendarDateTime,
  ) => void;
  onEventSelect?: (id: null | string) => void;
  onViewChange?: (view: AgendaView) => void;
  selectedEventId?: null | string;
  slotDuration?: number;
  startHour?: number;
  view?: AgendaView;
  weekDays?: number;
}
export interface AgendaLayoutItem {
  colSpan: number;
  colStart: number;
  event: AgendaEventData;
  row: number;
}
export interface AgendaDropPreview {
  color?: string;
  dateStr: string;
  heightPx?: number;
  topPx?: number;
}
export type AgendaDragState =
  { type: 'idle' } | { eventId: string; type: 'moving' | 'resizing' };
export interface AgendaState {
  allDayCountPerDay: number[];
  allDayEvents: AgendaEventData[];
  allDayLayout: AgendaLayoutItem[];
  date: CalendarDate;
  dragState: AgendaDragState;
  dropPreview: AgendaDropPreview | null;
  endHour: number;
  events: AgendaEventData[];
  getAllEventsForDay: (date: CalendarDate) => AgendaEventData[];
  getEventLayout: (id: string) => { columnIndex: number; totalColumns: number };
  getEventsForDay: (date: CalendarDate) => AgendaEventData[];
  getMonthRowLayout: (week: CalendarDate[]) => {
    items: AgendaLayoutItem[];
    rowCount: number;
    rowCountPerCol: number[];
  };
  getPerCellEvents: (
    date: CalendarDate,
    week: CalendarDate[],
  ) => AgendaEventData[];
  goToNext: () => void;
  goToPrevious: () => void;
  goToToday: () => void;
  heading: string;
  isAllDayExpanded: boolean;
  locale: string;
  onEventCreate?: AgendaStateOptions['onEventCreate'];
  onEventDelete?: AgendaStateOptions['onEventDelete'];
  onEventMove?: AgendaStateOptions['onEventMove'];
  onEventResize?: AgendaStateOptions['onEventResize'];
  selectEvent: (id: null | string) => void;
  selectedEventId: null | string;
  setDate: (date: CalendarDate) => void;
  setDragState: (state: AgendaDragState) => void;
  setDropPreview: (preview: AgendaDropPreview | null) => void;
  setView: (view: AgendaView) => void;
  slotDuration: number;
  startHour: number;
  timeZone: string;
  toggleAllDayExpanded: () => void;
  view: AgendaView;
  visibleDays: CalendarDate[];
  visibleWeeks: CalendarDate[][];
}
function dateTimeAt(
  date: CalendarDate,
  startHour: number,
  minutes: number,
): CalendarDateTime {
  const total = startHour * 60 + minutes;
  return new CalendarDateTime(
    date.year,
    date.month,
    date.day,
    Math.floor(total / 60),
    total % 60,
  );
}

export function useAgenda(options: AgendaStateOptions): AgendaState {
  const {
    defaultDate,
    defaultSelectedEventId = null,
    defaultView = 'week',
    endHour = 24,
    events,
    onDateChange,
    onEventCreate,
    onEventDelete,
    onEventMove,
    onEventResize,
    onEventSelect,
    onViewChange,
    slotDuration = 60,
    startHour = 0,
    weekDays = 7,
  } = options;
  const { locale } = useLocale();
  const timeZone = getLocalTimeZone();
  const initialDate = defaultDate ?? today(timeZone);
  const [internalView, setInternalView] = useState<AgendaView>(defaultView);
  const view = options.view ?? internalView;
  const [internalDate, setInternalDate] = useState<CalendarDate>(initialDate);
  const date = options.date ?? internalDate;
  const [internalSelected, setInternalSelected] = useState<null | string>(
    defaultSelectedEventId,
  );
  const selectedEventId = options.selectedEventId ?? internalSelected;
  const [isAllDayExpanded, setAllDayExpanded] = useState(true);
  const [dragState, setDragState] = useState<AgendaDragState>({ type: 'idle' });
  const [dropPreview, setDropPreview] = useState<AgendaDropPreview | null>(
    null,
  );
  const setView = useCallback(
    (value: AgendaView) => {
      if (options.view === undefined) setInternalView(value);
      onViewChange?.(value);
    },
    [onViewChange, options.view],
  );
  const setDate = useCallback(
    (value: CalendarDate) => {
      if (options.date === undefined) setInternalDate(value);
      onDateChange?.(value);
    },
    [onDateChange, options.date],
  );
  const selectEvent = useCallback(
    (id: null | string) => {
      if (options.selectedEventId === undefined) setInternalSelected(id);
      onEventSelect?.(id);
    },
    [onEventSelect, options.selectedEventId],
  );
  const visibleDays = useMemo(() => {
    if (view === 'day') return [date];
    if (view !== 'week') return [];
    if (weekDays >= 7) {
      const weekStart = startOfWeek(date, locale);

      return Array.from({ length: 7 }, (_, index) =>
        weekStart.add({ days: index }),
      );
    }

    const before = Math.floor(weekDays / 2);

    return Array.from({ length: weekDays }, (_, index) =>
      date.add({ days: index - before }),
    );
  }, [date, locale, view, weekDays]);
  const visibleWeeks = useMemo(() => {
    if (view !== 'month') return [];
    const monthStart = startOfWeek(date.set({ day: 1 }), locale);
    let cursor = monthStart;
    const weeks: CalendarDate[][] = [];

    for (let row = 0; row < 6; row++) {
      const week: CalendarDate[] = [];

      for (let column = 0; column < 7; column++) {
        week.push(cursor);
        cursor = cursor.add({ days: 1 });
      }
      weeks.push(week);
    }

    return weeks;
  }, [date, locale, view]);
  const getEventsForDay = useCallback(
    (day: CalendarDate) =>
      events.filter((event) => !event.isAllDay && isSameDay(event.start, day)),
    [events],
  );
  const eventLayout = useMemo(() => {
    const layout = new Map<
      string,
      { columnIndex: number; totalColumns: number }
    >();
    const timedEvents = events.filter((event) => !event.isAllDay);
    const toMinute = (value: CalendarDateTime) =>
      value.day * 1440 +
      value.month * 44_640 +
      value.year * 525_600 +
      value.hour * 60 +
      value.minute;
    const overlaps = (first: AgendaEventData, second: AgendaEventData) =>
      toMinute(first.start) < toMinute(second.end) &&
      toMinute(second.start) < toMinute(first.end);
    const visited = new Set<string>();

    for (const event of timedEvents) {
      if (visited.has(event.id)) continue;

      const group = [event];

      visited.add(event.id);
      let changed = true;

      while (changed) {
        changed = false;
        for (const candidate of timedEvents) {
          if (
            !visited.has(candidate.id) &&
            group.some((item) => overlaps(item, candidate))
          ) {
            group.push(candidate);
            visited.add(candidate.id);
            changed = true;
          }
        }
      }

      group.sort(
        (first, second) => toMinute(first.start) - toMinute(second.start),
      );
      const columns: AgendaEventData[][] = [];

      for (const item of group) {
        let placed = false;

        for (let column = 0; column < columns.length; column++) {
          const items = columns[column];
          const last = items?.at(-1);

          if (items && last && toMinute(last.end) <= toMinute(item.start)) {
            items.push(item);
            layout.set(item.id, { columnIndex: column, totalColumns: 0 });
            placed = true;
            break;
          }
        }

        if (!placed) {
          columns.push([item]);
          layout.set(item.id, {
            columnIndex: columns.length - 1,
            totalColumns: 0,
          });
        }
      }

      for (const item of group) {
        const position = layout.get(item.id);

        if (position) position.totalColumns = columns.length;
      }
    }

    return layout;
  }, [events]);
  const getAllEventsForDay = useCallback(
    (day: CalendarDate) =>
      events.filter((event) => isSameDay(event.start, day)),
    [events],
  );
  const getEventLayout = useCallback(
    (id: string) => eventLayout.get(id) ?? { columnIndex: 0, totalColumns: 1 },
    [eventLayout],
  );
  const layoutForWeek = useCallback(
    (week: CalendarDate[]) => {
      if (week.length === 0)
        return { items: [], rowCount: 0, rowCountPerCol: [] };

      const firstDay = week[0] as CalendarDate;
      const lastDay = week.at(-1) as CalendarDate;
      const items: AgendaLayoutItem[] = [];
      const rowEnds: number[] = [];
      const spanningEvents = events.filter((event) => {
        if (!event.isAllDay) return false;
        const eventStart = new CalendarDate(
          event.start.year,
          event.start.month,
          event.start.day,
        );
        const eventEnd = new CalendarDate(
          event.end.year,
          event.end.month,
          event.end.day,
        );

        if (eventEnd.compare(firstDay) < 0 || eventStart.compare(lastDay) > 0)
          return false;
        const visibleStart =
          eventStart.compare(firstDay) < 0 ? firstDay : eventStart;
        const visibleEnd = eventEnd.compare(lastDay) > 0 ? lastDay : eventEnd;
        const colStart = week.findIndex((day) => isSameDay(day, visibleStart));
        let colEnd = colStart;

        for (
          let column = colStart;
          column < week.length &&
          (week[column] as CalendarDate).compare(visibleEnd) <= 0;
          column++
        )
          colEnd = column;

        return colEnd - colStart >= 1;
      });

      for (const event of spanningEvents) {
        const eventStart = new CalendarDate(
          event.start.year,
          event.start.month,
          event.start.day,
        );
        const eventEnd = new CalendarDate(
          event.end.year,
          event.end.month,
          event.end.day,
        );
        const visibleStart =
          eventStart.compare(firstDay) < 0 ? firstDay : eventStart;
        const visibleEnd = eventEnd.compare(lastDay) > 0 ? lastDay : eventEnd;
        const colStart = Math.max(
          0,
          week.findIndex((day) => isSameDay(day, visibleStart)),
        );
        let colEnd = colStart;

        for (
          let column = colStart;
          column < week.length &&
          (week[column] as CalendarDate).compare(visibleEnd) <= 0;
          column++
        )
          colEnd = column;

        const colSpan = colEnd - colStart + 1;
        let row = rowEnds.findIndex((end) => end < colStart);

        if (row < 0) {
          row = rowEnds.length;
          rowEnds.push(-1);
        }
        rowEnds[row] = colStart + colSpan - 1;
        items.push({ colSpan, colStart, event, row });
      }
      const rowCountPerCol = week.map((_day, index) =>
        items
          .filter(
            (item) =>
              index >= item.colStart && index < item.colStart + item.colSpan,
          )
          .reduce((max, item) => Math.max(max, item.row + 1), 0),
      );
      return { items, rowCount: rowEnds.length, rowCountPerCol };
    },
    [events],
  );
  const allDayEvents = useMemo(
    () => events.filter((event) => event.isAllDay),
    [events],
  );
  const allDayLayout = useMemo(() => {
    if (visibleDays.length === 0) return [];

    const firstDay = visibleDays[0] as CalendarDate;
    const lastDay = visibleDays.at(-1) as CalendarDate;
    const items: AgendaLayoutItem[] = [];
    const rowEnds: number[] = [];

    for (const event of allDayEvents) {
      const eventStart = new CalendarDate(
        event.start.year,
        event.start.month,
        event.start.day,
      );
      const eventEnd = new CalendarDate(
        event.end.year,
        event.end.month,
        event.end.day,
      );
      const visibleStart =
        eventStart.compare(firstDay) < 0 ? firstDay : eventStart;
      const visibleEnd = eventEnd.compare(lastDay) > 0 ? lastDay : eventEnd;

      if (visibleStart.compare(lastDay) > 0 || visibleEnd.compare(firstDay) < 0)
        continue;

      const colStart = visibleDays.findIndex((day) =>
        isSameDay(day, visibleStart),
      );

      if (colStart < 0) continue;

      let colEnd = colStart;

      for (
        let column = colStart;
        column < visibleDays.length &&
        (visibleDays[column] as CalendarDate).compare(visibleEnd) <= 0;
        column++
      )
        colEnd = column;

      const colSpan = colEnd - colStart + 1;
      let row = rowEnds.findIndex((end) => end < colStart);

      if (row < 0) {
        row = rowEnds.length;
        rowEnds.push(-1);
      }
      rowEnds[row] = colStart + colSpan - 1;
      items.push({ colSpan, colStart, event, row });
    }

    return items;
  }, [allDayEvents, visibleDays]);
  const allDayCountPerDay = useMemo(
    () =>
      visibleDays.map(
        (day) =>
          allDayEvents.filter((event) => {
            const eventStart = new CalendarDate(
              event.start.year,
              event.start.month,
              event.start.day,
            );
            const eventEnd = new CalendarDate(
              event.end.year,
              event.end.month,
              event.end.day,
            );

            return eventStart.compare(day) <= 0 && eventEnd.compare(day) >= 0;
          }).length,
      ),
    [allDayEvents, visibleDays],
  );
  const heading = useMemo(() => {
    const formatter = new Intl.DateTimeFormat(locale, {
      month: 'long',
      year: 'numeric',
    });

    return formatter.format(date.toDate(timeZone));
  }, [date, locale, timeZone]);
  return {
    allDayCountPerDay,
    allDayEvents,
    allDayLayout,
    date,
    dragState,
    dropPreview,
    endHour,
    events,
    getAllEventsForDay,
    getEventLayout,
    getEventsForDay,
    getMonthRowLayout: layoutForWeek,
    getPerCellEvents: (day, week) => {
      const spanning = new Set(
        layoutForWeek(week).items.map((item) => item.event.id),
      );

      return events.filter((event) => {
        if (spanning.has(event.id)) return false;
        const eventStart = new CalendarDate(
          event.start.year,
          event.start.month,
          event.start.day,
        );
        const eventEnd = new CalendarDate(
          event.end.year,
          event.end.month,
          event.end.day,
        );

        return eventStart.compare(day) <= 0 && eventEnd.compare(day) >= 0;
      });
    },
    goToNext: () =>
      setDate(
        view === 'day'
          ? date.add({ days: 1 })
          : view === 'week'
            ? date.add({ days: weekDays })
            : date.add({ months: 1 }),
      ),
    goToPrevious: () =>
      setDate(
        view === 'day'
          ? date.subtract({ days: 1 })
          : view === 'week'
            ? date.subtract({ days: weekDays })
            : date.subtract({ months: 1 }),
      ),
    goToToday: () => setDate(today(timeZone)),
    heading,
    isAllDayExpanded,
    locale,
    onEventCreate,
    onEventDelete,
    onEventMove,
    onEventResize,
    selectEvent,
    selectedEventId,
    setDate,
    setDragState,
    setDropPreview,
    setView,
    slotDuration,
    startHour,
    timeZone,
    toggleAllDayExpanded: () => setAllDayExpanded((expanded) => !expanded),
    view,
    visibleDays,
    visibleWeeks,
  };
}

const DEFAULT_SLOT_HEIGHT = 60;
const CURRENT_TIME_LABEL_CLEARANCE = 20;
const SNAP_MINUTES = 5;

interface AgendaContextValue extends AgendaState {
  slotHeight: number;
}

const AgendaContext = createContext<AgendaContextValue | null>(null);
function useAgendaContext(): AgendaContextValue {
  const value = useContext(AgendaContext);
  if (!value)
    throw new Error('Agenda components must be used within Agenda.Root');
  return value;
}
export interface AgendaRootProps
  extends AgendaState, Omit<ComponentPropsWithRef<'div'>, 'onSelect'> {}

function assignRef<T>(ref: Ref<T> | undefined, value: T | null): void {
  if (typeof ref === 'function') ref(value);
  else if (ref) ref.current = value;
}

function readSlotHeight(element: HTMLElement | null): number {
  const agenda = element?.closest<HTMLElement>("[data-slot='agenda']");
  const customProperty = agenda
    ? Number.parseFloat(
        getComputedStyle(agenda).getPropertyValue('--agenda-slot-height'),
      )
    : Number.NaN;

  if (Number.isFinite(customProperty) && customProperty > 0)
    return customProperty;

  const timeGrid = element?.closest<HTMLElement>(
    "[data-slot='agenda-time-grid']",
  );
  const slot =
    element?.querySelector<HTMLElement>("[data-slot='agenda-time-slot']") ??
    timeGrid?.querySelector<HTMLElement>("[data-slot='agenda-time-slot']");
  const measured = slot?.getBoundingClientRect().height ?? Number.NaN;

  return Number.isFinite(measured) && measured > 0
    ? measured
    : DEFAULT_SLOT_HEIGHT;
}

function useAgendaSlotHeight(ref: React.RefObject<HTMLElement | null>): number {
  const [slotHeight, setSlotHeight] = useState(DEFAULT_SLOT_HEIGHT);

  useLayoutEffect(() => {
    const measure = () => {
      const next = readSlotHeight(ref.current);

      setSlotHeight((current) =>
        Math.abs(current - next) < 0.5 ? current : next,
      );
    };

    measure();
    window.addEventListener('resize', measure);

    const agenda = ref.current?.closest<HTMLElement>("[data-slot='agenda']");
    const observer =
      typeof ResizeObserver !== 'undefined' && agenda
        ? new ResizeObserver(measure)
        : null;

    if (observer && agenda) observer.observe(agenda);

    return () => {
      window.removeEventListener('resize', measure);
      observer?.disconnect();
    };
  }, [ref]);

  return slotHeight;
}

function AgendaRoot({
  allDayCountPerDay,
  allDayEvents,
  allDayLayout,
  children,
  className,
  date,
  dragState,
  dropPreview,
  endHour,
  events,
  getAllEventsForDay,
  getEventLayout,
  getEventsForDay,
  getMonthRowLayout,
  getPerCellEvents,
  goToNext,
  goToPrevious,
  goToToday,
  heading,
  isAllDayExpanded,
  locale,
  onEventCreate,
  onEventDelete,
  onEventMove,
  onEventResize,
  ref,
  selectEvent,
  selectedEventId,
  setDate,
  setDragState,
  setDropPreview,
  setView,
  slotDuration,
  startHour,
  timeZone,
  toggleAllDayExpanded,
  view,
  visibleDays,
  visibleWeeks,
  ...props
}: AgendaRootProps): ReactElement {
  const rootRef = useRef<HTMLDivElement>(null);
  const mergedRef = useCallback(
    (element: HTMLDivElement | null) => {
      rootRef.current = element;
      assignRef(ref, element);
    },
    [ref],
  );
  const slotHeight = useAgendaSlotHeight(rootRef);
  const context = useMemo<AgendaContextValue>(
    () => ({
      allDayCountPerDay,
      allDayEvents,
      allDayLayout,
      date,
      dragState,
      dropPreview,
      endHour,
      events,
      getAllEventsForDay,
      getEventLayout,
      getEventsForDay,
      getMonthRowLayout,
      getPerCellEvents,
      goToNext,
      goToPrevious,
      goToToday,
      heading,
      isAllDayExpanded,
      locale,
      onEventCreate,
      onEventDelete,
      onEventMove,
      onEventResize,
      selectEvent,
      selectedEventId,
      setDate,
      setDragState,
      setDropPreview,
      setView,
      slotDuration,
      slotHeight,
      startHour,
      timeZone,
      toggleAllDayExpanded,
      view,
      visibleDays,
      visibleWeeks,
    }),
    [
      allDayCountPerDay,
      allDayEvents,
      allDayLayout,
      date,
      dragState,
      dropPreview,
      endHour,
      events,
      getAllEventsForDay,
      getEventLayout,
      getEventsForDay,
      getMonthRowLayout,
      getPerCellEvents,
      goToNext,
      goToPrevious,
      goToToday,
      heading,
      isAllDayExpanded,
      locale,
      onEventCreate,
      onEventDelete,
      onEventMove,
      onEventResize,
      selectEvent,
      selectedEventId,
      setDate,
      setDragState,
      setDropPreview,
      setView,
      slotDuration,
      slotHeight,
      startHour,
      timeZone,
      toggleAllDayExpanded,
      view,
      visibleDays,
      visibleWeeks,
    ],
  );
  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (
        (event.key === 'Delete' || event.key === 'Backspace') &&
        selectedEventId &&
        onEventDelete
      ) {
        event.preventDefault();
        onEventDelete(selectedEventId);
      }
    },
    [onEventDelete, selectedEventId],
  );

  return (
    <AgendaContext value={context}>
      <LazyMotion features={domAnimation}>
        <div
          {...props}
          ref={mergedRef}
          className={cn('agenda', `agenda--${view}`, className)}
          data-slot='agenda'
          data-view={view}
          tabIndex={-1}
          onKeyDown={handleKeyDown}
        >
          {children}
        </div>
      </LazyMotion>
    </AgendaContext>
  );
}

function slotDiv(name: string, tag: 'div' | 'header' = 'div') {
  return function Slot({
    children,
    className,
    ...props
  }: ComponentPropsWithRef<'div'>): ReactElement {
    const Tag = tag;
    return (
      <Tag
        {...props}
        className={cn(`agenda__${name}`, className)}
        data-slot={`agenda-${name}`}
      >
        {children}
      </Tag>
    );
  };
}
const AgendaHeader: ReturnType<typeof slotDiv> = slotDiv('header', 'header');
const AgendaNavigation: ReturnType<typeof slotDiv> = slotDiv('navigation');
function AgendaBody({
  children,
  className,
  ...props
}: ComponentPropsWithRef<'div'>): ReactElement {
  const { view } = useAgendaContext();

  return (
    <div
      {...props}
      className={cn(
        'agenda__body',
        view === 'month' && 'agenda__body--month',
        className,
      )}
      data-slot='agenda-body'
    >
      {children}
    </div>
  );
}

function AgendaHeading({
  children,
  className,
  ...props
}: ComponentPropsWithRef<'h1'>): ReactElement {
  const { heading } = useAgendaContext();
  return (
    <h1
      {...props}
      className={cn('agenda__heading', className)}
      data-slot='agenda-heading'
    >
      {children ?? heading}
    </h1>
  );
}

function AgendaNavButton({
  children,
  className,
  slot,
}: {
  children?: ReactNode;
  className?: string;
  slot?: 'next' | 'previous';
}): ReactElement {
  const agenda = useAgendaContext();
  return (
    <Button
      isIconOnly
      aria-label={slot === 'previous' ? 'Previous' : 'Next'}
      className={cn('agenda__nav-button', className) ?? 'agenda__nav-button'}
      size='sm'
      variant='ghost'
      onPress={slot === 'previous' ? agenda.goToPrevious : agenda.goToNext}
    >
      {children ?? (
        <svg
          fill='none'
          height='16'
          stroke='currentColor'
          strokeWidth='2'
          viewBox='0 0 24 24'
          width='16'
        >
          <path d={slot === 'previous' ? 'M15 18l-6-6 6-6' : 'M9 18l6-6-6-6'} />
        </svg>
      )}
    </Button>
  );
}

function AgendaTodayButton({
  children = 'Today',
  className,
}: {
  children?: ReactNode;
  className?: string;
}): ReactElement {
  return (
    <Button
      className={
        cn('agenda__today-button', className) ?? 'agenda__today-button'
      }
      size='sm'
      variant='outline'
      onPress={useAgendaContext().goToToday}
    >
      {children}
    </Button>
  );
}

function AgendaViewSelector({
  children,
  className,
  size = 'sm',
}: {
  children?: ReactNode;
  className?: string;
  size?: 'lg' | 'md' | 'sm';
}): ReactElement {
  const { setView, view } = useAgendaContext();
  return (
    <Segment
      className={
        cn('agenda__view-selector', className) ?? 'agenda__view-selector'
      }
      selectedKey={view}
      size={size}
      onSelectionChange={(next) => {
        if (next === 'day' || next === 'week' || next === 'month') {
          setView(next);
        }
      }}
    >
      {children ??
        (['day', 'week', 'month'] as const).map((item) => (
          <Segment.Item id={item} key={item}>
            {item[0]?.toUpperCase()}
            {item.slice(1)}
          </Segment.Item>
        ))}
    </Segment>
  );
}

function isWeekend(date: CalendarDate, timeZone: string): boolean {
  const day = date.toDate(timeZone).getDay();

  return day === 0 || day === 6;
}

function AgendaDayHeader({
  className,
  date,
  ...props
}: ComponentPropsWithRef<'div'> & { date: CalendarDate }): ReactElement {
  const { locale, timeZone } = useAgendaContext();
  const isToday = isSameDay(date, today(getLocalTimeZone()));
  const weekday = useMemo(
    () =>
      new Intl.DateTimeFormat(locale, { weekday: 'short' }).format(
        date.toDate(timeZone),
      ),
    [date, locale, timeZone],
  );

  return (
    <div
      {...props}
      className={cn('agenda__day-header', className)}
      data-slot='agenda-day-header'
      data-today={isToday || undefined}
      data-weekend={isWeekend(date, timeZone) || undefined}
    >
      <span
        className='agenda__day-header-name'
        data-slot='agenda-day-header-name'
        data-today={isToday || undefined}
      >
        {weekday}
      </span>
      <span
        className='agenda__day-header-date'
        data-slot='agenda-day-header-date'
        data-today={isToday || undefined}
      >
        {date.day}
      </span>
    </div>
  );
}

function AgendaWeekHeader({
  children,
  className,
  ...props
}: ComponentPropsWithRef<'div'>): ReactElement {
  const { visibleDays } = useAgendaContext();
  return (
    <div
      {...props}
      className={cn('agenda__week-header', className)}
      data-slot='agenda-week-header'
    >
      {children ??
        visibleDays.map((date) => (
          <AgendaDayHeader date={date} key={date.toString()} />
        ))}
    </div>
  );
}

function AgendaAllDaySection({
  children,
  className,
  collapsedLabel = defaultCollapsedLabel,
  style,
  ...props
}: ComponentPropsWithRef<'div'> & {
  collapsedLabel?: (count: number) => string;
}): ReactElement {
  const agenda = useAgendaContext();
  return (
    <div
      {...props}
      className={cn('agenda__all-day-section', className)}
      data-expanded={agenda.isAllDayExpanded || undefined}
      data-slot='agenda-all-day-section'
      style={{
        gridTemplateColumns: `repeat(${Math.max(1, agenda.visibleDays.length)}, minmax(0, 1fr))`,
        ...style,
      }}
    >
      <div className='agenda__all-day-dividers'>
        {agenda.visibleDays.map((day) => (
          <div
            className='agenda__all-day-divider'
            data-weekend={isWeekend(day, agenda.timeZone) || undefined}
            key={day.toString()}
          />
        ))}
      </div>
      <button
        aria-label={
          agenda.isAllDayExpanded
            ? 'Collapse all-day events'
            : 'Expand all-day events'
        }
        className='agenda__all-day-toggle'
        data-expanded={agenda.isAllDayExpanded || undefined}
        type='button'
        onClick={agenda.toggleAllDayExpanded}
      >
        <svg fill='none' height='10' viewBox='0 0 10 10' width='10'>
          <path
            d='M3 4l2 2 2-2'
            stroke='currentColor'
            strokeLinecap='round'
            strokeLinejoin='round'
            strokeWidth='1.5'
          />
        </svg>
      </button>
      {agenda.isAllDayExpanded
        ? children
        : agenda.allDayCountPerDay.map((count, index) => (
            <span
              className='agenda__all-day-summary'
              key={agenda.visibleDays[index]?.toString()}
              style={{ gridColumn: index + 1 }}
            >
              {count ? collapsedLabel(count) : null}
            </span>
          ))}
    </div>
  );
}

function AgendaAllDayLabel({
  children,
  className,
  ...props
}: ComponentPropsWithRef<'span'>): ReactElement {
  return (
    <span
      {...props}
      className={cn('agenda__all-day-label', className)}
      data-slot='agenda-all-day-label'
    >
      {children}
    </span>
  );
}

function AgendaAllDayEvent({
  children,
  className,
  colSpan,
  colStart,
  event,
  row,
  style,
  ...props
}: ComponentPropsWithRef<'div'> & AgendaLayoutItem): ReactElement {
  const agenda = useAgendaContext();
  return (
    <div
      {...props}
      className={cn('agenda__all-day-event', className)}
      data-selected={agenda.selectedEventId === event.id || undefined}
      data-slot='agenda-all-day-event'
      data-status={event.status ?? 'confirmed'}
      role='button'
      style={
        {
          gridColumn: `${colStart + 1} / span ${colSpan}`,
          gridRow: row + 1,
          '--agenda-event-accent': event.color,
          ...style,
        } as CSSProperties
      }
      tabIndex={0}
      onClick={() => agenda.selectEvent(event.id)}
    >
      {children ?? event.title}
    </div>
  );
}

function AgendaTimeGrid({
  children,
  className,
  ...props
}: ComponentPropsWithRef<'div'>): ReactElement {
  const agenda = useAgendaContext();
  const { locale } = useLocale();
  const gridRef = useRef<HTMLDivElement>(null);
  const hasAutoScrolled = useRef(false);
  const pixelsPerHour = (60 * agenda.slotHeight) / agenda.slotDuration;
  const [currentMinute, setCurrentMinute] = useState(() => {
    const now = new Date();

    return now.getHours() * 60 + now.getMinutes();
  });
  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();

      setCurrentMinute(now.getHours() * 60 + now.getMinutes());
    }, 60_000);

    return () => clearInterval(interval);
  }, []);
  const hours = useMemo(
    () =>
      Array.from(
        { length: agenda.endHour - agenda.startHour },
        (_, index) => agenda.startHour + index,
      ),
    [agenda.endHour, agenda.startHour],
  );
  const labels = useMemo(() => {
    const formatter = new Intl.DateTimeFormat(locale, { hour: 'numeric' });
    const reference = today(agenda.timeZone);

    return hours.map((hour) => {
      const value = reference.toDate(agenda.timeZone);

      value.setHours(hour % 24, 0, 0, 0);

      return {
        hour,
        isFirst: hour === agenda.startHour,
        label: formatter.format(value),
        nearCurrent:
          Math.abs(hour * 60 - currentMinute) < CURRENT_TIME_LABEL_CLEARANCE,
      };
    });
  }, [agenda.startHour, agenda.timeZone, currentMinute, hours, locale]);
  useEffect(() => {
    if (hasAutoScrolled.current) return;

    const frame = requestAnimationFrame(() => {
      if (!gridRef.current || hasAutoScrolled.current) return;

      const currentHour = new Date().getHours();

      if (currentHour >= agenda.startHour && currentHour < agenda.endHour) {
        const pixelsPerMinute = agenda.slotHeight / agenda.slotDuration;
        const target =
          (currentHour - agenda.startHour - 1) * 60 * pixelsPerMinute;

        gridRef.current.scrollTop = Math.max(0, target);
      }
      hasAutoScrolled.current = true;
    });

    return () => cancelAnimationFrame(frame);
  }, [
    agenda.endHour,
    agenda.slotDuration,
    agenda.slotHeight,
    agenda.startHour,
  ]);

  return (
    <div
      ref={gridRef}
      {...props}
      className={cn(
        'agenda__time-grid',
        `agenda__time-grid--${agenda.view}`,
        className,
      )}
      data-slot='agenda-time-grid'
    >
      <div className='agenda__time-labels' data-slot='agenda-time-labels'>
        {labels.map(({ hour, isFirst, label, nearCurrent }) => (
          <div
            className='agenda__time-label'
            data-slot='agenda-time-label'
            key={hour}
            style={{ height: pixelsPerHour }}
          >
            {!isFirst ? (
              <span style={{ opacity: nearCurrent ? 0 : 1 }}>{label}</span>
            ) : null}
          </div>
        ))}
      </div>
      {children}
    </div>
  );
}

function AgendaDayColumn({
  children,
  className,
  date,
  ...props
}: ComponentPropsWithRef<'div'> & { date: CalendarDate }): ReactElement {
  const agenda = useAgendaContext();
  const columnRef = useRef<HTMLDivElement>(null);
  const [createPreview, setCreatePreview] = useState<{
    heightPx: number;
    topPx: number;
  } | null>(null);
  const slots = Math.floor(
    ((agenda.endHour - agenda.startHour) * 60) / agenda.slotDuration,
  );
  const pixelsPerMinute = agenda.slotHeight / agenda.slotDuration;
  const minuteAt = useCallback(
    (clientY: number) => {
      const rect = columnRef.current?.getBoundingClientRect();
      if (!rect) return 0;
      const totalMinutes = (agenda.endHour - agenda.startHour) * 60;
      const ratio = Math.max(
        0,
        Math.min(1, (clientY - rect.top) / rect.height),
      );
      return Math.round((ratio * totalMinutes) / 5) * 5;
    },
    [agenda.endHour, agenda.startHour],
  );
  const handleCreate = useCallback(
    (event: ReactMouseEvent<HTMLDivElement>) => {
      if (
        event.button !== 0 ||
        !agenda.onEventCreate ||
        (event.target as Element).closest("[data-slot='agenda-event']")
      )
        return;
      agenda.selectEvent(null);
      const startMinute = minuteAt(event.clientY);
      setCreatePreview({
        heightPx: 5 * pixelsPerMinute,
        topPx: startMinute * pixelsPerMinute,
      });
      const move = (moveEvent: MouseEvent) => {
        const minute = minuteAt(moveEvent.clientY);
        const start = Math.min(startMinute, minute);
        const end = Math.max(startMinute, minute);
        setCreatePreview({
          heightPx: Math.max(end - start, 5) * pixelsPerMinute,
          topPx: start * pixelsPerMinute,
        });
      };
      const up = (upEvent: MouseEvent) => {
        document.removeEventListener('mousemove', move);
        document.removeEventListener('mouseup', up);
        setCreatePreview(null);
        const minute = minuteAt(upEvent.clientY);
        const start = Math.min(startMinute, minute);
        const end = Math.max(startMinute, minute);
        const finalEnd = end === start ? start + 60 : end;
        agenda.onEventCreate?.({
          start: dateTimeAt(date, agenda.startHour, start),
          end: dateTimeAt(date, agenda.startHour, finalEnd),
        });
      };
      document.addEventListener('mousemove', move);
      document.addEventListener('mouseup', up);
    },
    [agenda, date, minuteAt, pixelsPerMinute],
  );
  return (
    <div
      ref={columnRef}
      {...props}
      className={cn('agenda__day-column', className)}
      data-date={date.toString()}
      data-slot='agenda-day-column'
      data-weekend={
        [0, 6].includes(date.toDate(agenda.timeZone).getDay()) || undefined
      }
      onMouseDown={handleCreate}
    >
      {Array.from({ length: slots }, (_, index) => (
        <div
          className='agenda__time-slot'
          data-last={index === slots - 1 || undefined}
          data-slot='agenda-time-slot'
          data-slot-index={index}
          key={index}
        />
      ))}
      {children}
      {createPreview ? (
        <m.div
          animate={{ opacity: 1, scale: 1 }}
          className='agenda__create-preview'
          initial={{ opacity: 0, scale: 0.96 }}
          style={{
            height: createPreview.heightPx,
            top: createPreview.topPx,
          }}
          transition={{ bounce: 0, duration: 0.15, type: 'spring' }}
        />
      ) : null}
      {agenda.dropPreview?.dateStr === date.toString() &&
      agenda.dropPreview.topPx != null ? (
        <div
          className='agenda__drop-preview'
          style={{
            borderColor: agenda.dropPreview.color,
            height: agenda.dropPreview.heightPx,
            top: agenda.dropPreview.topPx,
          }}
        />
      ) : null}
    </div>
  );
}

function AgendaEvent({
  children,
  className,
  event,
  style,
}: {
  children?: ReactNode;
  className?: string;
  event: AgendaEventData;
  style?: CSSProperties;
}): ReactElement {
  const agenda = useAgendaContext();
  const eventRef = useRef<HTMLDivElement>(null);
  const suppressClick = useRef(false);
  const [isDragging, setDragging] = useState(false);
  const [isResizing, setResizing] = useState(false);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const resizeDelta = useMotionValue(0);
  const pixelsPerMinute = agenda.slotHeight / agenda.slotDuration;
  const totalMinutes = (agenda.endHour - agenda.startHour) * 60;
  const top =
    ((event.start.hour - agenda.startHour) * 60 + event.start.minute) *
    pixelsPerMinute;
  const minutes =
    (event.end.hour - event.start.hour) * 60 +
    event.end.minute -
    event.start.minute;
  const height = Math.max(minutes, SNAP_MINUTES) * pixelsPerMinute;
  const resizeHeight = useTransform(() => {
    const snappedDelta =
      Math.round(resizeDelta.get() / (SNAP_MINUTES * pixelsPerMinute)) *
      SNAP_MINUTES *
      pixelsPerMinute;
    const nextHeight = height + snappedDelta;
    const minHeight = SNAP_MINUTES * pixelsPerMinute;
    const maxHeight = totalMinutes * pixelsPerMinute - top;

    return Math.max(minHeight, Math.min(maxHeight, nextHeight));
  });
  const layout = agenda.getEventLayout(event.id);
  const width = 100 / layout.totalColumns;
  const eventStyle = {
    ...style,
    top: `${top}px`,
    ...(layout.totalColumns > 1
      ? {
          left: `calc(${layout.columnIndex * width}% + 2px)`,
          right: 'auto',
          width: `calc(${width}% - 4px)`,
        }
      : {}),
    ...(event.color
      ? {
          '--agenda-event-accent': event.color,
          '--agenda-event-color': `color-mix(in srgb, ${event.color} 15%, transparent)`,
        }
      : {}),
  } as CSSProperties;
  const handleClick = useCallback(
    (clickEvent: ReactMouseEvent<HTMLDivElement>) => {
      clickEvent.stopPropagation();
      if (suppressClick.current) {
        suppressClick.current = false;
        return;
      }
      agenda.selectEvent(event.id);
    },
    [agenda, event.id],
  );
  const handleMoveStart = useCallback(
    (pointer: ReactPointerEvent<HTMLDivElement>) => {
      if (
        pointer.button !== 0 ||
        !agenda.onEventMove ||
        event.isReadOnly ||
        (pointer.target as Element).closest('.agenda__resize-handle')
      )
        return;

      pointer.stopPropagation();
      pointer.preventDefault();
      const originX = pointer.clientX;
      const originY = pointer.clientY;
      let moved = false;
      const positionAt = (clientX: number, clientY: number) => {
        const horizontalDelta = clientX - originX;
        const verticalDelta = clientY - originY;
        const snappedPixels =
          Math.round(verticalDelta / (SNAP_MINUTES * pixelsPerMinute)) *
          SNAP_MINUTES *
          pixelsPerMinute;
        const minuteDelta = Math.round(snappedPixels / pixelsPerMinute);
        const column = eventRef.current?.closest<HTMLElement>(
          "[data-slot='agenda-day-column']",
        );
        const columnWidth = column?.getBoundingClientRect().width ?? 0;
        const daysDelta =
          columnWidth > 0 ? Math.round(horizontalDelta / columnWidth) : 0;
        const nextStart = event.start.add({
          days: daysDelta,
          minutes: minuteDelta,
        });

        return {
          daysDelta,
          minutesDelta: minuteDelta,
          newTopPx:
            ((nextStart.hour - agenda.startHour) * 60 + nextStart.minute) *
            pixelsPerMinute,
          targetDate: new CalendarDate(
            nextStart.year,
            nextStart.month,
            nextStart.day,
          ),
        };
      };
      const move = (moveEvent: PointerEvent) => {
        x.set(moveEvent.clientX - originX);
        y.set(moveEvent.clientY - originY);
        if (
          !moved &&
          (Math.abs(moveEvent.clientX - originX) > 3 ||
            Math.abs(moveEvent.clientY - originY) > 3)
        ) {
          moved = true;
          setDragging(true);
        }
        if (!moved) return;

        const { newTopPx, targetDate } = positionAt(
          moveEvent.clientX,
          moveEvent.clientY,
        );

        agenda.setDropPreview({
          ...(event.color ? { color: event.color } : {}),
          dateStr: targetDate.toString(),
          heightPx: height,
          topPx: newTopPx,
        });
      };
      const up = (upEvent: PointerEvent) => {
        document.removeEventListener('pointermove', move);
        document.removeEventListener('pointerup', up);
        setDragging(false);
        agenda.setDropPreview(null);
        if (!moved) return;

        const { daysDelta, minutesDelta } = positionAt(
          upEvent.clientX,
          upEvent.clientY,
        );

        if (Math.abs(minutesDelta) >= SNAP_MINUTES || daysDelta !== 0) {
          suppressClick.current = true;
          x.jump(0);
          y.jump(0);
          agenda.onEventMove?.(
            event.id,
            event.start.add({ days: daysDelta, minutes: minutesDelta }),
            event.end.add({ days: daysDelta, minutes: minutesDelta }),
          );
        } else {
          animate(x, 0, { bounce: 0.2, duration: 0.3, type: 'spring' });
          animate(y, 0, { bounce: 0.2, duration: 0.3, type: 'spring' });
        }
      };

      document.addEventListener('pointermove', move);
      document.addEventListener('pointerup', up);
    },
    [agenda, event, height, pixelsPerMinute, x, y],
  );
  const handleResizeStart = useCallback(
    (pointer: ReactPointerEvent<HTMLDivElement>) => {
      if (pointer.button !== 0 || !agenda.onEventResize || event.isReadOnly)
        return;

      pointer.stopPropagation();
      pointer.preventDefault();
      const originY = pointer.clientY;
      const minimumDelta = -(height - SNAP_MINUTES * pixelsPerMinute);
      const maximumDelta = totalMinutes * pixelsPerMinute - top - height;

      setResizing(true);
      const move = (moveEvent: PointerEvent) => {
        resizeDelta.set(
          Math.max(
            minimumDelta,
            Math.min(maximumDelta, moveEvent.clientY - originY),
          ),
        );
      };
      const up = (upEvent: PointerEvent) => {
        document.removeEventListener('pointermove', move);
        document.removeEventListener('pointerup', up);
        const clamped = Math.max(
          minimumDelta,
          Math.min(maximumDelta, upEvent.clientY - originY),
        );
        const snappedPixels =
          Math.round(clamped / (SNAP_MINUTES * pixelsPerMinute)) *
          SNAP_MINUTES *
          pixelsPerMinute;
        const minuteDelta = Math.round(snappedPixels / pixelsPerMinute);

        resizeDelta.jump(0);
        setResizing(false);
        if (Math.abs(minuteDelta) >= SNAP_MINUTES) {
          suppressClick.current = true;
          agenda.onEventResize?.(
            event.id,
            event.start,
            event.end.add({ minutes: minuteDelta }),
          );
        }
      };

      document.addEventListener('pointermove', move);
      document.addEventListener('pointerup', up);
    },
    [agenda, event, height, pixelsPerMinute, resizeDelta, top, totalMinutes],
  );
  const motionStyle = {
    ...eventStyle,
    height: isResizing ? resizeHeight : height,
    willChange: isDragging || isResizing ? 'transform' : undefined,
    x,
    y,
  } as unknown as MotionStyle;

  return (
    <m.div
      ref={eventRef}
      className={cn('agenda__event', className)}
      data-dragging={isDragging || undefined}
      data-event-id={event.id}
      data-readonly={event.isReadOnly || undefined}
      data-resizing={isResizing || undefined}
      data-selected={agenda.selectedEventId === event.id || undefined}
      data-slot='agenda-event'
      data-status={event.status ?? 'confirmed'}
      style={motionStyle}
      onClick={handleClick}
      onPointerDown={handleMoveStart}
    >
      {children ?? (
        <>
          <AgendaEventTitle>{event.title}</AgendaEventTitle>
          <AgendaEventTime event={event} />
        </>
      )}
      {agenda.onEventResize && !event.isReadOnly ? (
        <div
          className='agenda__resize-handle'
          onPointerDown={handleResizeStart}
        />
      ) : null}
    </m.div>
  );
}

function AgendaEventTitle({
  children,
  className,
  ...props
}: ComponentPropsWithRef<'span'>): ReactElement {
  return (
    <span
      {...props}
      className={cn('agenda__event-title', className)}
      data-slot='agenda-event-title'
    >
      {children}
    </span>
  );
}

function AgendaEventTime({
  className,
  event,
  ...props
}: Omit<ComponentPropsWithRef<'span'>, 'children'> & {
  event?: AgendaEventData;
}): ReactElement {
  const { locale, timeZone } = useAgendaContext();
  const value = useMemo(() => {
    if (!event) return '';

    const formatter = new Intl.DateTimeFormat(locale, {
      hour: 'numeric',
      minute: '2-digit',
    });

    return `${formatter.format(event.start.toDate(timeZone))} – ${formatter.format(event.end.toDate(timeZone))}`;
  }, [event, locale, timeZone]);

  return (
    <span
      {...props}
      className={cn('agenda__event-time', className)}
      data-slot='agenda-event-time'
    >
      {value}
    </span>
  );
}

function AgendaCurrentTimeIndicator({
  className,
  ...props
}: ComponentPropsWithRef<'div'>): ReactElement | null {
  const agenda = useAgendaContext();
  const { locale } = useLocale();
  const [currentTime, setCurrentTime] = useState<{
    slotsFromStart: number;
    timeLabel: string;
  } | null>(null);
  useEffect(() => {
    const formatter = new Intl.DateTimeFormat(locale, {
      hour: 'numeric',
      minute: '2-digit',
    });
    const update = () => {
      const now = new Date();
      const minutes = now.getHours() * 60 + now.getMinutes();
      const start = agenda.startHour * 60;
      const end = agenda.endHour * 60;

      setCurrentTime(
        minutes >= start && minutes <= end
          ? {
              slotsFromStart: (minutes - start) / agenda.slotDuration,
              timeLabel: formatter.format(now),
            }
          : null,
      );
    };

    update();
    const interval = setInterval(update, 60_000);

    return () => clearInterval(interval);
  }, [agenda.endHour, agenda.slotDuration, agenda.startHour, locale]);

  if (!currentTime) return null;

  const todayDate = today(getLocalTimeZone());
  const todayIndex = agenda.visibleDays.findIndex((date) =>
    isSameDay(date, todayDate),
  );
  const showsToday = todayIndex >= 0;
  const dayCount = agenda.visibleDays.length;

  return (
    <div
      {...props}
      className={cn('agenda__current-time-indicator', className)}
      data-slot='agenda-current-time-indicator'
      style={{ top: `${agenda.slotHeight * currentTime.slotsFromStart}px` }}
    >
      <div className='agenda__current-time-label-wrap'>
        <span
          className='agenda__current-time-label'
          data-slot='agenda-current-time-label'
        >
          {currentTime.timeLabel}
        </span>
      </div>
      {showsToday ? (
        <div
          className='agenda__current-time-track'
          data-slot='agenda-current-time-line'
        >
          <div className='agenda__current-time-line--faded' />
          <div
            className='agenda__current-time-line--active'
            style={{
              left: `${(todayIndex / dayCount) * 100}%`,
              width: `${(1 / dayCount) * 100}%`,
            }}
          />
        </div>
      ) : null}
    </div>
  );
}

function AgendaMonthGrid({
  children,
  className,
  ...props
}: ComponentPropsWithRef<'div'>): ReactElement {
  const { visibleWeeks } = useAgendaContext();
  const { locale } = useLocale();
  const weekdays = useMemo(() => {
    if (visibleWeeks.length === 0 || !visibleWeeks[0]?.length) return [];

    const formatter = new Intl.DateTimeFormat(locale, { weekday: 'short' });
    const timeZone = getLocalTimeZone();

    return visibleWeeks[0].map((date) =>
      formatter.format(date.toDate(timeZone)),
    );
  }, [locale, visibleWeeks]);

  return (
    <div
      {...props}
      className={cn('agenda__month-grid', className)}
      data-slot='agenda-month-grid'
    >
      {weekdays.length ? (
        <div
          className='agenda__month-weekday-header'
          data-slot='agenda-month-weekday-header'
        >
          {weekdays.map((day, index) => (
            <div
              className='agenda__month-weekday'
              data-slot='agenda-month-weekday'
              data-today={
                (visibleWeeks[0]?.[index] &&
                  isSameDay(
                    visibleWeeks[0][index],
                    today(getLocalTimeZone()),
                  )) ||
                undefined
              }
              key={day}
            >
              {day}
            </div>
          ))}
        </div>
      ) : null}
      {children}
    </div>
  );
}

function AgendaMonthRow({
  children,
  className,
  spanningRowCount: _spanningRowCount = 0,
  style,
  ...props
}: ComponentPropsWithRef<'div'> & { spanningRowCount?: number }): ReactElement {
  return (
    <div
      {...props}
      className={cn('agenda__month-row', className)}
      data-slot='agenda-month-row'
      style={style}
    >
      {children}
    </div>
  );
}

function AgendaMonthSpanningEvent({
  children,
  className,
  colSpan,
  colStart,
  event,
  row,
  style,
  ...props
}: ComponentPropsWithRef<'div'> & AgendaLayoutItem): ReactElement {
  const agenda = useAgendaContext();
  const left = (colStart / 7) * 100;
  const width = (colSpan / 7) * 100;

  return (
    <div
      {...props}
      className={cn('agenda__month-spanning-event', className)}
      data-selected={agenda.selectedEventId === event.id || undefined}
      data-slot='agenda-month-spanning-event'
      data-status={event.status ?? 'confirmed'}
      role='button'
      style={
        {
          ...style,
          height: 'var(--agenda-month-event-height)',
          left: `calc(${left}% + 2px)`,
          position: 'absolute',
          top: `calc(var(--agenda-month-date-offset) + ${row} * (var(--agenda-month-event-height) + var(--agenda-month-event-gap)) + 2px)`,
          width: `calc(${width}% - 4px)`,
          ...(event.color ? { '--agenda-event-accent': event.color } : {}),
        } as CSSProperties
      }
      tabIndex={0}
      onClick={(clickEvent) => {
        clickEvent.stopPropagation();
        agenda.selectEvent(event.id);
      }}
    >
      {children ?? event.title}
    </div>
  );
}

function AgendaMonthCell({
  children,
  className,
  date,
  maxEvents = 2,
  moreLabel = defaultMoreLabel,
  spanningRowCount = 0,
  style,
  ...props
}: ComponentPropsWithRef<'div'> & {
  date: CalendarDate;
  maxEvents?: number;
  moreLabel?: (count: number) => string;
  spanningRowCount?: number;
}): ReactElement {
  const agenda = useAgendaContext();
  const isToday = isSameDay(date, today(getLocalTimeZone()));
  const isOutside =
    date.era !== agenda.date.era ||
    date.year !== agenda.date.year ||
    date.month !== agenda.date.month;
  const isFirstOfMonth = date.day === 1;
  const dateLabel = useMemo(
    () =>
      isFirstOfMonth
        ? `${new Intl.DateTimeFormat(agenda.locale, { month: 'short' }).format(
            date.toDate(agenda.timeZone),
          )} ${date.day}`
        : `${date.day}`,
    [agenda.locale, agenda.timeZone, date, isFirstOfMonth],
  );
  const items = Children.toArray(children);
  const hasOverflow = items.length > maxEvents;
  const visibleItems = hasOverflow ? items.slice(0, maxEvents) : items;
  const overflowCount = items.length - maxEvents;
  const spanningZone =
    spanningRowCount > 0
      ? `calc(${spanningRowCount} * var(--agenda-month-event-height) + ${
          spanningRowCount - 1
        } * var(--agenda-month-event-gap) + 6px)`
      : '0px';
  const openDay = useCallback(() => {
    agenda.setDate(date);
    agenda.setView('day');
  }, [agenda, date]);

  return (
    <div
      {...props}
      className={cn('agenda__month-cell', className)}
      data-date={date.toString()}
      data-drop-target={
        agenda.dropPreview?.dateStr === date.toString() || undefined
      }
      data-outside-month={isOutside || undefined}
      data-slot='agenda-month-cell'
      data-today={isToday || undefined}
      data-weekend={isWeekend(date, agenda.timeZone) || undefined}
      style={
        {
          '--agenda-month-spanning-zone': spanningZone,
          '--agenda-drop-color':
            agenda.dropPreview?.dateStr === date.toString()
              ? agenda.dropPreview.color
              : undefined,
          ...style,
        } as CSSProperties
      }
      onDoubleClick={openDay}
    >
      <button
        className='agenda__month-cell-date'
        data-slot='agenda-month-cell-date'
        data-today={isToday || undefined}
        type='button'
        onClick={(clickEvent) => {
          clickEvent.stopPropagation();
          openDay();
        }}
      >
        {dateLabel}
      </button>
      {visibleItems}
      {hasOverflow ? (
        <button
          className='agenda__month-cell-more'
          type='button'
          onClick={(clickEvent) => {
            clickEvent.stopPropagation();
            openDay();
          }}
        >
          {moreLabel(overflowCount)}
        </button>
      ) : null}
    </div>
  );
}

function AgendaMonthEvent({
  children,
  className,
  event,
}: {
  children?: ReactNode;
  className?: string;
  event: AgendaEventData;
}): ReactElement {
  const agenda = useAgendaContext();
  const eventRef = useRef<HTMLDivElement>(null);
  const suppressClick = useRef(false);
  const [isDragging, setDragging] = useState(false);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const handleClick = useCallback(
    (clickEvent: ReactMouseEvent<HTMLDivElement>) => {
      clickEvent.stopPropagation();
      if (suppressClick.current) {
        suppressClick.current = false;
        return;
      }
      agenda.selectEvent(event.id);
    },
    [agenda, event.id],
  );
  const dateAtPoint = (clientX: number, clientY: number): string | null => {
    const element = eventRef.current;

    if (element) element.style.pointerEvents = 'none';
    const target = document.elementFromPoint(clientX, clientY);

    if (element) element.style.pointerEvents = '';

    return (
      target
        ?.closest("[data-slot='agenda-month-cell']")
        ?.getAttribute('data-date') ?? null
    );
  };
  const handlePointerDown = useCallback(
    (pointer: ReactPointerEvent<HTMLDivElement>) => {
      if (pointer.button !== 0 || !agenda.onEventMove || event.isReadOnly)
        return;

      pointer.stopPropagation();
      pointer.preventDefault();
      const originX = pointer.clientX;
      const originY = pointer.clientY;
      let moved = false;
      const move = (moveEvent: PointerEvent) => {
        x.set(moveEvent.clientX - originX);
        y.set(moveEvent.clientY - originY);
        if (
          !moved &&
          (Math.abs(moveEvent.clientX - originX) > 3 ||
            Math.abs(moveEvent.clientY - originY) > 3)
        ) {
          moved = true;
          setDragging(true);
        }
        if (!moved) return;

        const dateString = dateAtPoint(moveEvent.clientX, moveEvent.clientY);

        if (dateString)
          agenda.setDropPreview({
            ...(event.color ? { color: event.color } : {}),
            dateStr: dateString,
          });
      };
      const up = (upEvent: PointerEvent) => {
        document.removeEventListener('pointermove', move);
        document.removeEventListener('pointerup', up);
        setDragging(false);
        agenda.setDropPreview(null);
        if (!moved) return;

        const dateString = dateAtPoint(upEvent.clientX, upEvent.clientY);

        if (dateString) {
          const [year, month, day] = dateString.split('-').map(Number);

          if (year && month && day) {
            const dayDelta = new CalendarDate(year, month, day).compare(
              new CalendarDate(
                event.start.year,
                event.start.month,
                event.start.day,
              ),
            );

            if (dayDelta !== 0) {
              suppressClick.current = true;
              x.jump(0);
              y.jump(0);
              agenda.onEventMove?.(
                event.id,
                event.start.add({ days: dayDelta }),
                event.end.add({ days: dayDelta }),
              );
              return;
            }
          }
        }
        animate(x, 0, { bounce: 0.2, duration: 0.3, type: 'spring' });
        animate(y, 0, { bounce: 0.2, duration: 0.3, type: 'spring' });
      };

      document.addEventListener('pointermove', move);
      document.addEventListener('pointerup', up);
    },
    [agenda, event, x, y],
  );

  return (
    <m.div
      ref={eventRef}
      className={cn('agenda__month-event', className)}
      data-dragging={isDragging || undefined}
      data-readonly={event.isReadOnly || undefined}
      data-selected={agenda.selectedEventId === event.id || undefined}
      data-slot='agenda-month-event'
      data-status={event.status ?? 'confirmed'}
      style={{
        ...(event.color
          ? {
              '--agenda-event-color': `color-mix(in srgb, ${event.color} 15%, transparent)`,
              '--agenda-event-text': event.color,
            }
          : {}),
        x,
        y,
      }}
      onClick={handleClick}
      onPointerDown={handlePointerDown}
    >
      {children ?? event.title}
    </m.div>
  );
}
type AgendaComponent = typeof AgendaRoot & {
  AllDayEvent: typeof AgendaAllDayEvent;
  AllDayLabel: typeof AgendaAllDayLabel;
  AllDaySection: typeof AgendaAllDaySection;
  Body: typeof AgendaBody;
  CurrentTimeIndicator: typeof AgendaCurrentTimeIndicator;
  DayColumn: typeof AgendaDayColumn;
  DayHeader: typeof AgendaDayHeader;
  Event: typeof AgendaEvent;
  EventTime: typeof AgendaEventTime;
  EventTitle: typeof AgendaEventTitle;
  Header: typeof AgendaHeader;
  Heading: typeof AgendaHeading;
  MonthCell: typeof AgendaMonthCell;
  MonthEvent: typeof AgendaMonthEvent;
  MonthGrid: typeof AgendaMonthGrid;
  MonthRow: typeof AgendaMonthRow;
  MonthSpanningEvent: typeof AgendaMonthSpanningEvent;
  NavButton: typeof AgendaNavButton;
  Navigation: typeof AgendaNavigation;
  Root: typeof AgendaRoot;
  TimeGrid: typeof AgendaTimeGrid;
  TodayButton: typeof AgendaTodayButton;
  ViewSelector: typeof AgendaViewSelector;
  WeekHeader: typeof AgendaWeekHeader;
};
export const Agenda: AgendaComponent = Object.assign(AgendaRoot, {
  AllDayEvent: AgendaAllDayEvent,
  AllDayLabel: AgendaAllDayLabel,
  AllDaySection: AgendaAllDaySection,
  Body: AgendaBody,
  CurrentTimeIndicator: AgendaCurrentTimeIndicator,
  DayColumn: AgendaDayColumn,
  DayHeader: AgendaDayHeader,
  Event: AgendaEvent,
  EventTime: AgendaEventTime,
  EventTitle: AgendaEventTitle,
  Header: AgendaHeader,
  Heading: AgendaHeading,
  MonthCell: AgendaMonthCell,
  MonthEvent: AgendaMonthEvent,
  MonthGrid: AgendaMonthGrid,
  MonthRow: AgendaMonthRow,
  MonthSpanningEvent: AgendaMonthSpanningEvent,
  NavButton: AgendaNavButton,
  Navigation: AgendaNavigation,
  Root: AgendaRoot,
  TimeGrid: AgendaTimeGrid,
  TodayButton: AgendaTodayButton,
  ViewSelector: AgendaViewSelector,
  WeekHeader: AgendaWeekHeader,
});
export {
  AgendaAllDayEvent,
  AgendaAllDayLabel,
  AgendaAllDaySection,
  AgendaBody,
  AgendaCurrentTimeIndicator,
  AgendaDayColumn,
  AgendaDayHeader,
  AgendaEvent,
  AgendaEventTime,
  AgendaEventTitle,
  AgendaHeader,
  AgendaHeading,
  AgendaMonthCell,
  AgendaMonthEvent,
  AgendaMonthGrid,
  AgendaMonthRow,
  AgendaMonthSpanningEvent,
  AgendaNavButton,
  AgendaNavigation,
  AgendaRoot,
  AgendaTimeGrid,
  AgendaTodayButton,
  AgendaViewSelector,
  AgendaWeekHeader,
};
export type { CalendarDate, CalendarDateTime };
