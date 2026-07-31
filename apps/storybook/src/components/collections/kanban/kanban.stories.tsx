import type { Meta, StoryObj } from '@storybook/react';
import type { FormEvent, ReactNode } from 'react';
import { createContext, useContext, useMemo, useRef, useState } from 'react';

import { Avatar } from '@aero/ui/avatar';
import { Button } from '@aero/ui/button';
import { Chip } from '@aero/ui/chip';
import { Dropdown } from '@aero/ui/dropdown';
import { Header } from '@aero/ui/header';
import {
  Add01Icon,
  ArrowRight01Icon,
  Attachment01Icon,
  Calendar03Icon,
  CancelCircleIcon,
  CircleCheckIcon,
  Clock01Icon,
  Comment01Icon,
  Delete02Icon,
  FlashIcon,
  MoreHorizontalIcon,
} from '@aero/ui/icons';
import { HugeiconsIcon } from '@aero/ui/icons';
import { Input } from '@aero/ui/input';
import { Label } from '@aero/ui/label';
import { Modal } from '@aero/ui/modal';
import { ProgressBar } from '@aero/ui/progress-bar';
import { Separator } from '@aero/ui/separator';
import { TextArea } from '@aero/ui/textarea';
import { TextField } from '@aero/ui/textfield';

import {
  Kanban,
  type KanbanSize,
  useKanban,
  useKanbanCardPlaceholder,
  useKanbanColumn,
  type UseKanbanReturn,
} from './index';

const meta = {
  component: Kanban,
  parameters: { layout: 'padded' },
  tags: ['autodocs'],
  title: 'Components/Collections/Kanban',
} satisfies Meta<typeof Kanban>;
export default meta;
type Story = StoryObj<typeof meta>;

const people: Record<string, string> = {
  Alex: 'orange',
  Diego: 'black',
  Emily: 'white',
  Jake: 'green',
  Maria: 'red',
  Sam: 'purple',
};
const avatar = (name: string) =>
  `/assets/avatars/${people[name] ?? 'blue'}.jpg`;

interface Ticket {
  assignees?: { avatar: string; name: string }[];
  attachments?: number;
  comments?: number;
  description: string;
  id: string;
  image?: string;
  progress?: number;
  status: 'Closed' | 'In Progress' | 'Open';
  tags?: {
    color: 'accent' | 'danger' | 'success' | 'warning';
    label: string;
  }[];
  title: string;
}

const ticketAvatars = {
  Anna: '/assets/avatars/red.jpg',
  Dave: '/assets/avatars/orange.jpg',
  Lena: '/assets/avatars/green.jpg',
  Mike: '/assets/avatars/white.jpg',
  Nina: '/assets/avatars/black.jpg',
  Omar: '/assets/avatars/red.jpg',
} as const;
const assignee = (name: keyof typeof ticketAvatars) => ({
  avatar: ticketAvatars[name],
  name,
});
const tickets: Ticket[] = [
  {
    assignees: [assignee('Anna'), assignee('Mike')],
    attachments: 3,
    comments: 8,
    description: 'Integrate Third-Party API Services',
    id: '1',
    image: '/assets/docs/cherries.jpeg',
    progress: 0,
    status: 'Open',
    tags: [
      { color: 'success', label: 'Low Priority' },
      { color: 'warning', label: 'In Progress' },
    ],
    title: 'Develop API for User Profiles',
  },
  {
    assignees: [assignee('Lena')],
    comments: 3,
    description: 'Redesign the login flow for better conversion',
    id: '2',
    status: 'Open',
    tags: [{ color: 'danger', label: 'High Priority' }],
    title: 'Login Page Redesign',
  },
  {
    assignees: [assignee('Dave'), assignee('Nina')],
    attachments: 2,
    comments: 12,
    description: 'Create reusable component library for the design system',
    id: '3',
    image: '/assets/docs/oranges.jpeg',
    progress: 45,
    status: 'In Progress',
    tags: [
      { color: 'accent', label: 'Design' },
      { color: 'warning', label: 'In Progress' },
    ],
    title: 'Component Library Setup',
  },
  {
    assignees: [assignee('Omar')],
    comments: 5,
    description: 'Implement dark mode with system preference detection',
    id: '4',
    progress: 20,
    status: 'Open',
    tags: [{ color: 'accent', label: 'Feature' }],
    title: 'Feature: Dark Mode',
  },
  {
    assignees: [assignee('Mike'), assignee('Anna'), assignee('Lena')],
    attachments: 4,
    comments: 15,
    description: 'Fix intermittent connection errors on the staging database',
    id: '5',
    progress: 70,
    status: 'In Progress',
    tags: [
      { color: 'danger', label: 'Bug' },
      { color: 'danger', label: 'High Priority' },
    ],
    title: 'Database Connection Error',
  },
  {
    assignees: [assignee('Nina')],
    comments: 2,
    description: 'Optimize lazy loading and reduce initial bundle size',
    id: '6',
    image: '/assets/docs/robot1.jpeg',
    progress: 100,
    status: 'Closed',
    tags: [{ color: 'success', label: 'Done' }],
    title: 'Performance Optimization',
  },
  {
    assignees: [assignee('Dave')],
    description: 'Broken homepage link returns 404 for new visitors',
    id: '7',
    status: 'Open',
    tags: [{ color: 'danger', label: 'Bug' }],
    title: 'Broken Link on Homepage',
  },
  {
    assignees: [assignee('Omar'), assignee('Anna')],
    attachments: 1,
    comments: 7,
    description: 'Allow users to export reports and data as PDF files',
    id: '8',
    progress: 100,
    status: 'Closed',
    tags: [
      { color: 'accent', label: 'Feature' },
      { color: 'success', label: 'Done' },
    ],
    title: 'Feature: Export to PDF',
  },
];

let nextTicketId = 100;
const AddTaskContext = createContext({ open: () => {} });

function AddTaskProvider({
  children,
  column,
  kanban,
}: {
  children: ReactNode;
  column: Ticket['status'];
  kanban: UseKanbanReturn<Ticket>;
}) {
  const [isOpen, setOpen] = useState(false);
  const titleRef = useRef<HTMLInputElement>(null);
  const descriptionRef = useRef<HTMLTextAreaElement>(null);
  const addTaskContextValue = useMemo(
    () => ({ open: () => setOpen(true) }),
    [],
  );
  const submit = (event: FormEvent) => {
    event.preventDefault();
    const title = titleRef.current?.value.trim();
    const description = descriptionRef.current?.value.trim();
    if (!title) return;
    kanban.addItem({
      description: description ?? '',
      id: String(++nextTicketId),
      status: column,
      title,
    });
    setOpen(false);
  };
  return (
    <AddTaskContext value={addTaskContextValue}>
      {children}
      <Modal>
        <Modal.Backdrop isOpen={isOpen} onOpenChange={setOpen}>
          <Modal.Container>
            <Modal.Dialog className='sm:max-w-[380px]'>
              <Modal.CloseTrigger />
              <Modal.Header>
                <Modal.Heading>Add task to {column}</Modal.Heading>
              </Modal.Header>
              <Modal.Body className='flex flex-col gap-4 overflow-visible'>
                <form
                  className='flex flex-col gap-4'
                  id='add-task-form'
                  onSubmit={submit}
                >
                  <TextField autoFocus name='title' variant='secondary'>
                    <Label>Title</Label>
                    <Input ref={titleRef} placeholder='Task title' />
                  </TextField>
                  <TextField name='description' variant='secondary'>
                    <Label>Description</Label>
                    <TextArea
                      ref={descriptionRef}
                      placeholder='Brief description'
                      rows={3}
                    />
                  </TextField>
                </form>
              </Modal.Body>
              <Modal.Footer className='gap-2'>
                <Button slot='close' variant='ghost'>
                  Cancel
                </Button>
                <Button form='add-task-form' type='submit'>
                  Add task
                </Button>
              </Modal.Footer>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>
    </AddTaskContext>
  );
}

const ticketColumns = ['Open', 'In Progress', 'Closed'] as const;
function ColumnOptions({
  column,
  kanban,
}: {
  column: Ticket['status'];
  kanban: UseKanbanReturn<Ticket>;
}) {
  const otherColumns = ticketColumns.filter((value) => value !== column);
  const columnItems = kanban.list.items.filter(
    (ticket) => ticket.status === column,
  );
  return (
    <Dropdown>
      <Button isIconOnly aria-label='More options' size='sm' variant='ghost'>
        <HugeiconsIcon icon={MoreHorizontalIcon} />
      </Button>
      <Dropdown.Popover>
        <Dropdown.Menu>
          <Dropdown.Section>
            <Header>Column</Header>
            <Dropdown.Item
              textValue='Clear column'
              onAction={() => {
                for (const ticket of columnItems) kanban.removeItem(ticket.id);
              }}
            >
              <HugeiconsIcon className='text-danger' icon={Delete02Icon} />
              <Label className='text-danger'>Clear all tasks</Label>
            </Dropdown.Item>
          </Dropdown.Section>
          <Separator />
          <Dropdown.Section>
            <Header>Move all to</Header>
            {otherColumns.map((destination) => (
              <Dropdown.Item
                key={destination}
                textValue={`Move all to ${destination}`}
                onAction={() => {
                  for (const ticket of columnItems)
                    kanban.moveItem(ticket.id, destination);
                }}
              >
                <HugeiconsIcon icon={ArrowRight01Icon} />
                <Label>{destination}</Label>
              </Dropdown.Item>
            ))}
          </Dropdown.Section>
        </Dropdown.Menu>
      </Dropdown.Popover>
    </Dropdown>
  );
}

function TicketCard({ ticket }: { ticket: Ticket }) {
  return (
    <>
      {ticket.image ? (
        <img
          alt=''
          className='h-32 w-full rounded-lg object-cover'
          draggable={false}
          src={ticket.image}
        />
      ) : null}
      <div className='flex flex-col gap-2'>
        <span className='text-foreground leading-snug font-semibold'>
          {ticket.title}
        </span>
        <span className='text-muted line-clamp-2 text-sm'>
          {ticket.description}
        </span>
        {ticket.tags?.length ? (
          <div className='flex flex-wrap gap-1.5'>
            {ticket.tags.map((tag) => (
              <Chip color={tag.color} key={tag.label} size='sm' variant='soft'>
                {tag.label}
              </Chip>
            ))}
          </div>
        ) : null}
        {ticket.progress != null ? (
          <div className='flex items-center gap-2'>
            <ProgressBar
              aria-label='Progress'
              className='flex-1'
              color='accent'
              size='sm'
              value={ticket.progress}
            >
              <ProgressBar.Track>
                <ProgressBar.Fill />
              </ProgressBar.Track>
            </ProgressBar>
            <span className='text-muted text-xs tabular-nums'>
              {ticket.progress}%
            </span>
          </div>
        ) : null}
        {ticket.assignees || ticket.comments || ticket.attachments ? (
          <div className='mt-0.5 flex items-center justify-between'>
            {ticket.assignees?.length ? (
              <div className='flex -space-x-2'>
                {ticket.assignees.slice(0, 3).map((person) => (
                  <Avatar
                    className='ring-background size-5 ring-2'
                    key={person.name}
                    size='sm'
                  >
                    <Avatar.Image alt={person.name} src={person.avatar} />
                    <Avatar.Fallback>{person.name[0]}</Avatar.Fallback>
                  </Avatar>
                ))}
              </div>
            ) : (
              <span />
            )}
            {ticket.comments || ticket.attachments ? (
              <div className='text-muted flex items-center gap-2.5 text-xs'>
                {ticket.comments ? (
                  <span className='flex items-center gap-1'>
                    <HugeiconsIcon
                      aria-hidden
                      className='size-3.5'
                      icon={Comment01Icon}
                    />
                    {ticket.comments}
                  </span>
                ) : null}
                {ticket.attachments ? (
                  <span className='flex items-center gap-1'>
                    <HugeiconsIcon
                      aria-hidden
                      className='size-3.5'
                      icon={Attachment01Icon}
                    />
                    {ticket.attachments}
                  </span>
                ) : null}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </>
  );
}

function TicketColumn({
  column,
  kanban,
}: {
  column: Ticket['status'];
  kanban: UseKanbanReturn<Ticket>;
}) {
  const { open } = useContext(AddTaskContext);
  const { renderDropIndicator } = useKanbanCardPlaceholder({
    renderIndicator: (target) => <Kanban.DropIndicator target={target} />,
  });
  const { dragAndDropHooks, items } = useKanbanColumn(kanban, column, {
    renderDropIndicator,
  });
  const indicator = {
    Closed: { color: 'text-danger', icon: CancelCircleIcon },
    'In Progress': { color: 'text-warning', icon: Clock01Icon },
    Open: { color: 'text-success', icon: CircleCheckIcon },
  }[column];
  return (
    <Kanban.Column>
      <Kanban.ColumnHeader>
        <Kanban.ColumnIndicator className={indicator.color}>
          <HugeiconsIcon aria-hidden icon={indicator.icon} />
        </Kanban.ColumnIndicator>
        <Kanban.ColumnTitle>{column}</Kanban.ColumnTitle>
        <Kanban.ColumnCount>{items.length}</Kanban.ColumnCount>
        <Kanban.ColumnActions>
          <Button
            isIconOnly
            aria-label='Add task'
            size='sm'
            variant='ghost'
            onPress={open}
          >
            <HugeiconsIcon icon={Add01Icon} />
          </Button>
          <ColumnOptions column={column} kanban={kanban} />
        </Kanban.ColumnActions>
      </Kanban.ColumnHeader>
      <Kanban.ColumnBody>
        <Kanban.ScrollShadow className='max-h-[600px]'>
          <Kanban.CardList
            aria-label={column}
            dragAndDropHooks={dragAndDropHooks}
            items={items}
          >
            {(ticket) => (
              <Kanban.Card
                className='[&>[data-slot=kanban-card-content]]:gap-0 [&>[data-slot=kanban-card-content]]:p-0'
                textValue={`${ticket.title} ${ticket.description}`}
              >
                <TicketCard ticket={ticket} />
              </Kanban.Card>
            )}
          </Kanban.CardList>
        </Kanban.ScrollShadow>
        <div className='p-2'>
          <Button fullWidth variant='outline' onPress={open}>
            <HugeiconsIcon icon={Add01Icon} />
            Add a task
          </Button>
        </div>
      </Kanban.ColumnBody>
    </Kanban.Column>
  );
}

function DefaultBoard() {
  const kanban = useKanban({
    getColumn: (ticket) => ticket.status,
    initialItems: tickets,
    setColumn: (ticket, status) => ({
      ...ticket,
      status: status as Ticket['status'],
    }),
  });
  return (
    <Kanban>
      {(['Open', 'In Progress', 'Closed'] as const).map((column) => (
        <AddTaskProvider column={column} kanban={kanban} key={column}>
          <TicketColumn column={column} kanban={kanban} />
        </AddTaskProvider>
      ))}
    </Kanban>
  );
}
export const Default: Story = { render: () => <DefaultBoard /> };

type NotionStatus = 'Done' | 'In Progress' | 'To Document' | 'Todo';
interface NotionTask {
  assignees: { avatar: string; name: string }[];
  categories: string[];
  dueDate?: string;
  epic: string;
  id: string;
  priority: 'High' | 'Low' | 'Medium';
  size: 'L' | 'M' | 'S' | 'XL';
  status: NotionStatus;
  title: string;
}
const notionAssignee = (
  name: 'Alex' | 'Diego' | 'Emily' | 'Jake' | 'Maria' | 'Sam',
) => ({
  avatar: avatar(name),
  name,
});
const notionTasks: NotionTask[] = [
  {
    assignees: [notionAssignee('Diego')],
    categories: ['Mobile', 'Block'],
    epic: 'Pro Native (Alpha)',
    id: 'n1',
    priority: 'High',
    size: 'M',
    status: 'Todo',
    title: 'Calendar Blocks',
  },
  {
    assignees: [notionAssignee('Diego')],
    categories: ['Launch', 'New Component'],
    dueDate: 'Mar 5, 2026',
    epic: 'Pro Native (Alpha)',
    id: 'n2',
    priority: 'High',
    size: 'M',
    status: 'Todo',
    title: 'Pro badge on the Expo Go app',
  },
  {
    assignees: [notionAssignee('Diego')],
    categories: ['Mobile', 'New Component'],
    epic: 'Pro Native (Alpha)',
    id: 'n3',
    priority: 'Medium',
    size: 'M',
    status: 'Todo',
    title: 'FeedCarousel',
  },
  {
    assignees: [notionAssignee('Diego')],
    categories: ['Mobile', 'New Component'],
    epic: 'Pro Native (Alpha)',
    id: 'n4',
    priority: 'Medium',
    size: 'M',
    status: 'Todo',
    title: 'FlipCard',
  },
  {
    assignees: [notionAssignee('Diego')],
    categories: ['Mobile', 'New Component'],
    epic: 'Pro Native (Alpha)',
    id: 'n5',
    priority: 'Medium',
    size: 'M',
    status: 'Todo',
    title: 'NumberPad',
  },
  {
    assignees: [notionAssignee('Diego')],
    categories: ['Mobile', 'New Component'],
    epic: 'Pro Native (Alpha)',
    id: 'n6',
    priority: 'Medium',
    size: 'M',
    status: 'Todo',
    title: 'Phone Number Input',
  },
  {
    assignees: [notionAssignee('Maria')],
    categories: ['Mobile', 'Block'],
    epic: 'Pro Native (Alpha)',
    id: 'n7',
    priority: 'Medium',
    size: 'M',
    status: 'Todo',
    title: 'Bottom Sheet Blocks',
  },
  {
    assignees: [notionAssignee('Diego')],
    categories: ['Mobile', 'New Component'],
    dueDate: 'Mar 29, 2026',
    epic: 'Pro Native (Alpha)',
    id: 'n8',
    priority: 'High',
    size: 'L',
    status: 'In Progress',
    title: 'MorphButton',
  },
  {
    assignees: [notionAssignee('Sam')],
    categories: ['Mobile', 'Block'],
    epic: 'Pro Native (Alpha)',
    id: 'n9',
    priority: 'Low',
    size: 'S',
    status: 'In Progress',
    title: 'Create Password',
  },
  {
    assignees: [notionAssignee('Sam'), notionAssignee('Jake')],
    categories: ['Mobile', 'Block'],
    epic: 'Pro Native (Alpha)',
    id: 'n10',
    priority: 'Low',
    size: 'S',
    status: 'In Progress',
    title: 'OTP Verification',
  },
  {
    assignees: [notionAssignee('Sam')],
    categories: ['Mobile', 'Block'],
    epic: 'Pro Native (Alpha)',
    id: 'n11',
    priority: 'Low',
    size: 'S',
    status: 'In Progress',
    title: 'Login / Sign up',
  },
  {
    assignees: [notionAssignee('Diego')],
    categories: ['Mobile', 'New Component'],
    dueDate: 'Apr 5, 2026',
    epic: 'Pro Native (Alpha)',
    id: 'n12',
    priority: 'High',
    size: 'L',
    status: 'To Document',
    title: 'ProgressButton',
  },
  {
    assignees: [notionAssignee('Diego')],
    categories: ['Mobile', 'New Component'],
    dueDate: 'Apr 5, 2026',
    epic: 'Pro Native (Alpha)',
    id: 'n13',
    priority: 'High',
    size: 'L',
    status: 'To Document',
    title: 'SlideButton',
  },
  {
    assignees: [notionAssignee('Diego')],
    categories: ['Mobile', 'New Component'],
    dueDate: 'Apr 5, 2026',
    epic: 'Pro Native (Alpha)',
    id: 'n14',
    priority: 'High',
    size: 'M',
    status: 'To Document',
    title: 'NumberField',
  },
  {
    assignees: [notionAssignee('Diego')],
    categories: ['Mobile', 'New Component'],
    dueDate: 'Apr 10, 2026',
    epic: 'Pro Native (Alpha)',
    id: 'n15',
    priority: 'High',
    size: 'L',
    status: 'To Document',
    title: 'RadioButtonGroup',
  },
  {
    assignees: [notionAssignee('Diego')],
    categories: ['Launch', 'New Component'],
    dueDate: 'Apr 9, 2026',
    epic: 'Pro Native (Alpha)',
    id: 'n16',
    priority: 'High',
    size: 'XL',
    status: 'To Document',
    title: 'Calendar',
  },
  {
    assignees: [notionAssignee('Diego')],
    categories: ['Mobile', 'Block'],
    dueDate: 'Mar 29, 2026',
    epic: 'Pro Native (Alpha)',
    id: 'n17',
    priority: 'Medium',
    size: 'L',
    status: 'To Document',
    title: 'Multi Step Bottom Sheet',
  },
  {
    assignees: [notionAssignee('Diego')],
    categories: ['Mobile', 'New Component'],
    epic: 'Pro Native (Alpha)',
    id: 'n18',
    priority: 'Medium',
    size: 'M',
    status: 'To Document',
    title: 'Stepper',
  },
  {
    assignees: [notionAssignee('Emily'), notionAssignee('Alex')],
    categories: ['Mobile'],
    dueDate: 'Mar 10, 2026',
    epic: 'Pro Native (Alpha)',
    id: 'n19',
    priority: 'High',
    size: 'S',
    status: 'Done',
    title: 'Pre-release in-app message',
  },
  {
    assignees: [notionAssignee('Sam'), notionAssignee('Diego')],
    categories: ['Mobile', 'Improvement'],
    epic: 'Pro Native (Alpha)',
    id: 'n20',
    priority: 'Medium',
    size: 'S',
    status: 'Done',
    title: 'OSS ↔ PRO Sync',
  },
];
const notionColumnStyles: Record<
  NotionStatus,
  {
    body: string;
    button: string;
    count: string;
    indicator: string;
    pill: string;
  }
> = {
  Done: {
    body: 'bg-success/8',
    button: 'text-success border-success/30 hover:bg-success/10',
    count: 'text-success',
    indicator: 'bg-success',
    pill: 'bg-success/15',
  },
  'In Progress': {
    body: 'bg-warning/8',
    button: 'text-warning border-warning/30 hover:bg-warning/10',
    count: 'text-warning',
    indicator: 'bg-warning',
    pill: 'bg-warning/15',
  },
  'To Document': {
    body: 'bg-danger/8',
    button: 'text-danger border-danger/30 hover:bg-danger/10',
    count: 'text-danger',
    indicator: 'bg-danger',
    pill: 'bg-danger/15',
  },
  Todo: {
    body: 'bg-accent/8',
    button: 'text-accent border-accent/30 hover:bg-accent/10',
    count: 'text-accent',
    indicator: 'bg-accent',
    pill: 'bg-accent/15',
  },
};

function NotionTaskCard({ task }: { task: NotionTask }) {
  const priorityColor =
    task.priority === 'High'
      ? 'danger'
      : task.priority === 'Medium'
        ? 'warning'
        : 'success';
  return (
    <>
      <div className='flex items-start gap-2'>
        <span
          className={`mt-1 size-2.5 shrink-0 rounded-sm ${task.priority === 'High' ? 'bg-danger' : task.priority === 'Medium' ? 'bg-warning' : 'bg-success'}`}
        />
        <span className='text-foreground leading-snug font-semibold'>
          {task.title}
        </span>
      </div>
      <div className='flex flex-wrap items-center gap-1.5'>
        <Chip color={priorityColor} size='sm' variant='soft'>
          {task.priority}
        </Chip>
        <Chip size='sm' variant='secondary'>
          {task.size}
        </Chip>
        {task.assignees.map((person) => (
          <Avatar
            className='ring-background size-5 ring-2'
            key={person.name}
            size='sm'
          >
            <Avatar.Image alt={person.name} src={person.avatar} />
            <Avatar.Fallback>{person.name[0]}</Avatar.Fallback>
          </Avatar>
        ))}
      </div>
      <div className='flex items-center justify-between gap-2'>
        <span className='text-muted flex items-center gap-1 text-xs'>
          <HugeiconsIcon
            aria-hidden
            className='text-warning size-3'
            icon={FlashIcon}
          />
          {task.epic}
        </span>
        {task.dueDate ? (
          <span className='text-muted flex shrink-0 items-center gap-1 text-xs'>
            <HugeiconsIcon
              aria-hidden
              className='size-3'
              icon={Calendar03Icon}
            />
            {task.dueDate}
          </span>
        ) : null}
      </div>
      {task.categories.length ? (
        <div className='flex flex-wrap gap-1'>
          {task.categories.map((category) => (
            <Chip key={category} size='sm' variant='secondary'>
              {category}
            </Chip>
          ))}
        </div>
      ) : null}
    </>
  );
}

function NotionColumn({
  column,
  kanban,
}: {
  column: NotionStatus;
  kanban: UseKanbanReturn<NotionTask>;
}) {
  const { renderDropIndicator } = useKanbanCardPlaceholder({
    renderIndicator: (target) => <Kanban.DropIndicator target={target} />,
  });
  const { dragAndDropHooks, items } = useKanbanColumn(kanban, column, {
    renderDropIndicator,
  });
  const styles = notionColumnStyles[column];
  return (
    <Kanban.Column className='gap-0'>
      <div className='bg-background sticky top-0 z-10 pt-2'>
        <Kanban.ColumnHeader
          className={`rounded-t-[calc(var(--radius-2xl)_+_var(--radius-sm))] px-3 py-2.5 ${styles.body}`}
        >
          <span
            className={`flex items-center gap-2 rounded-[calc(var(--radius)*infinity)] px-3 py-1 ${styles.pill}`}
          >
            <Kanban.ColumnIndicator className={styles.indicator} />
            <Kanban.ColumnTitle>{column}</Kanban.ColumnTitle>
          </span>
          <Kanban.ColumnCount className={styles.count}>
            {items.length}
          </Kanban.ColumnCount>
          <Kanban.ColumnActions>
            <Button
              isIconOnly
              aria-label='Add task'
              className={styles.count}
              size='sm'
              variant='ghost'
            >
              <HugeiconsIcon icon={Add01Icon} />
            </Button>
            <Button
              isIconOnly
              aria-label='More options'
              className={styles.count}
              size='sm'
              variant='ghost'
            >
              <HugeiconsIcon icon={MoreHorizontalIcon} />
            </Button>
          </Kanban.ColumnActions>
        </Kanban.ColumnHeader>
      </div>
      <Kanban.ColumnBody className={`rounded-t-none ${styles.body}`}>
        <Kanban.CardList
          aria-label={column}
          className='pt-0 pb-2'
          dragAndDropHooks={dragAndDropHooks}
          items={items}
          renderEmptyState={() => 'No tasks yet.'}
        >
          {(task) => (
            <Kanban.Card textValue={task.title}>
              <NotionTaskCard task={task} />
            </Kanban.Card>
          )}
        </Kanban.CardList>
        <div className='p-2 pt-0'>
          <Button fullWidth className={styles.button} variant='outline'>
            <HugeiconsIcon icon={Add01Icon} />
            New task
          </Button>
        </div>
      </Kanban.ColumnBody>
    </Kanban.Column>
  );
}

function NotionBoardDemo() {
  const kanban = useKanban({
    getColumn: (task) => task.status,
    initialItems: notionTasks,
    setColumn: (task, status) => ({ ...task, status: status as NotionStatus }),
  });
  return (
    <div className='w-full pr-3'>
      <Kanban
        className='items-start overflow-visible'
        hideScrollBar
        isEnabled={false}
      >
        {(['Todo', 'In Progress', 'To Document', 'Done'] as const).map(
          (column) => (
            <NotionColumn column={column} kanban={kanban} key={column} />
          ),
        )}
      </Kanban>
    </div>
  );
}
export const NotionBoard: Story = { render: () => <NotionBoardDemo /> };

type ProjectStatus = 'Backlog' | 'Done' | 'In Progress' | 'In Review' | 'To Do';
interface ProjectTask {
  assignees: { avatar: string; name: string }[];
  category: string;
  categoryColor: string;
  dueDate?: string;
  id: string;
  status: ProjectStatus;
  subtasksCompleted?: number;
  subtasksTotal?: number;
  title: string;
}
const projectAvatars = {
  Alex: '/assets/avatars/orange.jpg',
  Emily: '/assets/avatars/white.jpg',
  Jake: '/assets/avatars/black.jpg',
  Maria: '/assets/avatars/green.jpg',
  Sam: '/assets/avatars/red.jpg',
  Sarah: '/assets/avatars/orange.jpg',
} as const;
const projectAssignee = (name: keyof typeof projectAvatars) => ({
  avatar: projectAvatars[name],
  name,
});
const projectTasks: ProjectTask[] = [
  {
    assignees: [projectAssignee('Sam')],
    category: 'Research',
    categoryColor: '#8b5cf6',
    id: 'p1',
    status: 'Backlog',
    title: 'Research competitor onboarding patterns',
  },
  {
    assignees: [projectAssignee('Alex')],
    category: 'Engineering',
    categoryColor: '#3b82f6',
    id: 'p2',
    status: 'Backlog',
    title: 'Audit analytics event naming',
  },
  {
    assignees: [projectAssignee('Emily'), projectAssignee('Maria')],
    category: 'UX',
    categoryColor: '#ef4444',
    dueDate: 'Jun 18',
    id: 'p3',
    status: 'To Do',
    title: 'Design empty states for dashboard widgets',
  },
  {
    assignees: [projectAssignee('Jake'), projectAssignee('Sarah')],
    category: 'Engineering',
    categoryColor: '#3b82f6',
    dueDate: 'Jun 20',
    id: 'p4',
    status: 'To Do',
    title: 'Set up CI/CD for staging environment',
  },
  {
    assignees: [projectAssignee('Maria')],
    category: 'UX',
    categoryColor: '#ef4444',
    dueDate: 'Jun 15',
    id: 'p5',
    status: 'In Progress',
    subtasksCompleted: 3,
    subtasksTotal: 7,
    title: 'Redesign onboarding flow',
  },
  {
    assignees: [projectAssignee('Jake')],
    category: 'Engineering',
    categoryColor: '#3b82f6',
    id: 'p6',
    status: 'In Progress',
    subtasksCompleted: 3,
    subtasksTotal: 5,
    title: 'API rate limiting implementation',
  },
  {
    assignees: [projectAssignee('Sam')],
    category: 'Research',
    categoryColor: '#8b5cf6',
    id: 'p7',
    status: 'In Progress',
    title: 'Create user interview script for v2.5',
  },
  {
    assignees: [projectAssignee('Sarah'), projectAssignee('Emily')],
    category: 'UX',
    categoryColor: '#ef4444',
    id: 'p8',
    status: 'In Review',
    title: 'Push notification permission flow',
  },
  {
    assignees: [
      projectAssignee('Jake'),
      projectAssignee('Alex'),
      projectAssignee('Maria'),
    ],
    category: 'Engineering',
    categoryColor: '#3b82f6',
    id: 'p9',
    status: 'In Review',
    title: 'Database migration script for v2.4',
  },
  {
    assignees: [projectAssignee('Sam')],
    category: 'Docs',
    categoryColor: '#06b6d4',
    id: 'p10',
    status: 'In Review',
    title: 'Write release notes for v2.4',
  },
  {
    assignees: [projectAssignee('Maria')],
    category: 'Engineering',
    categoryColor: '#3b82f6',
    id: 'p11',
    status: 'Done',
    title: 'Implement dark mode toggle',
  },
  {
    assignees: [projectAssignee('Emily'), projectAssignee('Sarah')],
    category: 'Engineering',
    categoryColor: '#3b82f6',
    id: 'p12',
    status: 'Done',
    title: 'Fix pagination bug on search results',
  },
  {
    assignees: [projectAssignee('Alex')],
    category: 'UX',
    categoryColor: '#ef4444',
    id: 'p13',
    status: 'Done',
    title: 'Add skeleton loaders to dashboard',
  },
];
const projectIndicator: Record<ProjectStatus, string> = {
  Backlog: 'bg-default',
  Done: 'bg-success',
  'In Progress': 'bg-warning',
  'In Review': 'bg-danger',
  'To Do': 'bg-accent',
};

function ProjectColumn({
  column,
  kanban,
}: {
  column: ProjectStatus;
  kanban: UseKanbanReturn<ProjectTask>;
}) {
  const { dragAndDropHooks, items } = useKanbanColumn(kanban, column);
  return (
    <Kanban.Column>
      <Kanban.ColumnHeader>
        <Kanban.ColumnIndicator className={projectIndicator[column]} />
        <Kanban.ColumnTitle>{column}</Kanban.ColumnTitle>
        <Kanban.ColumnCount>{items.length}</Kanban.ColumnCount>
        <Kanban.ColumnActions>
          <Button isIconOnly aria-label='Add task' size='sm' variant='ghost'>
            <HugeiconsIcon icon={Add01Icon} />
          </Button>
          <Button
            isIconOnly
            aria-label='More options'
            size='sm'
            variant='ghost'
          >
            <HugeiconsIcon icon={MoreHorizontalIcon} />
          </Button>
        </Kanban.ColumnActions>
      </Kanban.ColumnHeader>
      <Kanban.ColumnBody>
        <Kanban.ScrollShadow className='max-h-[480px]'>
          <Kanban.CardList
            aria-label={column}
            dragAndDropHooks={dragAndDropHooks}
            items={items}
            renderEmptyState={() => 'No tasks.'}
          >
            {(task) => (
              <Kanban.Card textValue={task.title}>
                <span
                  className={`text-foreground leading-snug font-semibold ${column === 'Done' ? 'line-through opacity-60' : ''}`}
                >
                  {task.title}
                </span>
                <span className='flex items-center gap-1.5'>
                  <span
                    className='size-1.5 shrink-0 rounded-full'
                    style={{ backgroundColor: task.categoryColor }}
                  />
                  <span className='text-muted text-xs'>{task.category}</span>
                </span>
                {task.subtasksTotal != null ? (
                  <div className='flex items-center gap-2'>
                    <ProgressBar
                      aria-label='Subtasks'
                      className='flex-1'
                      color='accent'
                      size='sm'
                      value={
                        ((task.subtasksCompleted ?? 0) / task.subtasksTotal) *
                        100
                      }
                    >
                      <ProgressBar.Track>
                        <ProgressBar.Fill />
                      </ProgressBar.Track>
                    </ProgressBar>
                    <span className='text-muted text-xs tabular-nums'>
                      {task.subtasksCompleted}/{task.subtasksTotal}
                    </span>
                  </div>
                ) : null}
                <div className='mt-0.5 flex items-center justify-between'>
                  <div className='flex -space-x-2'>
                    {task.assignees.slice(0, 3).map((person) => (
                      <Avatar
                        className='ring-background size-5 ring-2'
                        key={person.name}
                        size='sm'
                      >
                        <Avatar.Image alt={person.name} src={person.avatar} />
                        <Avatar.Fallback>{person.name[0]}</Avatar.Fallback>
                      </Avatar>
                    ))}
                  </div>
                  {task.dueDate ? (
                    <span className='text-muted text-xs'>{task.dueDate}</span>
                  ) : null}
                </div>
              </Kanban.Card>
            )}
          </Kanban.CardList>
        </Kanban.ScrollShadow>
      </Kanban.ColumnBody>
    </Kanban.Column>
  );
}

function ProjectBoardDemo() {
  const kanban = useKanban({
    getColumn: (task) => task.status,
    initialItems: projectTasks,
    setColumn: (task, status) => ({ ...task, status: status as ProjectStatus }),
  });
  return (
    <Kanban>
      {(['Backlog', 'To Do', 'In Progress', 'In Review', 'Done'] as const).map(
        (column) => (
          <ProjectColumn column={column} kanban={kanban} key={column} />
        ),
      )}
    </Kanban>
  );
}
export const ProjectBoard: Story = { render: () => <ProjectBoardDemo /> };

function SizedTicketColumn({
  column,
  kanban,
}: {
  column: 'In Progress' | 'Open';
  kanban: UseKanbanReturn<Ticket>;
}) {
  const { open } = useContext(AddTaskContext);
  const { renderDropIndicator } = useKanbanCardPlaceholder({
    renderIndicator: (target) => <Kanban.DropIndicator target={target} />,
  });
  const { dragAndDropHooks, items } = useKanbanColumn(kanban, column, {
    renderDropIndicator,
  });
  return (
    <Kanban.Column>
      <Kanban.ColumnHeader>
        <Kanban.ColumnIndicator
          className={column === 'Open' ? 'bg-success' : 'bg-warning'}
        />
        <Kanban.ColumnTitle>{column}</Kanban.ColumnTitle>
        <Kanban.ColumnCount>{items.length}</Kanban.ColumnCount>
        <Kanban.ColumnActions>
          <Button
            isIconOnly
            aria-label='Add task'
            size='sm'
            variant='ghost'
            onPress={open}
          >
            <HugeiconsIcon icon={Add01Icon} />
          </Button>
          <ColumnOptions column={column} kanban={kanban} />
        </Kanban.ColumnActions>
      </Kanban.ColumnHeader>
      <Kanban.ColumnBody>
        <Kanban.ScrollShadow className='max-h-[600px]'>
          <Kanban.CardList
            aria-label={column}
            dragAndDropHooks={dragAndDropHooks}
            items={items}
          >
            {(ticket) => (
              <Kanban.Card
                className='[&>[data-slot=kanban-card-content]]:gap-0 [&>[data-slot=kanban-card-content]]:p-0'
                textValue={`${ticket.title} ${ticket.description}`}
              >
                <TicketCard ticket={ticket} />
              </Kanban.Card>
            )}
          </Kanban.CardList>
        </Kanban.ScrollShadow>
        <div className='p-2'>
          <Button fullWidth variant='outline' onPress={open}>
            <HugeiconsIcon icon={Add01Icon} />
            Add a task
          </Button>
        </div>
      </Kanban.ColumnBody>
    </Kanban.Column>
  );
}

function SizedBoard({ size }: { size: KanbanSize }) {
  const kanban = useKanban({
    getColumn: (ticket) => ticket.status,
    initialItems: tickets.slice(0, 5),
    setColumn: (ticket, status) => ({
      ...ticket,
      status: status as Ticket['status'],
    }),
  });
  return (
    <div className='flex flex-col gap-2'>
      <span className='text-muted text-xs font-medium'>{size}</span>
      <Kanban size={size}>
        {(['Open', 'In Progress'] as const).map((column) => (
          <AddTaskProvider column={column} kanban={kanban} key={column}>
            <SizedTicketColumn column={column} kanban={kanban} />
          </AddTaskProvider>
        ))}
      </Kanban>
    </div>
  );
}
export const Sizes: Story = {
  render: () => (
    <div className='flex flex-col gap-10'>
      {(['sm', 'md', 'lg'] as const).map((size) => (
        <SizedBoard key={size} size={size} />
      ))}
    </div>
  ),
};
