import {
  Button,
  Checkbox,
  Input,
  Label,
  ListBox,
  Modal,
  Select,
  Switch,
  TextArea,
} from '@aero/ui';
import { Plus, Xmark } from '@gravity-ui/icons';
import { Icon } from '@gravity-ui/uikit';
import { useEffect, useMemo, useState } from 'react';
import { useChatSettingsStore } from '@/app/features/chat-page/chat-input/chat-settings-store';
import type { AutomationDraft } from '@/app/hooks/api/automations';
import { useAgentsCompact } from '@/app/hooks/api/capabilities';
import { usePreparedConfiguredProviders } from '@/app/hooks/api/providers';
import { useI18n } from '@/app/hooks/i18n';
import type { ModelItem } from '@/app/lib/model';
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

function toDraft(
  task: AeroAutomation | null,
  defaults: {
    providerID: string;
    modelID: string;
    variant: string;
    agent: string;
  },
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
      providerID: defaults.providerID,
      modelID: defaults.modelID,
      variant: defaults.variant,
      agent: defaults.agent,
      goalEnabled: false,
      permissionAutoAccept: false,
    };
  }

  const schedule = task.schedule;
  const kind: ScheduleKind = schedule.kind;
  const times =
    'times' in schedule && schedule.times.length > 0
      ? normalizeTimes(schedule.times)
      : ['09:00'];

  return {
    id: task.id,
    name: task.name,
    enabled: task.enabled,
    kind,
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

function toPayload(draft: Draft): AutomationDraft {
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

  return {
    ...(draft.id ? { id: draft.id } : {}),
    name: draft.name.trim(),
    enabled: draft.enabled,
    schedule,
    execution: {
      prompt: draft.prompt,
      providerID: draft.providerID,
      modelID: draft.modelID,
      ...(draft.variant.trim() ? { variant: draft.variant.trim() } : {}),
      ...(draft.agent.trim() ? { agent: draft.agent.trim() } : {}),
      ...(draft.permissionAutoAccept ? { permissionAutoAccept: true } : {}),
      ...(draft.goalEnabled ? { goalEnabled: true } : {}),
    },
  };
}

interface AutomationEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  directory?: string;
  task: AeroAutomation | null;
  saving: boolean;
  onSave: (draft: AutomationDraft) => Promise<void>;
}

export function AutomationEditor({
  open,
  onOpenChange,
  directory,
  task,
  saving,
  onSave,
}: AutomationEditorProps) {
  const { t } = useI18n();
  const selectedModel = useChatSettingsStore((state) => state.selectedModel);
  const selectedVariant = useChatSettingsStore(
    (state) => state.selectedVariant,
  );
  const selectedAgent = useChatSettingsStore((state) => state.selectedAgent);

  const { data: providers } = usePreparedConfiguredProviders({
    harnessId: 'opencode',
    directory,
  });
  const { data: agents } = useAgentsCompact({ directory });

  const providerList = providers ?? [];
  const agentList = useMemo(
    () =>
      (agents ?? []).filter(
        (agent) => agent.native === true && agent.mode === 'primary',
      ),
    [agents],
  );
  const timezones = useMemo(() => timezoneOptions(), []);

  const [draft, setDraft] = useState<Draft>(() =>
    toDraft(task, {
      providerID: selectedModel?.providerId ?? '',
      modelID: selectedModel?.model.id ?? '',
      variant: selectedVariant ?? '',
      agent: selectedAgent?.name ?? '',
    }),
  );
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setError(null);
    setDraft(
      toDraft(task, {
        providerID: selectedModel?.providerId ?? '',
        modelID: selectedModel?.model.id ?? '',
        variant: selectedVariant ?? '',
        agent: selectedAgent?.name ?? '',
      }),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, task]);

  const provider = providerList.find((entry) => entry.id === draft.providerID);
  const models = useMemo<ModelItem[]>(() => {
    const record = (provider?.models ?? {}) as Record<string, ModelItem>;
    return Object.values(record).sort((a, b) =>
      (a.name || a.id).localeCompare(b.name || b.id),
    );
  }, [provider]);

  const variantOptions = useMemo(() => {
    const model = models.find((entry) => entry.id === draft.modelID);
    return model?.variants ? Object.keys(model.variants) : [];
  }, [models, draft.modelID]);

  const defaultModel = useMemo(() => {
    const first = providerList[0];
    if (!first) return null;
    const record = (first.models ?? {}) as Record<string, ModelItem>;
    const model = Object.values(record)[0];
    return model ? { providerID: first.id, modelID: model.id } : null;
  }, [providerList]);

  // Fall back to the first configured model when nothing is selected yet.
  useEffect(() => {
    if (!open || !defaultModel) return;
    setDraft((prev) =>
      prev.providerID && prev.modelID
        ? prev
        : {
            ...prev,
            providerID: prev.providerID || defaultModel.providerID,
            modelID: prev.modelID || defaultModel.modelID,
          },
    );
  }, [open, defaultModel]);

  const validate = (value: Draft): string | null => {
    if (!value.name.trim()) return t.automations.validationNameRequired;
    if (!value.prompt.trim()) return t.automations.validationPromptRequired;
    if (!value.providerID || !value.modelID)
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
    setError(null);
    await onSave(toPayload(draft));
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
      return {
        ...prev,
        weekdays: Array.from(next).sort((a, b) => a - b),
      };
    });
  };

  return (
    <Modal isOpen={open} onOpenChange={onOpenChange}>
      <Modal.Backdrop>
        <Modal.Container>
          <Modal.Dialog className='w-full sm:max-w-[560px]'>
            <Modal.CloseTrigger />
            <Modal.Header>
              <Modal.Heading>
                {task
                  ? t.automations.editorTitleEdit
                  : t.automations.editorTitleNew}
              </Modal.Heading>
            </Modal.Header>
            <Modal.Body className='flex max-h-[70vh] flex-col gap-4 overflow-y-auto'>
              <p className='text-muted text-sm'>
                {t.automations.editorDescription}
              </p>

              <div className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
                <div className='flex flex-col gap-1.5'>
                  <Label>{t.automations.editorName}</Label>
                  <Input
                    variant='secondary'
                    value={draft.name}
                    maxLength={80}
                    placeholder={t.automations.editorNamePlaceholder}
                    onChange={(event) =>
                      setDraft((prev) => ({
                        ...prev,
                        name: event.target.value,
                      }))
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
                        <Input
                          type='time'
                          variant='secondary'
                          value={time}
                          onChange={(event) =>
                            setTime(index, event.target.value)
                          }
                        />
                        <Button
                          isIconOnly
                          size='sm'
                          variant='ghost'
                          aria-label={t.automations.editorRemoveTime}
                          onPress={() => removeTime(index)}
                        >
                          <Icon data={Xmark} size={14} />
                        </Button>
                      </div>
                    ))}
                    <Button
                      size='sm'
                      variant='outline'
                      className='w-fit gap-1.5'
                      onPress={addTime}
                    >
                      <Icon data={Plus} size={14} />
                      {t.automations.editorAddTime}
                    </Button>
                  </div>
                </div>
              ) : null}

              {draft.kind === 'weekly' ? (
                <div className='flex flex-col gap-2'>
                  <Label>{t.automations.editorWeekdays}</Label>
                  <div className='flex flex-wrap gap-3'>
                    {WEEKDAYS.map((weekday) => {
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
                          onChange={(selected) =>
                            toggleWeekday(weekday, selected)
                          }
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
                <div className='grid grid-cols-2 gap-4'>
                  <div className='flex flex-col gap-1.5'>
                    <Label>{t.automations.editorDate}</Label>
                    <Input
                      type='date'
                      variant='secondary'
                      value={draft.date}
                      onChange={(event) =>
                        setDraft((prev) => ({
                          ...prev,
                          date: event.target.value,
                        }))
                      }
                    />
                  </div>
                  <div className='flex flex-col gap-1.5'>
                    <Label>{t.automations.editorTime}</Label>
                    <Input
                      type='time'
                      variant='secondary'
                      value={draft.time}
                      onChange={(event) =>
                        setDraft((prev) => ({
                          ...prev,
                          time: event.target.value,
                        }))
                      }
                    />
                  </div>
                </div>
              ) : null}

              {draft.kind === 'cron' ? (
                <div className='flex flex-col gap-1.5'>
                  <Label>{t.automations.editorCron}</Label>
                  <Input
                    variant='secondary'
                    className='font-mono'
                    value={draft.cron}
                    placeholder={t.automations.editorCronPlaceholder}
                    onChange={(event) =>
                      setDraft((prev) => ({
                        ...prev,
                        cron: event.target.value,
                      }))
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
                  variant='secondary'
                  rows={4}
                  className='min-h-24 w-full resize-none'
                  value={draft.prompt}
                  placeholder={t.automations.editorPromptPlaceholder}
                  onChange={(event) =>
                    setDraft((prev) => ({
                      ...prev,
                      prompt: event.target.value,
                    }))
                  }
                />
              </div>

              <div className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
                <div className='flex flex-col gap-1.5'>
                  <Label>{t.automations.editorProvider}</Label>
                  <Select
                    aria-label={t.automations.editorProvider}
                    value={draft.providerID || undefined}
                    onChange={(key) => {
                      const providerID = key ? String(key) : '';
                      const record = (providerList.find(
                        (entry) => entry.id === providerID,
                      )?.models ?? {}) as Record<string, ModelItem>;
                      const firstModel = Object.values(record)[0];
                      setDraft((prev) => ({
                        ...prev,
                        providerID,
                        modelID: firstModel ? firstModel.id : '',
                        variant: '',
                      }));
                    }}
                  >
                    <Select.Trigger>
                      <Select.Value />
                      <Select.Indicator />
                    </Select.Trigger>
                    <Select.Popover className='rounded-lg'>
                      <ListBox>
                        {providerList.map((entry) => (
                          <ListBox.Item
                            key={entry.id}
                            id={entry.id}
                            className='rounded-md'
                          >
                            <Label>{entry.name || entry.id}</Label>
                          </ListBox.Item>
                        ))}
                      </ListBox>
                    </Select.Popover>
                  </Select>
                </div>
                <div className='flex flex-col gap-1.5'>
                  <Label>{t.automations.editorModel}</Label>
                  <Select
                    aria-label={t.automations.editorModel}
                    value={draft.modelID || undefined}
                    onChange={(key) =>
                      setDraft((prev) => ({
                        ...prev,
                        modelID: key ? String(key) : '',
                        variant: '',
                      }))
                    }
                  >
                    <Select.Trigger>
                      <Select.Value />
                      <Select.Indicator />
                    </Select.Trigger>
                    <Select.Popover className='rounded-lg'>
                      <ListBox>
                        {models.map((model) => (
                          <ListBox.Item
                            key={model.id}
                            id={model.id}
                            className='rounded-md'
                          >
                            <Label>{model.name || model.id}</Label>
                          </ListBox.Item>
                        ))}
                      </ListBox>
                    </Select.Popover>
                  </Select>
                </div>
              </div>

              <div className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
                <div className='flex flex-col gap-1.5'>
                  <Label>{t.automations.editorVariant}</Label>
                  <Select
                    aria-label={t.automations.editorVariant}
                    value={draft.variant || '__default'}
                    isDisabled={variantOptions.length === 0}
                    onChange={(key) =>
                      setDraft((prev) => ({
                        ...prev,
                        variant: !key || key === '__default' ? '' : String(key),
                      }))
                    }
                  >
                    <Select.Trigger>
                      <Select.Value />
                      <Select.Indicator />
                    </Select.Trigger>
                    <Select.Popover className='rounded-lg'>
                      <ListBox>
                        <ListBox.Item id='__default' className='rounded-md'>
                          <Label>{t.automations.editorVariantDefault}</Label>
                        </ListBox.Item>
                        {variantOptions.map((variant) => (
                          <ListBox.Item
                            key={variant}
                            id={variant}
                            className='rounded-md'
                          >
                            <Label>{variant}</Label>
                          </ListBox.Item>
                        ))}
                      </ListBox>
                    </Select.Popover>
                  </Select>
                </div>
                <div className='flex flex-col gap-1.5'>
                  <Label>{t.automations.editorAgent}</Label>
                  <Select
                    aria-label={t.automations.editorAgent}
                    value={draft.agent || '__default'}
                    onChange={(key) =>
                      setDraft((prev) => ({
                        ...prev,
                        agent: !key || key === '__default' ? '' : String(key),
                      }))
                    }
                  >
                    <Select.Trigger>
                      <Select.Value />
                      <Select.Indicator />
                    </Select.Trigger>
                    <Select.Popover className='rounded-lg'>
                      <ListBox>
                        <ListBox.Item id='__default' className='rounded-md'>
                          <Label>{t.automations.editorAgentDefault}</Label>
                        </ListBox.Item>
                        {agentList.map((agent) => (
                          <ListBox.Item
                            key={agent.name}
                            id={agent.name}
                            className='rounded-md'
                          >
                            <Label>{agent.name}</Label>
                          </ListBox.Item>
                        ))}
                      </ListBox>
                    </Select.Popover>
                  </Select>
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
                    setDraft((prev) => ({
                      ...prev,
                      permissionAutoAccept: selected,
                    }))
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
            <Modal.Footer>
              <Button
                variant='ghost'
                size='sm'
                slot='close'
                isDisabled={saving}
              >
                {t.common.cancel}
              </Button>
              <Button
                variant='primary'
                size='sm'
                isPending={saving}
                onPress={handleSave}
              >
                {t.automations.editorSave}
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}
