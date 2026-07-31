import type { Meta, StoryObj } from '@storybook/react';
import { Fragment, useCallback, useEffect, useRef, useState } from 'react';

import {
  Button,
  Dropdown,
  Header,
  Label,
  ListBox,
  ProgressCircle,
  Select,
  Separator,
  TextShimmer,
  Tooltip,
} from '@aero/ui';
import {
  Add01Icon,
  ArrowUp01Icon,
  Attachment01Icon,
  ComputerIcon,
  Copy01Icon,
  Database01Icon,
  Delete02Icon,
  GitBranchIcon,
  Mic01Icon,
  MoreHorizontalIcon,
  MusicNote01Icon,
  PaintBoardIcon,
  PencilEdit01Icon,
  TextIcon,
} from '@aero/ui/icons';
import { HugeiconsIcon, type IconSvgElement } from '@aero/ui/icons';

import {
  ChatAttachment,
  ChatAttachmentGroup,
  ChatAttachmentInput,
  PromptInput,
  PromptSuggestion,
} from './index';

const meta = {
  parameters: { layout: 'padded' },
  tags: ['autodocs'],
  title: 'Components/AI/PromptInput',
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

interface PendingAttachment {
  id: string;
  mimeType?: string;
  name: string;
  src?: string;
}

function attachmentId(file: File): string {
  return `${file.name}-${file.lastModified}-${globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2)}`;
}

function releaseAttachment(attachment: PendingAttachment): void {
  if (attachment.src?.startsWith('blob:')) URL.revokeObjectURL(attachment.src);
}

function useAttachments() {
  const [attachments, setAttachments] = useState<PendingAttachment[]>([]);
  const latest = useRef(attachments);
  useEffect(() => {
    latest.current = attachments;
  }, [attachments]);
  useEffect(() => () => latest.current.forEach(releaseAttachment), []);
  const clearAttachments = useCallback(() => {
    setAttachments((current) => {
      current.forEach(releaseAttachment);
      return [];
    });
  }, []);
  const handleFilesSelected = useCallback((files: File[]) => {
    setAttachments((current) => [
      ...current,
      ...files.map((file) => ({
        id: attachmentId(file),
        mimeType: file.type,
        name: file.name,
        src: file.type.startsWith('image/')
          ? URL.createObjectURL(file)
          : undefined,
      })),
    ]);
  }, []);
  const removeAttachment = useCallback((id: string) => {
    setAttachments((current) => {
      const attachment = current.find((item) => item.id === id);
      if (attachment) releaseAttachment(attachment);
      return current.filter((item) => item.id !== id);
    });
  }, []);
  return {
    attachments,
    clearAttachments,
    handleFilesSelected,
    removeAttachment,
  };
}

function AttachmentPreviews({
  attachments,
  onRemove,
}: {
  attachments: PendingAttachment[];
  onRemove: (id: string) => void;
}) {
  if (!attachments.length) return null;
  return (
    <PromptInput.Attachments>
      <ChatAttachmentGroup>
        {attachments.map((attachment) => (
          <ChatAttachment
            key={attachment.id}
            mimeType={attachment.mimeType}
            name={attachment.name}
            src={attachment.src}
          >
            <ChatAttachment.Preview />
            <ChatAttachment.Remove
              aria-label={`Remove ${attachment.name}`}
              onPress={() => onRemove(attachment.id)}
            />
          </ChatAttachment>
        ))}
      </ChatAttachmentGroup>
    </PromptInput.Attachments>
  );
}

const modelGroups = [
  {
    models: [
      { id: 'gpt-5.4', name: 'GPT-5.4' },
      { id: 'gpt-5.3-mini', name: 'GPT-5.3 Mini' },
      { id: 'gpt-4.1', name: 'GPT-4.1' },
    ],
    provider: 'OpenAI',
  },
  {
    models: [
      { id: 'claude-opus-4.1', name: 'Claude Opus 4.1' },
      { id: 'claude-sonnet-4.5', name: 'Claude Sonnet 4.5' },
      { id: 'claude-haiku-3.5', name: 'Claude Haiku 3.5' },
    ],
    provider: 'Anthropic',
  },
  {
    models: [
      { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro' },
      { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash' },
    ],
    provider: 'Google',
  },
  {
    models: [{ id: 'grok-4', name: 'Grok 4' }],
    provider: 'xAI',
  },
];

function ModelSelector({ variant }: { variant?: 'secondary' }) {
  return (
    <Select
      aria-label='Model'
      className='w-[160px] sm:w-[220px]'
      defaultValue='gpt-5.4'
      variant={variant}
    >
      <Select.Trigger>
        <Select.Value />
        <Select.Indicator />
      </Select.Trigger>
      <Select.Popover>
        <ListBox>
          {modelGroups.map((group, index) => (
            <Fragment key={group.provider}>
              {index ? <Separator /> : null}
              <ListBox.Section>
                <Header>{group.provider}</Header>
                {group.models.map((model) => (
                  <ListBox.Item
                    key={model.id}
                    id={model.id}
                    textValue={model.name}
                  >
                    {model.name}
                    <ListBox.ItemIndicator />
                  </ListBox.Item>
                ))}
              </ListBox.Section>
            </Fragment>
          ))}
        </ListBox>
      </Select.Popover>
    </Select>
  );
}

function Composer({
  layout,
  variant,
}: {
  layout?: 'compact' | 'inline';
  variant?: 'secondary';
}) {
  const {
    attachments,
    clearAttachments,
    handleFilesSelected,
    removeAttachment,
  } = useAttachments();
  const [value, setValue] = useState('');
  const submit = () => {
    setValue('');
    clearAttachments();
  };
  const isFollowUp = layout === 'compact' || layout === 'inline';
  return (
    <div className='w-full max-w-[640px]'>
      <PromptInput
        layout={layout}
        value={value}
        variant={variant}
        onSubmit={submit}
        onValueChange={setValue}
      >
        <ChatAttachmentInput onFilesSelected={handleFilesSelected}>
          <ChatAttachmentInput.Dropzone
            render={(dropzoneProps) => (
              <PromptInput.Shell {...dropzoneProps}>
                <PromptInput.Content>
                  <AttachmentPreviews
                    attachments={attachments}
                    onRemove={removeAttachment}
                  />
                  <PromptInput.TextArea
                    placeholder={
                      isFollowUp
                        ? 'Send follow-up'
                        : 'What do you want to know?'
                    }
                  />
                </PromptInput.Content>
                <PromptInput.Toolbar>
                  <PromptInput.ToolbarStart>
                    <ChatAttachmentInput.Trigger
                      render={(triggerProps) => (
                        <PromptInput.Action
                          {...triggerProps}
                          aria-label='Attach file'
                          tooltip='Attach file'
                          variant={variant ? 'outline' : undefined}
                        >
                          <HugeiconsIcon
                            aria-hidden
                            className='size-4'
                            icon={Attachment01Icon}
                            strokeWidth={2}
                          />
                        </PromptInput.Action>
                      )}
                    />
                    {!isFollowUp ? (
                      <ModelSelector
                        variant={variant ? undefined : 'secondary'}
                      />
                    ) : null}
                  </PromptInput.ToolbarStart>
                  <PromptInput.ToolbarEnd>
                    <PromptInput.Send>
                      <HugeiconsIcon
                        aria-hidden
                        className='size-4'
                        icon={ArrowUp01Icon}
                        strokeWidth={2}
                      />
                    </PromptInput.Send>
                  </PromptInput.ToolbarEnd>
                </PromptInput.Toolbar>
              </PromptInput.Shell>
            )}
          />
        </ChatAttachmentInput>
        <PromptInput.Footer>
          {variant
            ? 'Secondary surface with default background tokens.'
            : 'AI can make mistakes. Check important info.'}
        </PromptInput.Footer>
      </PromptInput>
    </div>
  );
}

export const Default: Story = { render: () => <Composer /> };
export const Secondary: Story = {
  render: () => <Composer variant='secondary' />,
};
export const Inline: Story = { render: () => <Composer layout='inline' /> };
export const Compact: Story = { render: () => <Composer layout='compact' /> };

function RunStateDemo() {
  const [value, setValue] = useState('');
  const [status, setStatus] = useState<'ready' | 'streaming' | 'submitted'>(
    'ready',
  );
  const timers = useRef<number[]>([]);
  const clearTimers = useCallback(() => {
    timers.current.forEach(window.clearTimeout);
    timers.current = [];
  }, []);
  useEffect(() => clearTimers, [clearTimers]);
  const stop = () => {
    clearTimers();
    setStatus('ready');
  };
  const submit = () => {
    if (!value.trim() || status !== 'ready') return;
    setValue('');
    setStatus('submitted');
    clearTimers();
    timers.current.push(
      window.setTimeout(() => setStatus('streaming'), 400),
      window.setTimeout(() => setStatus('ready'), 1800),
    );
  };
  return (
    <div className='w-full max-w-[640px]'>
      <PromptInput
        status={status}
        value={value}
        onStop={stop}
        onSubmit={submit}
        onValueChange={setValue}
      >
        <PromptInput.Shell>
          <PromptInput.Content>
            <PromptInput.TextArea placeholder='Send to see submitted → streaming → ready' />
          </PromptInput.Content>
          <PromptInput.Toolbar>
            <PromptInput.ToolbarEnd>
              <PromptInput.Send />
            </PromptInput.ToolbarEnd>
          </PromptInput.Toolbar>
        </PromptInput.Shell>
        <PromptInput.Footer>
          Status-driven send button with stop while generating.
        </PromptInput.Footer>
      </PromptInput>
    </div>
  );
}

export const RunState: Story = {
  name: 'Run State',
  render: () => <RunStateDemo />,
};

interface QueueValue {
  attachments?: PendingAttachment[];
  id: string;
  text: string;
}

const sampleAttachments: PendingAttachment[] = [
  {
    id: 'attachment-1',
    mimeType: 'image/png',
    name: 'hero.png',
    src: '/assets/docs/demo/hero.png',
  },
  {
    id: 'attachment-2',
    mimeType: 'image/jpeg',
    name: 'dashboard.jpg',
    src: '/assets/docs/demo/dashboard.jpg',
  },
  { id: 'attachment-3', mimeType: 'application/pdf', name: 'brief.pdf' },
];

const initialQueue: QueueValue[] = [
  {
    attachments: sampleAttachments.slice(0, 2),
    id: 'queue-1',
    text: 'Review the attached mockups before implementing the landing page updates.',
  },
  {
    attachments: sampleAttachments,
    id: 'queue-2',
    text: 'Add dark mode support to the settings page.',
  },
  {
    id: 'queue-3',
    text: 'Refactor the queue item layout to match Codex.',
  },
  { attachments: sampleAttachments.slice(0, 1), id: 'queue-4', text: '' },
];

function queueItemLabel(item: QueueValue): string {
  if (item.text.trim()) return item.text;
  const count = item.attachments?.length ?? 0;
  return count ? `${count} attachment${count === 1 ? '' : 's'}` : '';
}

function cloneAttachment(attachment: PendingAttachment): PendingAttachment {
  return {
    id: attachment.id,
    mimeType: attachment.mimeType,
    name: attachment.name,
    src: attachment.src,
  };
}

function cloneQueueItem(item: QueueValue, id = item.id): QueueValue {
  return {
    attachments: item.attachments?.map(cloneAttachment),
    id,
    text: item.text,
  };
}

function QueueItemMenu({
  item,
  onDuplicate,
  onEdit,
  onRemove,
}: {
  item: QueueValue;
  onDuplicate: (id: string) => void;
  onEdit: (id: string) => void;
  onRemove: (id: string) => void;
}) {
  return (
    <Dropdown>
      <PromptInput.Queue.Item.More aria-label='More queue actions' />
      <Dropdown.Popover className='w-44' offset={6} placement='bottom end'>
        <Dropdown.Menu
          aria-label='Queued prompt actions'
          onAction={(key) => {
            if (key === 'edit') onEdit(item.id);
            if (key === 'duplicate') onDuplicate(item.id);
            if (key === 'remove') onRemove(item.id);
          }}
        >
          <Dropdown.Item id='edit' textValue='Edit prompt'>
            <HugeiconsIcon
              aria-hidden
              className='text-muted size-4 shrink-0'
              icon={PencilEdit01Icon}
              strokeWidth={2}
            />
            <Label>Edit prompt</Label>
          </Dropdown.Item>
          <Dropdown.Item id='duplicate' textValue='Duplicate'>
            <HugeiconsIcon
              aria-hidden
              className='text-muted size-4 shrink-0'
              icon={Copy01Icon}
              strokeWidth={2}
            />
            <Label>Duplicate</Label>
          </Dropdown.Item>
          <Dropdown.Item
            id='remove'
            textValue='Remove from queue'
            variant='danger'
          >
            <HugeiconsIcon
              aria-hidden
              className='text-danger size-4 shrink-0'
              icon={Delete02Icon}
              strokeWidth={2}
            />
            <Label>Remove from queue</Label>
          </Dropdown.Item>
        </Dropdown.Menu>
      </Dropdown.Popover>
    </Dropdown>
  );
}

function QueueDemo() {
  const [value, setValue] = useState('');
  const [queue, setQueue] = useState<QueueValue[]>(() =>
    initialQueue.map((item) => cloneQueueItem(item)),
  );
  const { attachments, clearAttachments, removeAttachment } = useAttachments();
  const submit = () => {
    const text = value.trim();
    if (!text && !attachments.length) return;
    setQueue((current) => [
      ...current,
      {
        attachments: attachments.length
          ? attachments.map(cloneAttachment)
          : undefined,
        id: crypto.randomUUID(),
        text,
      },
    ]);
    setValue('');
    clearAttachments();
  };
  const remove = (id: string) =>
    setQueue((current) => current.filter((item) => item.id !== id));
  const duplicate = (id: string) =>
    setQueue((current) => {
      const index = current.findIndex((item) => item.id === id);
      const item = current[index];
      if (!item) return current;
      const copy = cloneQueueItem(item, crypto.randomUUID());
      return [
        ...current.slice(0, index + 1),
        copy,
        ...current.slice(index + 1),
      ];
    });
  const edit = (id: string) => {
    const item = queue.find((queued) => queued.id === id);
    if (!item) return;
    setValue(item.text);
    remove(id);
  };
  return (
    <div className='w-full max-w-[640px]'>
      <PromptInput value={value} onSubmit={submit} onValueChange={setValue}>
        {queue.length ? (
          <PromptInput.Queue>
            <PromptInput.Queue.List values={queue} onReorder={setQueue}>
              {queue.map((item) => (
                <PromptInput.Queue.Item key={item.id} value={item}>
                  <PromptInput.Queue.Item.Handle aria-label='Reorder queued prompt' />
                  <PromptInput.Queue.Item.Body>
                    <PromptInput.Queue.Item.Icon />
                    <PromptInput.Queue.Item.Content>
                      {queueItemLabel(item)}
                    </PromptInput.Queue.Item.Content>
                  </PromptInput.Queue.Item.Body>
                  <PromptInput.Queue.Item.Actions>
                    <PromptInput.Queue.Item.Remove
                      aria-label='Remove queued prompt'
                      onPress={() => remove(item.id)}
                    />
                    <QueueItemMenu
                      item={item}
                      onDuplicate={duplicate}
                      onEdit={edit}
                      onRemove={remove}
                    />
                  </PromptInput.Queue.Item.Actions>
                </PromptInput.Queue.Item>
              ))}
            </PromptInput.Queue.List>
          </PromptInput.Queue>
        ) : null}
        <PromptInput.Shell>
          <PromptInput.Content>
            <AttachmentPreviews
              attachments={attachments}
              onRemove={removeAttachment}
            />
            <PromptInput.TextArea placeholder='Ask for follow-up changes' />
          </PromptInput.Content>
          <PromptInput.Toolbar>
            <PromptInput.ToolbarStart>
              <PromptInput.Action
                aria-label='Add attachment'
                tooltip='Add attachment'
              >
                <HugeiconsIcon
                  aria-hidden
                  className='size-4'
                  icon={Attachment01Icon}
                  strokeWidth={2}
                />
              </PromptInput.Action>
            </PromptInput.ToolbarStart>
            <PromptInput.ToolbarEnd>
              <PromptInput.Send />
            </PromptInput.ToolbarEnd>
          </PromptInput.Toolbar>
        </PromptInput.Shell>
      </PromptInput>
    </div>
  );
}

export const Queue: Story = { render: () => <QueueDemo /> };

const reviewModels = [
  { id: 'composer-2.5', label: 'Composer 2.5', meta: 'Fast' },
  { id: 'opus-4.8', label: 'Opus 4.8', meta: '1M High' },
  { id: 'gpt-5.5', label: 'GPT-5.5', meta: '1M High' },
  { id: 'sonnet-4.6', label: 'Sonnet 4.6', meta: '1M Medium' },
  { id: 'codex-5.3', label: 'Codex 5.3', meta: 'High Fast' },
  { id: 'opus-4.6', label: 'Opus 4.6', meta: '1M High' },
  { id: 'gemini-3.1-pro', label: 'Gemini 3.1 Pro', meta: '' },
];

function ReviewComposerDemo() {
  const [value, setValue] = useState('');
  const [model, setModel] = useState('composer-2.5');
  const selected =
    reviewModels.find((item) => item.id === model) ?? reviewModels[0]!;
  return (
    <div className='flex w-full max-w-[800px] min-w-0 flex-col gap-3 p-4 sm:p-5'>
      <div className='flex flex-wrap items-center gap-1.5'>
        <Button size='sm' variant='outline'>
          <span>Review</span>
          <span className='text-success-soft-foreground font-semibold'>
            +469
          </span>
          <span className='text-danger-soft-foreground font-semibold'>-34</span>
        </Button>
        <Button className='hidden sm:inline-flex' size='sm' variant='outline'>
          <span>Create Branch &amp; Commit</span>
        </Button>
        <Tooltip delay={0}>
          <Tooltip.Trigger>
            <Button
              isIconOnly
              aria-label='More actions'
              size='sm'
              variant='outline'
            >
              <HugeiconsIcon
                aria-hidden
                icon={MoreHorizontalIcon}
                size={16}
                strokeWidth={2}
              />
            </Button>
          </Tooltip.Trigger>
          <Tooltip.Content>More actions</Tooltip.Content>
        </Tooltip>
      </div>
      <PromptInput
        className='group max-w-full min-w-0 overflow-hidden'
        layout='compact'
        value={value}
        onSubmit={() => setValue('')}
        onValueChange={setValue}
      >
        <PromptInput.Shell>
          <PromptInput.Content>
            <PromptInput.TextArea
              className='min-w-0'
              placeholder='Send follow-up'
            />
          </PromptInput.Content>
          <PromptInput.Toolbar>
            <PromptInput.ToolbarStart>
              <PromptInput.Action
                aria-label='Add context'
                tooltip='Add context'
              >
                <HugeiconsIcon
                  aria-hidden
                  icon={Add01Icon}
                  size={16}
                  strokeWidth={2}
                />
              </PromptInput.Action>
              <Select
                aria-label='Model'
                className='w-auto min-w-0'
                value={model}
                onChange={(key) => typeof key === 'string' && setModel(key)}
              >
                <Select.Trigger className='h-8 max-w-[180px] min-w-0 rounded-full border-0 bg-transparent px-2 shadow-none'>
                  <Select.Value>
                    <span className='flex min-w-0 items-center gap-1'>
                      <span className='truncate'>{selected.label}</span>
                      {selected.meta ? (
                        <span className='text-muted shrink-0'>
                          {selected.meta}
                        </span>
                      ) : null}
                    </span>
                  </Select.Value>
                  <Select.Indicator />
                </Select.Trigger>
                <Select.Popover className='w-[min(320px,calc(100vw-2rem))]'>
                  <ListBox>
                    {reviewModels.map((item) => (
                      <ListBox.Item
                        key={item.id}
                        id={item.id}
                        textValue={item.label}
                      >
                        <span className='flex min-w-0 items-center gap-1'>
                          <span>{item.label}</span>
                          {item.meta ? (
                            <span className='text-muted'>{item.meta}</span>
                          ) : null}
                        </span>
                        <ListBox.ItemIndicator />
                      </ListBox.Item>
                    ))}
                  </ListBox>
                </Select.Popover>
              </Select>
            </PromptInput.ToolbarStart>
            <PromptInput.ToolbarEnd>
              {value.trim() ? (
                <>
                  <PromptInput.Action
                    aria-label='Voice input'
                    tooltip='Voice input'
                  >
                    <HugeiconsIcon
                      aria-hidden
                      icon={Mic01Icon}
                      size={16}
                      strokeWidth={2}
                    />
                  </PromptInput.Action>
                  <PromptInput.Send>
                    <HugeiconsIcon
                      aria-hidden
                      icon={ArrowUp01Icon}
                      size={16}
                      strokeWidth={2}
                    />
                  </PromptInput.Send>
                </>
              ) : (
                <PromptInput.Action
                  aria-label='Voice input'
                  tooltip='Voice input'
                >
                  <HugeiconsIcon
                    aria-hidden
                    icon={Mic01Icon}
                    size={16}
                    strokeWidth={2}
                  />
                </PromptInput.Action>
              )}
            </PromptInput.ToolbarEnd>
          </PromptInput.Toolbar>
        </PromptInput.Shell>
      </PromptInput>
      <div className='text-muted flex items-center justify-between gap-3 px-2 text-xs sm:px-4 sm:text-sm'>
        <div className='flex items-center gap-3 sm:gap-4'>
          <span className='flex items-center gap-1.5'>
            <HugeiconsIcon
              aria-hidden
              icon={GitBranchIcon}
              size={16}
              strokeWidth={2}
            />
            develop
          </span>
          <span className='flex items-center gap-1.5'>
            <HugeiconsIcon
              aria-hidden
              icon={ComputerIcon}
              size={16}
              strokeWidth={2}
            />
            Local
          </span>
        </div>
        <div className='flex shrink-0 items-center gap-1.5 sm:gap-2'>
          <ProgressCircle
            aria-label='Task progress'
            color='default'
            size='sm'
            value={32}
          >
            <ProgressCircle.Track>
              <ProgressCircle.TrackCircle />
              <ProgressCircle.FillCircle />
            </ProgressCircle.Track>
          </ProgressCircle>
          <span className='tabular-nums'>32%</span>
        </div>
      </div>
    </div>
  );
}

export const ReviewComposer: Story = {
  name: 'Review Composer',
  render: () => <ReviewComposerDemo />,
};

const suggestionItems: Array<{ icon: IconSvgElement; label: string }> = [
  { icon: PaintBoardIcon, label: 'Design a launch page' },
  { icon: TextIcon, label: 'Summarize meeting notes' },
  { icon: MusicNote01Icon, label: 'Generate a sound brief' },
  { icon: Database01Icon, label: 'Plan a data model' },
];

function WithSuggestionsDemo() {
  const [value, setValue] = useState('');
  return (
    <div className='mx-auto flex min-h-[520px] w-full max-w-[920px] flex-col items-center justify-center gap-6 px-4'>
      <div className='flex flex-col items-center gap-2 text-center'>
        <h2 className='text-foreground text-3xl font-normal tracking-tight'>
          Build something useful with{' '}
          <TextShimmer className='text-muted'>Namespace UIKit AI</TextShimmer>
        </h2>
        <p className='text-muted text-sm'>
          Start with a prompt, add files, or pick a suggestion to shape the
          first response.
        </p>
      </div>
      <PromptInput
        className='w-full max-w-[780px]'
        value={value}
        onSubmit={() => setValue('')}
        onValueChange={setValue}
      >
        <PromptInput.Shell className='shadow-overlay'>
          <PromptInput.Content>
            <PromptInput.TextArea
              className='min-h-19'
              placeholder='Describe an app, workflow, or interface...'
            />
          </PromptInput.Content>
          <PromptInput.Toolbar>
            <PromptInput.ToolbarStart>
              <PromptInput.Action aria-label='Use voice' tooltip='Use voice'>
                <HugeiconsIcon
                  aria-hidden
                  className='size-4'
                  icon={Mic01Icon}
                  strokeWidth={2}
                />
              </PromptInput.Action>
              <PromptInput.Action
                aria-label='Add context'
                tooltip='Add context'
              >
                <HugeiconsIcon
                  aria-hidden
                  className='size-4'
                  icon={Add01Icon}
                  strokeWidth={2}
                />
              </PromptInput.Action>
            </PromptInput.ToolbarStart>
            <PromptInput.ToolbarEnd>
              <PromptInput.Send>
                <HugeiconsIcon
                  aria-hidden
                  className='size-4'
                  icon={ArrowUp01Icon}
                  strokeWidth={2}
                />
              </PromptInput.Send>
            </PromptInput.ToolbarEnd>
          </PromptInput.Toolbar>
        </PromptInput.Shell>
      </PromptInput>
      <PromptSuggestion className='w-full max-w-[560px]'>
        <PromptSuggestion.Items className='grid grid-cols-1 gap-2 sm:grid-cols-2'>
          {suggestionItems.map((suggestion) => (
            <PromptSuggestion.Item
              key={suggestion.label}
              className='items-center justify-start'
              showEndIcon={false}
              onPress={() => setValue(suggestion.label)}
            >
              <span className='inline-flex min-w-0 items-center gap-2'>
                <HugeiconsIcon
                  aria-hidden
                  className='size-4 shrink-0'
                  icon={suggestion.icon}
                  strokeWidth={2}
                />
                <span className='truncate'>{suggestion.label}</span>
              </span>
            </PromptSuggestion.Item>
          ))}
        </PromptSuggestion.Items>
      </PromptSuggestion>
    </div>
  );
}

export const WithSuggestions: Story = {
  name: 'With Suggestions',
  render: () => <WithSuggestionsDemo />,
};
