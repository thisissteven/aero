import { CalendarDateTime } from '@internationalized/date';
import type { Meta, StoryObj } from '@storybook/react';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { Agenda, type AgendaEventData, useAgenda } from './index';

const meta = {
  parameters: { layout: 'padded' },
  tags: ['autodocs'],
  title: 'Components/Date and Time/Agenda',
} satisfies Meta<typeof Agenda>;
export default meta;
type Story = StoryObj<typeof meta>;
const at = (
  year: number,
  month: number,
  day: number,
  hour: number,
  minute = 0,
) => new CalendarDateTime(year, month, day, hour, minute);

function initialEvents(): AgendaEventData[] {
  const now = new Date();
  const year = now.getFullYear(),
    month = now.getMonth() + 1,
    day = now.getDate();
  return [
    {
      color: '#10b981',
      end: at(year, month, day + 2, 23, 59),
      id: 'allday-1',
      isAllDay: true,
      start: at(year, month, day, 0),
      title: 'Company Holiday',
    },
    {
      color: '#3b82f6',
      end: at(year, month, day, 23, 59),
      id: 'allday-2',
      isAllDay: true,
      start: at(year, month, day, 0),
      title: 'Team Offsite',
    },
    {
      end: at(year, month, day, 9, 30),
      id: '1',
      start: at(year, month, day, 9),
      title: 'Team Standup',
    },
    {
      color: '#d946ef',
      end: at(year, month, day, 13),
      id: '2',
      start: at(year, month, day, 12),
      title: 'Lunch',
    },
    {
      color: '#3b82f6',
      end: at(year, month, day, 15, 30),
      id: '3',
      start: at(year, month, day, 14),
      title: 'Design Review',
    },
    {
      color: '#10b981',
      end: at(year, month, day, 16, 30),
      id: '4',
      start: at(year, month, day, 16),
      title: '1:1 with Manager',
    },
    {
      color: '#f59e0b',
      end: at(year, month, day, 10),
      id: '5',
      start: at(year, month, day, 9),
      title: 'Product Sync',
    },
    {
      color: '#8b5cf6',
      end: at(year, month, day, 10, 15),
      id: '6',
      start: at(year, month, day, 9, 15),
      title: 'Eng Huddle',
    },
    {
      color: '#ef4444',
      end: at(year, month, day, 15, 30),
      id: '7',
      start: at(year, month, day, 14, 30),
      title: 'Client Call',
    },
    {
      color: '#06b6d4',
      end: at(year, month, day, 14, 20),
      id: '8',
      start: at(year, month, day, 14),
      title: 'Quick Check-in',
    },
    {
      color: '#84cc16',
      end: at(year, month, day, 15),
      id: '9',
      start: at(year, month, day, 14, 40),
      title: 'Wrap-up Notes',
    },
    {
      color: '#f59e0b',
      end: at(year, month, day - 1, 11, 30),
      id: '10',
      start: at(year, month, day - 1, 10),
      title: 'Sprint Planning',
    },
    {
      color: '#8b5cf6',
      end: at(year, month, day + 3, 16),
      id: '11',
      start: at(year, month, day + 3, 15),
      title: 'Retro',
    },
    {
      color: '#ef4444',
      end: at(year, month, day + 9, 16, 30),
      id: '12',
      start: at(year, month, day + 9, 16),
      title: '1:1 with Manager',
    },
    {
      color: '#10b981',
      end: at(year, month, day + 13, 23, 59),
      id: '13',
      isAllDay: true,
      start: at(year, month, day + 13, 0),
      title: 'Holiday',
    },
    {
      color: '#10b981',
      end: at(year, month, day + 2, 12),
      id: '14',
      start: at(year, month, day + 2, 11),
      title: 'Code Review',
    },
    {
      color: '#3b82f6',
      end: at(year, month, day + 8, 10, 30),
      id: '15',
      start: at(year, month, day + 8, 9),
      title: 'Board Meeting',
    },
    {
      color: '#3b82f6',
      end: at(year, month, day, 11, 15),
      id: '16',
      start: at(year, month, day, 10, 15),
      status: 'unconfirmed',
      title: 'Planning',
    },
    {
      color: '#6b7280',
      end: at(year, month, day + 1, 10),
      id: '17',
      isReadOnly: true,
      start: at(year, month, day + 1, 9),
      title: 'Company All-Hands',
    },
  ];
}

function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const media = window.matchMedia(query);
    const update = (event: MediaQueryListEvent | MediaQueryList) =>
      setMatches(event.matches);

    update(media);
    media.addEventListener('change', update);

    return () => media.removeEventListener('change', update);
  }, [query]);

  return matches;
}

let nextEventId = 100;
const eventColors = [
  '#3b82f6',
  '#10b981',
  '#f59e0b',
  '#d946ef',
  '#8b5cf6',
  '#ef4444',
  '#06b6d4',
];

function Demo() {
  const seed = useMemo(() => initialEvents(), []);
  const [events, setEvents] = useState(seed);
  const isMobile = useMediaQuery('(max-width: 639px)');
  const create = useCallback(
    ({ end, start }: { end: CalendarDateTime; start: CalendarDateTime }) => {
      const id = String(nextEventId++);
      const color = eventColors[nextEventId % eventColors.length];

      setEvents((current) => [
        ...current,
        {
          color,
          end,
          id,
          start,
          title: 'New Event',
        },
      ]);
    },
    [],
  );
  const move = useCallback(
    (id: string, start: CalendarDateTime, end: CalendarDateTime) =>
      setEvents((current) =>
        current.map((event) =>
          event.id === id ? { ...event, end, start } : event,
        ),
      ),
    [],
  );
  const remove = useCallback(
    (id: string) =>
      setEvents((current) => current.filter((event) => event.id !== id)),
    [],
  );
  const state = useAgenda({
    defaultView: 'week',
    events,
    onEventCreate: isMobile ? undefined : create,
    onEventDelete: remove,
    onEventMove: isMobile ? undefined : move,
    onEventResize: isMobile ? undefined : move,
    weekDays: isMobile ? 3 : 7,
  });
  return (
    <div className='h-[600px] w-full'>
      <Agenda {...state}>
        <Agenda.Header>
          <Agenda.Heading />
          <Agenda.ViewSelector />
          <Agenda.Navigation>
            <Agenda.NavButton slot='previous' />
            <Agenda.TodayButton />
            <Agenda.NavButton slot='next' />
          </Agenda.Navigation>
        </Agenda.Header>
        <Agenda.Body>
          {state.view !== 'month' ? (
            <>
              <Agenda.WeekHeader />
              <Agenda.AllDaySection>
                {state.allDayLayout.map((item) => (
                  <Agenda.AllDayEvent {...item} key={item.event.id} />
                ))}
              </Agenda.AllDaySection>
              <Agenda.TimeGrid>
                <Agenda.CurrentTimeIndicator />
                {state.visibleDays.map((date) => (
                  <Agenda.DayColumn date={date} key={date.toString()}>
                    {state.getEventsForDay(date).map((event) => (
                      <Agenda.Event event={event} key={event.id} />
                    ))}
                  </Agenda.DayColumn>
                ))}
              </Agenda.TimeGrid>
            </>
          ) : (
            <Agenda.MonthGrid>
              {state.visibleWeeks.map((week) => {
                const layout = state.getMonthRowLayout(week);
                return (
                  <Agenda.MonthRow
                    key={week[0]?.toString()}
                    spanningRowCount={layout.rowCount}
                  >
                    {layout.items.map((item) => (
                      <Agenda.MonthSpanningEvent
                        {...item}
                        key={item.event.id}
                      />
                    ))}
                    {week.map((date, column) => (
                      <Agenda.MonthCell
                        date={date}
                        key={date.toString()}
                        maxEvents={isMobile ? 1 : 2}
                        spanningRowCount={layout.rowCountPerCol[column] ?? 0}
                      >
                        {state.getPerCellEvents(date, week).map((event) => (
                          <Agenda.MonthEvent event={event} key={event.id} />
                        ))}
                      </Agenda.MonthCell>
                    ))}
                  </Agenda.MonthRow>
                );
              })}
            </Agenda.MonthGrid>
          )}
        </Agenda.Body>
      </Agenda>
    </div>
  );
}
export const Default: Story = { render: () => <Demo /> };
