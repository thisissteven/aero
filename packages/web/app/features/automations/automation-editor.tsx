import {
  Button,
  Calendar,
  Checkbox,
  DateField,
  DatePicker,
  Input,
  Label,
  ListBox,
  Modal,
  Select,
  Switch,
  TextArea,
  TimeField,
  toast,
} from '@aero/ui';
import { Plus, Xmark } from '@gravity-ui/icons';
import { Icon } from '@gravity-ui/uikit';
import { CalendarDate, parseDate, Time } from '@internationalized/date';
import {
  type ReactElement,
  type ReactNode,
  useEffect,
  useMemo,
  useState,
} from 'react';

import { WorkspaceModelDropdown } from '@/app/components/chat-sidebar/workspace/workspace-model-dropdown';
import { AgentPicker, VariantPicker } from '@/app/features/automations/pickers';
import { useChatSettingsStore } from '@/app/features/chat-page/chat-input/chat-settings-store';
import { useModelDirectory } from '@/app/features/chat-page/chat-input/models/use-model-directory';
import {
  type AutomationDraft,
  useUpsertAutomation,
} from '@/app/hooks/api/automations';
import { useAgentsCompact } from '@/app/hooks/api/capabilities';
import { useSetting } from '@/app/hooks/api/settings';
import { useI18n } from '@/app/hooks/i18n';
import { useGlobalModalStore } from '@/app/providers';
import type { AeroAutomation } from '@/server/services/harness/types';

type ScheduleKind = 'daily' | 'weekly' | 'once' | 'cron';

interface Draft {
  id?: string;
  name: string;
  enabled: boolean;
  kind: ScheduleKind;
  times: string[];
  weekdays: number[];
  date: string;
  time: string;
  cron: string;
  timezone: string;
  prompt: string;
  providerID: string;
  modelID: string;
  variant: string;
  agent: string;
  goalEnabled: boolean;
  permissionAutoAccept: boolean;
}

const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const WEEKDAYS = [0, 1, 2, 3, 4, 5, 6] as const;

function localDateISO(): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
}

function systemTimezone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
}

function timezoneOptions(): string[] {
  try {
    const values = (
      Intl as unknown as { supportedValuesOf?: (key: string) => string[] }
    ).supportedValuesOf?.('timeZone');
    if (values && values.length > 0) return values;
  } catch {
    //
  }
  return [
    'UTC',
    'Europe/London',
    'Europe/Berlin',
    'America/New_York',
    'America/Los_Angeles',
    'Asia/Tokyo',
  ];
}

function normalizeTimes(times: string[]): string[] {
  const valid = times.filter((time) => TIME_RE.test(time));
  return Array.from(new Set(valid)).sort((a, b) => a.localeCompare(b));
}

function timeFromString(value: string): Time | null {
  const match = TIME_RE.exec(value);
  if (!match) return null;
  return new Time(Number(match[1]), Number(match[2]), 0);
}

function stringFromTime(value: Time | null): string {
  if (!value) return '';
  return `${String(value.hour).padStart(2, '0')}:${String(value.minute).padStart(2, '0')}`;
}

function dateFromString(value: string): CalendarDate | null {
  try {
    return DATE_RE.test(value) ? parseDate(value) : null;
  } catch {
    return null;
  }
}

function stringFromDate(value: CalendarDate | null): string {
  return value ? value.toString() : '';
}

/** Whether the browser locale prefers a 24-hour clock. */
function detect24Hour(): boolean {
  try {
    const options = new Intl.DateTimeFormat(undefined, {
      hour: 'numeric',
    }).resolvedOptions();
    if (typeof options.hour12 === 'boolean') return !options.hour12;
    return options.hourCycle === 'h23' || options.hourCycle === 'h24';
  } catch {
    return true;
  }
}

/** Locale first day of week, 0 = Sunday … 6 = Saturday. */
function localeWeekStart(): number {
  try {
    const LocaleCtor = (
      Intl as unknown as {
        Locale?: new (
          tag?: string,
        ) => {
          weekInfo?: { firstDay?: number };
          getWeekInfo?: () => { firstDay?: number };
        };
      }
    ).Locale;
    if (typeof LocaleCtor === 'function') {
      const locale = new LocaleCtor();
      const info = locale.weekInfo ?? locale.getWeekInfo?.();
      if (info && typeof info.firstDay === 'number') {
        return info.firstDay % 7;
      }
    }
  } catch {
    //
  }
  return 1;
}

// The `Time` class carries a private brand, and two copies of
// `@internationalized/date` are resolved in the workspace, so the value/onChange
// types do not line up nominally with the HeroUI TimeField generic. The runtime
// shape is identical; type the root against our own `Time`.
type TimeFieldRootComponent = (props: {
  value: Time | null;
  onChange: (value: Time | null) => void;
  hourCycle?: 12 | 24;
  granularity?: 'hour' | 'minute' | 'second';
  'aria-label'?: string;
  className?: string;
  children?: ReactNode;
}) => ReactElement | null;

const TimeFieldRoot = TimeField as unknown as TimeFieldRootComponent;

// Same private-brand mismatch as TimeField.
type DatePickerRootComponent = (props: {
  value: CalendarDate | null;
  onChange: (value: CalendarDate | null) => void;
  'aria-label'?: string;
  className?: string;
  children?: ReactNode;
}) => ReactElement | null;

const DatePickerRoot = DatePicker as unknown as DatePickerRootComponent;

function toDraft(
  task: AeroAutomation | null,
  defaults: { modelID: string; variant: string; agent: string },
): Draft {
  if (!task) {
    return {
      name: '',
      enabled: true,
      kind: 'daily',
      times: ['09:00'],
      weekdays: [1],
      date: localDateISO(),
      time: '09:00',
      cron: '0 9 * * *',
      timezone: systemTimezone(),
      prompt: '',
      providerID: '',
      modelID: defaults.modelID,
      variant: defaults.variant,
      agent: defaults.agent,
      goalEnabled: false,
      permissionAutoAccept: false,
    };
  }

  const schedule = task.schedule;
  const times =
    'times' in schedule && schedule.times.length > 0
      ? normalizeTimes(schedule.times)
      : ['09:00'];

  return {
    id: task.id,
    name: task.name,
    enabled: task.enabled,
    kind: schedule.kind,
    times,
    weekdays:
      schedule.kind === 'weekly' && schedule.weekdays.length > 0
        ? schedule.weekdays
        : [1],
    date: schedule.kind === 'once' ? schedule.date : localDateISO(),
    time: schedule.kind === 'once' ? schedule.time : '09:00',
    cron: schedule.kind === 'cron' ? schedule.cron : '0 9 * * *',
    timezone: schedule.timezone || systemTimezone(),
    prompt: task.execution.prompt,
    providerID: task.execution.providerID,
    modelID: task.execution.modelID,
    variant: task.execution.variant || '',
    agent: task.execution.agent || '',
    goalEnabled: task.execution.goalEnabled === true,
    permissionAutoAccept: task.execution.permissionAutoAccept === true,
  };
}

export function AutomationEditorDialog({
  workspaceId,
  directory,
  task,
}: {
  workspaceId: string;
  directory?: string;
  task: AeroAutomation | null;
}) {
  const { t } = useI18n();
  const closeModal = useGlobalModalStore((state) => state.closeModal);
  const { mutateAsync: upsert, isPending } = useUpsertAutomation(workspaceId);

  const selectedModel = useChatSettingsStore((state) => state.selectedModel);
  const selectedVariant = useChatSettingsStore(
    (state) => state.selectedVariant,
  );
  const selectedAgent = useChatSettingsStore((state) => state.selectedAgent);

  const { searchableModels } = useModelDirectory();
  const { data: agentsData } = useAgentsCompact({ directory });
  const agents = useMemo(
    () =>
      (agentsData ?? []).filter(
        (agent) => agent.native === true && agent.mode === 'primary',
      ),
    [agentsData],
  );

  const timezones = useMemo(() => timezoneOptions(), []);
  const [error, setError] = useState<string | null>(null);

  const [draft, setDraft] = useState<Draft>(() =>
    toDraft(task, {
      modelID: selectedModel?.model.id ?? '',
      variant: selectedVariant ?? '',
      agent: selectedAgent?.name ?? '',
    }),
  );

  useEffect(() => {
    setError(null);
    setDraft(
      toDraft(task, {
        modelID: selectedModel?.model.id ?? '',
        variant: selectedVariant ?? '',
        agent: selectedAgent?.name ?? '',
      }),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [task]);

  const selectedModelEntry = useMemo(
    () =>
      draft.modelID
        ? (searchableModels.find((entry) => entry.model.id === draft.modelID) ??
          null)
        : null,
    [searchableModels, draft.modelID],
  );

  const variants = useMemo(
    () => Object.keys(selectedModelEntry?.model.variants ?? {}),
    [selectedModelEntry],
  );

  const providerID = selectedModelEntry?.providerId || draft.providerID || '';

  const { data: timeFormatData } = useSetting(['timeFormat']);
  const { data: weekStartData } = useSetting(['weekStartsOn']);

  const hourCycle: 12 | 24 =
    timeFormatData?.value === '12h'
      ? 12
      : timeFormatData?.value === '24h'
        ? 24
        : detect24Hour()
          ? 24
          : 12;

  const weekStart =
    weekStartData?.value === 'sunday'
      ? 0
      : weekStartData?.value === 'monday'
        ? 1
        : weekStartData?.value === 'saturday'
          ? 6
          : localeWeekStart();

  const orderedWeekdays = useMemo(
    () => [...WEEKDAYS.slice(weekStart), ...WEEKDAYS.slice(0, weekStart)],
    [weekStart],
  );

  const weekStartDay = (
    ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const
  )[weekStart];

  const validate = (value: Draft): string | null => {
    if (!value.name.trim()) return t.automations.validationNameRequired;
    if (!value.prompt.trim()) return t.automations.validationPromptRequired;
    if (!providerID || !value.modelID)
      return t.automations.validationModelRequired;
    if (!value.timezone.trim()) return t.automations.validationDateTimeRequired;
    if (value.kind === 'cron') {
      if (!value.cron.trim()) return t.automations.validationCronRequired;
    } else if (value.kind === 'once') {
      if (!DATE_RE.test(value.date) || !TIME_RE.test(value.time)) {
        return t.automations.validationDateTimeRequired;
      }
    } else {
      if (normalizeTimes(value.times).length === 0) {
        return t.automations.validationTimesRequired;
      }
      if (value.kind === 'weekly' && value.weekdays.length === 0) {
        return t.automations.validationWeekdaysRequired;
      }
    }
    return null;
  };

  const handleSave = async () => {
    const validationError = validate(draft);
    if (validationError) {
      setError(validationError);
      return;
    }

    const schedule: AeroAutomation['schedule'] =
      draft.kind === 'cron'
        ? { kind: 'cron', cron: draft.cron.trim(), timezone: draft.timezone }
        : draft.kind === 'once'
          ? {
              kind: 'once',
              date: draft.date,
              time: draft.time,
              timezone: draft.timezone,
            }
          : draft.kind === 'weekly'
            ? {
                kind: 'weekly',
                weekdays: draft.weekdays,
                times: normalizeTimes(draft.times),
                timezone: draft.timezone,
              }
            : {
                kind: 'daily',
                times: normalizeTimes(draft.times),
                timezone: draft.timezone,
              };

    const payload: AutomationDraft = {
      ...(draft.id ? { id: draft.id } : {}),
      name: draft.name.trim(),
      enabled: draft.enabled,
      schedule,
      execution: {
        prompt: draft.prompt,
        providerID,
        modelID: draft.modelID,
        ...(draft.variant.trim() ? { variant: draft.variant.trim() } : {}),
        ...(draft.agent.trim() ? { agent: draft.agent.trim() } : {}),
        ...(draft.permissionAutoAccept ? { permissionAutoAccept: true } : {}),
        ...(draft.goalEnabled ? { goalEnabled: true } : {}),
      },
    };

    try {
      await upsert(payload);
      toast.success(t.automations.toastSaved);
      closeModal();
    } catch (saveError) {
      toast.danger(
        saveError instanceof Error
          ? saveError.message
          : t.automations.toastSaveFailed,
      );
    }
  };

  const setTime = (index: number, value: string) => {
    setDraft((prev) => {
      const times = prev.times.slice();
      times[index] = value;
      return { ...prev, times };
    });
  };

  const addTime = () => {
    setDraft((prev) => ({ ...prev, times: [...prev.times, '12:00'] }));
  };

  const removeTime = (index: number) => {
    setDraft((prev) => {
      const times = prev.times.filter((_, i) => i !== index);
      return { ...prev, times: times.length > 0 ? times : ['09:00'] };
    });
  };

  const toggleWeekday = (weekday: number, selected: boolean) => {
    setDraft((prev) => {
      const next = new Set(prev.weekdays);
      if (selected) next.add(weekday);
      else next.delete(weekday);
      return { ...prev, weekdays: Array.from(next).sort((a, b) => a - b) };
    });
  };

  return (
    <Modal.Dialog className='px-0 rounded-xl sm:max-w-[480px] lg:max-w-[560px]'>
      <Modal.CloseTrigger />
      <Modal.Header className='px-4 sm:px-5'>
        <Modal.Heading>
          {task ? t.automations.editorTitleEdit : t.automations.editorTitleNew}
        </Modal.Heading>
      </Modal.Header>

      <Modal.Body
        className='flex flex-col gap-5 px-5 sm:px-6'
        onKeyDown={(event) => {
          if (event.key !== 'Enter' || event.shiftKey || isPending) return;
          const target = event.target as HTMLElement;
          if (target.tagName === 'TEXTAREA') return;
          event.preventDefault();
          void handleSave();
        }}
      >
        <div className='grid grid-cols-1 gap-5 sm:grid-cols-2'>
          <div className='flex flex-col gap-1.5'>
            <Label>{t.automations.editorName}</Label>
            <Input
              value={draft.name}
              maxLength={80}
              placeholder={t.automations.editorNamePlaceholder}
              onChange={(event) =>
                setDraft((prev) => ({ ...prev, name: event.target.value }))
              }
            />
          </div>
          <div className='flex flex-col gap-1.5'>
            <Label>{t.automations.editorSchedule}</Label>
            <Select
              aria-label={t.automations.editorSchedule}
              value={draft.kind}
              onChange={(key) =>
                setDraft((prev) => ({
                  ...prev,
                  kind: (key as ScheduleKind) ?? 'daily',
                }))
              }
            >
              <Select.Trigger>
                <Select.Value />
                <Select.Indicator />
              </Select.Trigger>
              <Select.Popover className='rounded-lg'>
                <ListBox>
                  <ListBox.Item id='daily' className='rounded-md'>
                    <Label>{t.automations.scheduleDaily}</Label>
                  </ListBox.Item>
                  <ListBox.Item id='weekly' className='rounded-md'>
                    <Label>{t.automations.scheduleWeekly}</Label>
                  </ListBox.Item>
                  <ListBox.Item id='once' className='rounded-md'>
                    <Label>{t.automations.scheduleOnce}</Label>
                  </ListBox.Item>
                  <ListBox.Item id='cron' className='rounded-md'>
                    <Label>{t.automations.scheduleCron}</Label>
                  </ListBox.Item>
                </ListBox>
              </Select.Popover>
            </Select>
          </div>
        </div>

        {draft.kind === 'daily' || draft.kind === 'weekly' ? (
          <div className='flex flex-col gap-2'>
            <Label>{t.automations.editorTimes}</Label>
            <div className='flex flex-col gap-2'>
              {draft.times.map((time, index) => (
                <div key={index} className='flex items-center gap-2'>
                  <TimeFieldInput
                    value={time}
                    onChange={(next) => setTime(index, next)}
                    ariaLabel={t.automations.editorTime}
                    hourCycle={hourCycle}
                  />
                  <Button
                    isIconOnly
                    size='sm'
                    variant='ghost'
                    aria-label={t.automations.editorRemoveTime}
                    onPress={() => removeTime(index)}
                  >
                    <Icon data={Xmark} className='size-3.5' />
                  </Button>
                </div>
              ))}
              <Button
                size='sm'
                variant='outline'
                className='w-fit gap-1.5'
                onPress={addTime}
              >
                <Icon data={Plus} className='size-3.5' />
                {t.automations.editorAddTime}
              </Button>
            </div>
          </div>
        ) : null}

        {draft.kind === 'weekly' ? (
          <div className='flex flex-col gap-2'>
            <Label>{t.automations.editorWeekdays}</Label>
            <div className='flex flex-wrap gap-3'>
              {orderedWeekdays.map((weekday) => {
                const labels = t.automations.weekdays;
                const label = [
                  labels.sun,
                  labels.mon,
                  labels.tue,
                  labels.wed,
                  labels.thu,
                  labels.fri,
                  labels.sat,
                ][weekday];
                return (
                  <Checkbox
                    key={weekday}
                    isSelected={draft.weekdays.includes(weekday)}
                    onChange={(selected) => toggleWeekday(weekday, selected)}
                  >
                    <Checkbox.Content>
                      <Checkbox.Control>
                        <Checkbox.Indicator />
                      </Checkbox.Control>
                      {label}
                    </Checkbox.Content>
                  </Checkbox>
                );
              })}
            </div>
          </div>
        ) : null}

        {draft.kind === 'once' ? (
          <div className='grid grid-cols-2 gap-5'>
            <div className='flex flex-col gap-1.5'>
              <Label>{t.automations.editorDate}</Label>
              <DatePickerInput
                value={draft.date}
                onChange={(next) =>
                  setDraft((prev) => ({ ...prev, date: next }))
                }
                ariaLabel={t.automations.editorDate}
                firstDayOfWeek={weekStartDay}
              />
            </div>
            <div className='flex flex-col gap-1.5'>
              <Label>{t.automations.editorTime}</Label>
              <TimeFieldInput
                value={draft.time}
                onChange={(next) =>
                  setDraft((prev) => ({ ...prev, time: next }))
                }
                ariaLabel={t.automations.editorTime}
                hourCycle={hourCycle}
              />
            </div>
          </div>
        ) : null}

        {draft.kind === 'cron' ? (
          <div className='flex flex-col gap-1.5'>
            <Label>{t.automations.editorCron}</Label>
            <Input
              className='font-mono'
              value={draft.cron}
              placeholder={t.automations.editorCronPlaceholder}
              onChange={(event) =>
                setDraft((prev) => ({ ...prev, cron: event.target.value }))
              }
            />
          </div>
        ) : null}

        <div className='flex flex-col gap-1.5'>
          <Label>{t.automations.editorTimezone}</Label>
          <Select
            aria-label={t.automations.editorTimezone}
            value={draft.timezone}
            onChange={(key) =>
              setDraft((prev) => ({
                ...prev,
                timezone: key ? String(key) : prev.timezone,
              }))
            }
          >
            <Select.Trigger>
              <Select.Value />
              <Select.Indicator />
            </Select.Trigger>
            <Select.Popover className='rounded-lg'>
              <ListBox>
                {timezones.map((timezone) => (
                  <ListBox.Item
                    key={timezone}
                    id={timezone}
                    className='rounded-md'
                  >
                    <Label>{timezone}</Label>
                  </ListBox.Item>
                ))}
              </ListBox>
            </Select.Popover>
          </Select>
        </div>

        <div className='flex flex-col gap-1.5'>
          <Label>{t.automations.editorPrompt}</Label>
          <TextArea
            rows={4}
            className='min-h-24 w-full resize-none'
            value={draft.prompt}
            placeholder={t.automations.editorPromptPlaceholder}
            onChange={(event) =>
              setDraft((prev) => ({ ...prev, prompt: event.target.value }))
            }
          />
        </div>

        <div className='flex flex-col gap-1.5'>
          <Label>{t.automations.editorModel}</Label>
          <WorkspaceModelDropdown
            value={draft.modelID || null}
            onChange={(modelID) => {
              const entry =
                searchableModels.find((item) => item.model.id === modelID) ??
                null;
              setDraft((prev) => ({
                ...prev,
                modelID,
                providerID: entry?.providerId ?? '',
                variant: '',
              }));
            }}
          />
        </div>

        <div className='grid grid-cols-1 gap-5 sm:grid-cols-2'>
          <div className='flex flex-col gap-1.5'>
            <Label>{t.automations.editorVariant}</Label>
            <VariantPicker
              variants={variants}
              value={draft.variant}
              onChange={(variant) => setDraft((prev) => ({ ...prev, variant }))}
            />
          </div>
          <div className='flex flex-col gap-1.5'>
            <Label>{t.automations.editorAgent}</Label>
            <AgentPicker
              agents={agents}
              value={draft.agent}
              onChange={(agent) => setDraft((prev) => ({ ...prev, agent }))}
            />
          </div>
        </div>

        <div className='flex flex-col gap-3'>
          <Switch
            isSelected={draft.goalEnabled}
            onChange={(selected) =>
              setDraft((prev) => ({ ...prev, goalEnabled: selected }))
            }
          >
            <Switch.Content>
              <Switch.Control>
                <Switch.Thumb />
              </Switch.Control>
              {t.automations.editorRunAsGoal}
            </Switch.Content>
          </Switch>
          <Switch
            isSelected={draft.permissionAutoAccept}
            onChange={(selected) =>
              setDraft((prev) => ({ ...prev, permissionAutoAccept: selected }))
            }
          >
            <Switch.Content>
              <Switch.Control>
                <Switch.Thumb />
              </Switch.Control>
              {t.automations.editorAutoAccept}
            </Switch.Content>
          </Switch>
          <Switch
            isSelected={draft.enabled}
            onChange={(selected) =>
              setDraft((prev) => ({ ...prev, enabled: selected }))
            }
          >
            <Switch.Content>
              <Switch.Control>
                <Switch.Thumb />
              </Switch.Control>
              {t.automations.editorEnabled}
            </Switch.Content>
          </Switch>
        </div>

        {error ? <p className='text-danger text-sm'>{error}</p> : null}
      </Modal.Body>

      <Modal.Footer className='px-6 sm:px-7'>
        <Button
          variant='ghost'
          size='sm'
          isDisabled={isPending}
          onPress={closeModal}
          className='rounded-lg'
        >
          {t.common.cancel}
        </Button>
        <Button
          variant='primary'
          size='sm'
          isPending={isPending}
          onPress={handleSave}
          className='rounded-lg'
        >
          {t.automations.editorSave}
        </Button>
      </Modal.Footer>
    </Modal.Dialog>
  );
}

function TimeFieldInput({
  value,
  onChange,
  ariaLabel,
  hourCycle,
}: {
  value: string;
  onChange: (value: string) => void;
  ariaLabel: string;
  hourCycle: 12 | 24;
}) {
  return (
    <TimeFieldRoot
      value={timeFromString(value)}
      onChange={(next) => onChange(stringFromTime(next))}
      hourCycle={hourCycle}
      granularity='minute'
      aria-label={ariaLabel}
    >
      <TimeField.Group className='w-28'>
        <TimeField.Input>
          {(segment) => <TimeField.Segment segment={segment} />}
        </TimeField.Input>
      </TimeField.Group>
    </TimeFieldRoot>
  );
}

function DatePickerInput({
  value,
  onChange,
  ariaLabel,
  firstDayOfWeek,
}: {
  value: string;
  onChange: (value: string) => void;
  ariaLabel: string;
  firstDayOfWeek: 'sun' | 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat';
}) {
  return (
    <DatePickerRoot
      value={dateFromString(value)}
      onChange={(next) => onChange(stringFromDate(next))}
      aria-label={ariaLabel}
    >
      <DateField.Group fullWidth>
        <DateField.Input>
          {(segment) => <DateField.Segment segment={segment} />}
        </DateField.Input>
        <DateField.Suffix>
          <DatePicker.Trigger>
            <DatePicker.TriggerIndicator />
          </DatePicker.Trigger>
        </DateField.Suffix>
      </DateField.Group>
      <DatePicker.Popover>
        <Calendar aria-label={ariaLabel} firstDayOfWeek={firstDayOfWeek}>
          <Calendar.Header>
            <Calendar.NavButton slot='previous' />
            <Calendar.Heading />
            <Calendar.NavButton slot='next' />
          </Calendar.Header>
          <Calendar.Grid>
            <Calendar.GridHeader>
              {(day) => <Calendar.HeaderCell>{day}</Calendar.HeaderCell>}
            </Calendar.GridHeader>
            <Calendar.GridBody>
              {(date) => <Calendar.Cell date={date} />}
            </Calendar.GridBody>
          </Calendar.Grid>
        </Calendar>
      </DatePicker.Popover>
    </DatePickerRoot>
  );
}
