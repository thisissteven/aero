import type { Meta, StoryObj } from '@storybook/react';

import { Avatar } from '@aero/ui/avatar';
import { Button } from '@aero/ui/button';
import { Card } from '@aero/ui/card';
import { Chip } from '@aero/ui/chip';
import { CloseButton } from '@aero/ui/close-button';
import {
  AddCircleIcon,
  Attachment01Icon,
  BadgeCheckIcon,
  CheckmarkCircle02Icon,
  Clock01Icon,
  CreditCardIcon,
  EyeIcon,
  Flag02Icon,
  GitCommitHorizontalIcon,
  GitMergeIcon,
  GitPullRequestIcon,
  Mail01Icon,
  Megaphone02Icon,
  Message01Icon,
  ReceiptTextIcon,
  SecurityWarningIcon,
  User02Icon,
  ZapIcon,
} from '@aero/ui/icons';
import { HugeiconsIcon, type IconSvgElement } from '@aero/ui/icons';
import { Input } from '@aero/ui/input';
import { Link } from '@aero/ui/link';

import { Timeline, type TimelineStatus } from './index';

const meta = {
  component: Timeline,
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
  title: 'Components/Data Display/Timeline',
} satisfies Meta<typeof Timeline>;
export default meta;
type Story = StoryObj<any>;

const TimelineGlyph = ({ icon }: { icon: IconSvgElement }) => (
  <HugeiconsIcon aria-hidden icon={icon} strokeWidth={2} />
);
const rollout = [
  {
    description: (
      <>
        Created{' '}
        <span className='text-foreground font-medium'>checkout-redesign</span>{' '}
        for the billing workspace.
      </>
    ),
    icon: Flag02Icon,
    meta: 'Owner assigned',
    metaColor: 'default',
    status: 'default',
    time: '09:12',
    title: 'Feature flag created',
  },
  {
    description: (
      <>
        Enabled for{' '}
        <span className='text-foreground font-medium'>5% of workspaces</span>{' '}
        with session replay sampling on.
      </>
    ),
    icon: CheckmarkCircle02Icon,
    meta: 'Canary',
    metaColor: 'accent',
    status: 'current',
    time: '09:34',
    title: 'Canary rollout started',
  },
  {
    description: (
      <>
        Latency climbed in{' '}
        <span className='text-foreground font-medium'>eu-central-1</span>;
        rollout is holding while routing warms.
      </>
    ),
    icon: SecurityWarningIcon,
    meta: 'Paused',
    metaColor: 'warning',
    status: 'warning',
    time: '09:51',
    title: 'Regional guardrail tripped',
  },
  {
    description: (
      <>
        Support macro and changelog draft are ready in{' '}
        <Link className='text-xs' href='#'>
          Launch notes
        </Link>
        .
      </>
    ),
    icon: Megaphone02Icon,
    meta: 'Docs',
    metaColor: 'default',
    status: 'default',
    time: '10:05',
    title: 'Customer messaging prepared',
  },
  {
    description: 'Full rollout waits for the next error-budget sweep.',
    icon: Clock01Icon,
    meta: 'Queued',
    metaColor: 'default',
    status: 'muted',
    time: '10:30',
    title: 'Launch window scheduled',
  },
  {
    description: (
      <>
        Rollback owner and dashboard checks are recorded in the release audit.
      </>
    ),
    icon: BadgeCheckIcon,
    meta: 'Ready',
    metaColor: 'success',
    status: 'success',
    time: '10:42',
    title: 'Release checklist verified',
  },
] as const;
export const Default: Story = {
  render: () => (
    <div className='w-full max-w-[560px] min-w-0'>
      <div className='mb-4'>
        <p className='text-muted m-0 text-xs font-medium'>Rollout audit</p>
        <h3 className='text-foreground m-0 text-base font-semibold'>
          Checkout redesign
        </h3>
      </div>
      <Timeline density='compact' size='sm'>
        {rollout.map((item) => (
          <Timeline.Item
            align='center'
            key={item.title}
            status={item.status as TimelineStatus}
          >
            <Timeline.Marker aria-hidden='true'>
              <TimelineGlyph icon={item.icon} />
            </Timeline.Marker>
            <Timeline.Content>
              <div className='flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:justify-between sm:gap-4'>
                <div className='min-w-0'>
                  <div className='flex min-w-0 flex-wrap items-center gap-2'>
                    <h3 className='text-foreground m-0 text-xs leading-5 font-medium'>
                      {item.title}
                    </h3>
                    <Chip color={item.metaColor} size='sm' variant='soft'>
                      {item.meta}
                    </Chip>
                  </div>
                  <p className='text-muted m-0 mt-1 text-xs leading-5'>
                    {item.description}
                  </p>
                </div>
                <time className='text-muted shrink-0 text-xs leading-5'>
                  {item.time}
                </time>
              </div>
            </Timeline.Content>
          </Timeline.Item>
        ))}
      </Timeline>
    </div>
  ),
};

const milestones = [
  {
    description:
      'Invited design partners to stress-test billing, permissions, and reporting workflows.',
    icon: Flag02Icon,
    metric: '24 teams',
    tag: 'Research',
    tagColor: 'default',
    time: 'Jan 2026',
    title: 'Private beta',
  },
  {
    description:
      'Metered plans went live for sandbox workspaces after invoice previews cleared review.',
    icon: CheckmarkCircle02Icon,
    metric: '3 plans',
    tag: 'Billing',
    tagColor: 'accent',
    time: 'Mar 2026',
    title: 'Usage-based pricing',
  },
  {
    description: (
      <>
        Opened the EU data boundary with local support coverage and a{' '}
        <Link className='text-xs' href='#'>
          launch brief
        </Link>
        .
      </>
    ),
    icon: SecurityWarningIcon,
    metric: '2 regions',
    tag: 'Expansion',
    tagColor: 'success',
    time: 'May 2026',
    title: 'Regional launch',
  },
  {
    description:
      'First integrations shipped with shared certification notes and co-marketing assets.',
    icon: Megaphone02Icon,
    metric: '8 partners',
    tag: 'Marketplace',
    tagColor: 'warning',
    time: 'Aug 2026',
    title: 'Partner network',
  },
  {
    description:
      'Audit logs, SSO handoff, and incident exports were bundled into the admin rollout.',
    icon: Clock01Icon,
    metric: '5 controls',
    tag: 'Governance',
    tagColor: 'default',
    time: 'Oct 2026',
    title: 'Enterprise controls',
  },
  {
    description:
      'Customer education, lifecycle emails, and release notes moved into one launch calendar.',
    icon: BadgeCheckIcon,
    metric: '12 touchpoints',
    tag: 'Adoption',
    tagColor: 'accent',
    time: 'Dec 2026',
    title: 'Scale motion',
  },
] as const;
const MilestoneContent = ({
  milestone,
  order = 'time-first',
}: {
  milestone: (typeof milestones)[number];
  order?: 'tag-first' | 'time-first';
}) => (
  <>
    <div className='flex flex-wrap items-center gap-2'>
      {order === 'tag-first' ? (
        <>
          <Chip color={milestone.tagColor} size='sm' variant='soft'>
            {milestone.tag}
          </Chip>
          <time className='text-muted text-xs leading-5'>{milestone.time}</time>
        </>
      ) : (
        <>
          <time className='text-muted text-xs leading-5'>{milestone.time}</time>
          <Chip color={milestone.tagColor} size='sm' variant='soft'>
            {milestone.tag}
          </Chip>
        </>
      )}
    </div>
    <h3 className='text-foreground m-0 text-sm leading-5 font-medium'>
      {milestone.title}
    </h3>
    <p className='text-muted m-0 text-xs leading-5'>{milestone.description}</p>
    <span className='text-muted text-xs leading-5'>{milestone.metric}</span>
  </>
);
export const CenteredMilestones: Story = {
  render: () => (
    <div className='w-full max-w-[700px] min-w-0 py-4'>
      <div className='mb-5 flex items-center justify-center gap-3'>
        <div className='bg-separator h-px flex-1' />
        <Chip color='accent' size='sm' variant='soft'>
          2026 expansion
        </Chip>
        <div className='bg-separator h-px flex-1' />
      </div>
      <div className='sm:hidden'>
        <Timeline density='compact' size='sm'>
          {milestones.map((milestone) => (
            <Timeline.Item key={milestone.title}>
              <Timeline.Marker>
                <TimelineGlyph icon={milestone.icon} />
              </Timeline.Marker>
              <Timeline.Content className='gap-1.5'>
                <MilestoneContent milestone={milestone} />
              </Timeline.Content>
            </Timeline.Item>
          ))}
        </Timeline>
      </div>
      <div className='hidden sm:block'>
        <Timeline
          axis='center'
          itemAlign='center'
          placement='alternate'
          size='sm'
        >
          {milestones.map((milestone, index) => (
            <Timeline.Item key={milestone.title}>
              <Timeline.Marker>
                <TimelineGlyph icon={milestone.icon} />
              </Timeline.Marker>
              <Timeline.Content className='max-w-[260px] gap-1.5'>
                <MilestoneContent
                  milestone={milestone}
                  order={index % 2 === 1 ? 'tag-first' : 'time-first'}
                />
              </Timeline.Content>
            </Timeline.Item>
          ))}
        </Timeline>
      </div>
    </div>
  ),
};

const studio = [
  ['Product asset uploaded', 'Mina Sol', '10:18 AM', 'current', 'asset'],
  [
    'Lighting pass reviewed',
    'Orin Vale',
    '10:27 AM',
    'warning',
    'The side profile reads clearly on the landing page. Keep the outsole shadow soft so the sole texture stays visible.',
  ],
  [
    'Copy note resolved',
    'Paz Kim',
    '10:43 AM',
    'default',
    'Updated the launch tile copy and aligned the product badge with the approved campaign language.',
  ],
  [
    'Review package ready',
    'Mina Sol',
    '11:06 AM',
    'success',
    'Exported the square crop, PDP detail view, and marketplace thumbnail for final QA.',
  ],
];
export const StudioReview: Story = {
  render: () => (
    <div className='w-full max-w-[620px] min-w-0'>
      <div className='mb-4'>
        <p className='text-muted m-0 text-xs font-medium'>Studio review</p>
        <h3 className='text-foreground m-0 text-base font-semibold'>
          Runner launch assets
        </h3>
      </div>
      <Timeline density='compact' size='sm'>
        {studio.map((item) => (
          <Timeline.Item
            align='center'
            key={item[0]}
            status={item[3] as TimelineStatus}
          >
            <Timeline.Marker className='size-6 overflow-hidden border-0 p-0 shadow-none'>
              <Avatar className='size-full' size='sm'>
                <Avatar.Image
                  alt=''
                  src='https://api.dicebear.com/10.x/big-smile/svg'
                />
                <Avatar.Fallback>
                  {item[1]
                    .split(' ')
                    .map((word) => word[0])
                    .join('')}
                </Avatar.Fallback>
              </Avatar>
            </Timeline.Marker>
            <Timeline.Content className='gap-2'>
              <div className='flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:justify-between sm:gap-4'>
                <div className='flex min-w-0 flex-wrap items-center gap-2'>
                  <h3 className='text-foreground m-0 text-xs leading-5 font-medium'>
                    {item[0]}
                  </h3>
                  {item[4] === 'asset' ? (
                    <Chip color='accent' size='sm' variant='soft'>
                      Review
                    </Chip>
                  ) : null}
                </div>
                <div className='text-muted flex shrink-0 items-center gap-2 text-xs leading-5'>
                  <span>{item[1]}</span>
                  <time>{item[2]}</time>
                </div>
              </div>
              {item[4] === 'asset' ? (
                <Card
                  className='!border-border w-full overflow-hidden !border !border-solid p-0'
                  variant='transparent'
                >
                  <div className='grid min-w-0 gap-0 sm:grid-cols-[140px_minmax(0,1fr)]'>
                    <img
                      alt='Side profile of the runner product asset'
                      className='aspect-[4/3] w-full object-cover select-none sm:aspect-auto sm:h-full'
                      draggable={false}
                      src='https://api.dicebear.com/10.x/glass/svg'
                    />
                    <div className='flex min-w-0 flex-col gap-3 p-3'>
                      <p className='text-muted m-0 text-xs leading-5'>
                        Final hero crop is ready for retouch review with the
                        side profile, lace detail, and marketplace thumbnail
                        queued.
                      </p>
                      <div className='flex flex-wrap items-center gap-2'>
                        <Chip size='sm' variant='secondary'>
                          PDP hero
                        </Chip>
                        <Chip size='sm' variant='secondary'>
                          4 crops
                        </Chip>
                        <Link className='text-xs' href='#'>
                          Open board
                          <Link.Icon />
                        </Link>
                      </div>
                    </div>
                  </div>
                </Card>
              ) : (
                <p className='text-muted m-0 text-xs leading-5'>{item[4]}</p>
              )}
            </Timeline.Content>
          </Timeline.Item>
        ))}
      </Timeline>
    </div>
  ),
};

const compact = [
  [
    'Chargeback case opened',
    'Mar 6, 10:34 AM',
    'warning',
    'The customer disputed a renewal charge, and the finance team has seven days to submit evidence.',
  ],
  ['Payment captured', 'Mar 6, 10:21 AM', 'success', ''],
  ['Payment authorized', 'Mar 6, 10:21 AM', 'default', ''],
  ['Invoice generated', 'Mar 6, 10:20 AM', 'muted', ''],
];
const compactIcons = [
  SecurityWarningIcon,
  CreditCardIcon,
  CheckmarkCircle02Icon,
  ReceiptTextIcon,
] as const;
export const CompactLog: Story = {
  render: () => (
    <div className='box-border w-full max-w-[520px] min-w-0 px-2 sm:px-0'>
      <Timeline density='compact' size='sm'>
        {compact.map((item, index) => (
          <Timeline.Item
            align={item[3] ? 'start' : 'center'}
            key={item[0]}
            status={item[2] as TimelineStatus}
          >
            <Timeline.Marker>
              <TimelineGlyph
                icon={compactIcons[index] ?? SecurityWarningIcon}
              />
            </Timeline.Marker>
            <Timeline.Content className='gap-1'>
              <div className='flex min-w-0 flex-col gap-1 sm:flex-row sm:justify-between'>
                <h3 className='text-foreground m-0 text-xs font-medium'>
                  {item[0]}
                </h3>
                <time className='text-muted shrink-0 text-xs'>{item[1]}</time>
              </div>
              {item[3] ? (
                <p className='text-muted m-0 text-xs leading-snug'>{item[3]}</p>
              ) : null}
            </Timeline.Content>
          </Timeline.Item>
        ))}
      </Timeline>
    </div>
  ),
};

const incidentAvatars = {
  blue: 'https://api.dicebear.com/10.x/adventurer-neutral/svg',
  green: 'https://api.dicebear.com/10.x/adventurer-neutral/svg',
  orange: 'https://api.dicebear.com/10.x/adventurer-neutral/svg',
};
const incident = [
  {
    actor: 'Kaito Reed',
    avatar: incidentAvatars.orange,
    icon: ZapIcon,
    prefix: 'Escalation acknowledged by',
    status: 'warning',
    time: '2:24 AM',
  },
  {
    actor: 'Mira Stone',
    avatar: incidentAvatars.green,
    icon: User02Icon,
    prefix: 'Incident channel joined by',
    status: 'default',
    time: '2:23 AM',
  },
  {
    icon: Mail01Icon,
    recipient: 'finance-ops',
    status: 'default',
    text: 'Customer update sent to',
    time: '2:21 AM',
  },
  {
    icon: CheckmarkCircle02Icon,
    status: 'success',
    target: 'export-worker-3',
    text: 'Mitigation deployed to',
    time: '2:18 AM',
  },
  {
    icon: Clock01Icon,
    status: 'muted',
    text: 'Postmortem reminder',
    time: '2:14 AM',
    trailingText: 'scheduled',
  },
] as const;
export const IncidentResponse: Story = {
  render: () => (
    <div className='mx-auto w-[calc(100%-2rem)] max-w-[720px] min-w-0 sm:w-full'>
      <div className='mb-5'>
        <p className='text-muted m-0 text-xs font-medium'>Incident response</p>
        <h3 className='text-foreground m-0 text-base font-semibold'>
          Export queue degradation
        </h3>
      </div>
      <Timeline density='compact' size='sm'>
        <Timeline.Item align='center'>
          <Timeline.Rail className='items-center'>
            <Timeline.Marker
              aria-hidden='true'
              className='size-7 overflow-hidden border-0 p-0 shadow-none'
            >
              <Avatar className='size-full' size='lg'>
                <Avatar.Image alt='Nora Vazquez' src={incidentAvatars.blue} />
                <Avatar.Fallback>NV</Avatar.Fallback>
              </Avatar>
            </Timeline.Marker>
            <Timeline.Connector className='top-[calc(50%+var(--spacing)*3.5)]' />
          </Timeline.Rail>
          <Timeline.Content>
            <div className='flex items-center gap-2 sm:gap-3'>
              <Input
                aria-label='Add incident update'
                className='min-w-0 flex-1'
                defaultValue='Queue depth is falling after the worker pool restart.'
                variant='secondary'
              />
              <Button className='shrink-0' size='sm' type='button'>
                Post
              </Button>
            </div>
          </Timeline.Content>
        </Timeline.Item>
        <Timeline.Item status='current'>
          <Timeline.Marker aria-hidden='true'>
            <TimelineGlyph icon={Message01Icon} />
          </Timeline.Marker>
          <Timeline.Content className='gap-2.5'>
            <div className='flex min-w-0 flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-3'>
              <div className='flex min-w-0 flex-wrap items-center gap-2'>
                <span className='text-muted text-xs leading-5'>
                  Update from
                </span>
                <Avatar className='size-4' size='sm'>
                  <Avatar.Image alt='Nora Vazquez' src={incidentAvatars.blue} />
                  <Avatar.Fallback>NV</Avatar.Fallback>
                </Avatar>
                <h3 className='text-foreground m-0 text-xs leading-5 font-medium'>
                  Nora Vazquez
                </h3>
                <Chip size='sm' variant='soft'>
                  On-call
                </Chip>
              </div>
              <time className='text-muted shrink-0 text-xs leading-5'>
                2:28 AM
              </time>
            </div>
            <Card
              className='!border-border w-full !border !border-solid p-3'
              variant='transparent'
            >
              <p className='text-foreground m-0 text-sm leading-relaxed'>
                Confirmed the delay is isolated to scheduled exports. API
                requests and dashboard reads are healthy while the backlog
                drains.
              </p>
              <div className='mt-3 flex flex-wrap items-center gap-2'>
                <Chip size='sm' variant='secondary'>
                  <HugeiconsIcon
                    aria-hidden
                    icon={Attachment01Icon}
                    width={12}
                  />
                  <Chip.Label>worker-trace.har - 42 KB</Chip.Label>
                </Chip>
                <Link className='text-xs' href='#'>
                  Open runbook
                  <Link.Icon />
                </Link>
              </div>
            </Card>
          </Timeline.Content>
        </Timeline.Item>
        {incident.map((item) => (
          <Timeline.Item
            align='center'
            key={`${'prefix' in item ? item.prefix : item.text}-${item.time}`}
            status={item.status}
          >
            <Timeline.Marker aria-hidden='true'>
              <TimelineGlyph icon={item.icon} />
            </Timeline.Marker>
            <Timeline.Content>
              <div className='flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:justify-between sm:gap-4'>
                <p className='text-muted m-0 min-w-0 text-xs leading-5'>
                  {'actor' in item ? (
                    <>
                      {item.prefix}{' '}
                      <span className='inline-flex align-middle whitespace-nowrap'>
                        <span className='inline-flex items-center gap-1.5'>
                          <Avatar className='size-4' size='sm'>
                            <Avatar.Image alt={item.actor} src={item.avatar} />
                            <Avatar.Fallback>
                              {item.actor
                                .split(' ')
                                .map((part) => part[0])
                                .join('')}
                            </Avatar.Fallback>
                          </Avatar>
                          <span className='text-foreground font-medium'>
                            {item.actor}
                          </span>
                        </span>
                      </span>
                    </>
                  ) : 'recipient' in item ? (
                    <>
                      {item.text}{' '}
                      <Link className='truncate text-xs' href='#'>
                        {item.recipient}
                      </Link>
                    </>
                  ) : 'trailingText' in item ? (
                    <>
                      <span className='text-foreground font-medium'>
                        {item.text}
                      </span>{' '}
                      {item.trailingText}
                    </>
                  ) : 'target' in item ? (
                    <>
                      {item.text}{' '}
                      <span className='text-foreground font-medium'>
                        {item.target}
                      </span>
                    </>
                  ) : null}
                </p>
                <time className='text-muted shrink-0 text-xs leading-5'>
                  {item.time}
                </time>
              </div>
            </Timeline.Content>
          </Timeline.Item>
        ))}
      </Timeline>
    </div>
  ),
};

const revisions = [
  [
    'v8',
    'Prepared billing copy, tax preview states, and the final approval checklist.',
    'Maya Chen',
    'Current',
    'current',
  ],
  [
    'v7',
    'Published the pricing table refresh after support macros cleared review.',
    'Nora Vazquez',
    'May 22, 2026, 11:18 AM',
    'success',
  ],
  [
    'v6',
    'Added regional tax notes and restored the upgrade confirmation banner.',
    'Eli Wong',
    'May 21, 2026, 04:42 PM',
    'default',
  ],
  [
    'v5',
    'Reworked mobile spacing for plan cards and invoice preview rows.',
    'Maya Chen',
    'May 20, 2026, 09:06 AM',
    'muted',
  ],
  [
    'v4',
    'Imported partner terms and archived the legacy enterprise copy block.',
    'Nora Vazquez',
    'May 18, 2026, 02:31 PM',
    'muted',
  ],
  [
    'v3',
    'Captured the first internal draft from the launch planning workspace.',
    'Eli Wong',
    'May 16, 2026, 10:14 AM',
    'muted',
  ],
];
const revisionAvatars: Record<string, string> = {
  'Eli Wong': 'https://api.dicebear.com/10.x/adventurer-neutral/svg',
  'Maya Chen': 'https://api.dicebear.com/10.x/adventurer-neutral/svg',
  'Nora Vazquez': 'https://api.dicebear.com/10.x/adventurer-neutral/svg',
};
export const VersionHistory: Story = {
  render: () => (
    <Card className='w-full max-w-[420px] gap-0 overflow-hidden p-0'>
      <Card.Header className='border-border flex-row items-center justify-between border-b px-5 py-4'>
        <h3 className='text-foreground m-0 text-base font-semibold'>
          Version history
        </h3>
        <CloseButton aria-label='Close revision history' />
      </Card.Header>
      <Card.Content className='px-5 py-4'>
        <Timeline density='compact' size='sm'>
          {revisions.map((item) => (
            <Timeline.Item key={item[0]} status={item[4] as TimelineStatus}>
              <Timeline.Marker />
              <Timeline.Content className='gap-1.5'>
                <div className='flex min-h-5 min-w-0 items-center gap-2'>
                  <h4 className='text-foreground m-0 text-xs font-medium'>
                    {item[0]}
                  </h4>
                  {item[0] === 'v8' ? (
                    <Chip color='accent' size='sm' variant='soft'>
                      Draft
                    </Chip>
                  ) : item[0] === 'v7' ? (
                    <Chip color='success' size='sm' variant='soft'>
                      Live
                    </Chip>
                  ) : null}
                </div>
                <p className='text-muted m-0 text-xs leading-5'>{item[1]}</p>
                <div className='flex items-center gap-2'>
                  <Avatar className='size-4' size='sm'>
                    <Avatar.Image
                      alt={item[2]}
                      src={revisionAvatars[item[2]]}
                    />
                    <Avatar.Fallback>{item[2][0]}</Avatar.Fallback>
                  </Avatar>
                  <span className='text-muted text-xs leading-5'>
                    {item[2]}
                  </span>
                  <span className='text-muted text-xs leading-5'>-</span>
                  <time className='text-muted text-xs leading-5'>
                    {item[3]}
                  </time>
                </div>
              </Timeline.Content>
            </Timeline.Item>
          ))}
        </Timeline>
      </Card.Content>
    </Card>
  ),
};

const activity = [
  {
    actor: 'Rina Sol',
    icon: GitCommitHorizontalIcon,
    repositories: [
      { commits: '126 commits', name: 'lumenforge/interface' },
      { commits: '32 commits', name: 'mistral-bench/checkout' },
      { commits: '18 commits', name: 'pixelwell/cli' },
      { commits: '7 commits', name: 'signalnest/webhooks' },
    ],
    status: 'success',
    title: 'Committed across 4 product workspaces',
  },
  {
    actor: 'Theo Park',
    date: 'May 19',
    icon: GitMergeIcon,
    pullRequest: {
      comments: '8 comments',
      description:
        'Reworked focus rings, empty states, and column resize handles for audit tables.',
      title: 'Tighten keyboard states in reporting grids',
    },
    status: 'current',
    title: 'Merged a pull request in lumenforge/interface',
  },
  {
    actor: 'Iris Moon',
    icon: AddCircleIcon,
    repositories: [
      { commits: '16 triaged', name: 'lumenforge/interface' },
      { commits: '9 resolved', name: 'pixelwell/cli' },
      { commits: '6 open', name: 'signalnest/webhooks' },
    ],
    status: 'warning',
    title: 'Opened 31 issues across 3 workspaces',
  },
  {
    actor: 'Mara Voss',
    date: 'May 28',
    icon: EyeIcon,
    repositories: [
      { commits: '24 reviews', name: 'lumenforge/interface' },
      { commits: '13 reviews', name: 'mistral-bench/checkout' },
      { commits: '9 reviews', name: 'pixelwell/cli' },
      { commits: '5 reviews', name: 'signalnest/webhooks' },
    ],
    status: 'default',
    title: 'Reviewed 51 pull requests in 4 workspaces',
  },
] as const;
export const RepositoryActivity: Story = {
  render: () => (
    <div className='w-full max-w-[620px] min-w-0'>
      <div className='mb-4 flex items-center gap-4'>
        <h3 className='text-foreground m-0 text-sm font-semibold'>May 2026</h3>
        <div className='bg-separator h-px flex-1' />
      </div>
      <Timeline size='sm'>
        {activity.map((item) => (
          <Timeline.Item key={item.title} status={item.status}>
            <Timeline.Marker>
              <TimelineGlyph icon={item.icon} />
            </Timeline.Marker>
            <Timeline.Content className='gap-2.5'>
              <div className='flex min-w-0 flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-4'>
                <div className='min-w-0'>
                  <h3 className='text-foreground m-0 text-sm leading-5 font-medium'>
                    {item.title}
                  </h3>
                  <p className='text-muted m-0 text-xs leading-5'>
                    {item.actor}
                  </p>
                </div>
                {'date' in item ? (
                  <time className='text-muted shrink-0 text-xs leading-5'>
                    {item.date}
                  </time>
                ) : null}
              </div>
              {'repositories' in item ? (
                <div className='grid gap-1'>
                  {item.repositories.map((repo) => (
                    <div
                      className='grid min-w-0 grid-cols-1 gap-0.5 sm:grid-cols-[minmax(0,200px)_auto] sm:items-center sm:gap-3'
                      key={repo.name}
                    >
                      <Link className='truncate text-xs' href='#'>
                        {repo.name}
                      </Link>
                      <span className='text-muted text-xs'>{repo.commits}</span>
                    </div>
                  ))}
                </div>
              ) : null}
              {'pullRequest' in item ? (
                <Card className='w-full min-w-0 p-3'>
                  <Card.Header className='gap-2.5 p-0'>
                    <HugeiconsIcon
                      aria-hidden
                      className='text-accent size-4 shrink-0'
                      icon={GitPullRequestIcon}
                    />
                    <div className='min-w-0'>
                      <Card.Title className='text-sm leading-5'>
                        {item.pullRequest.title}
                      </Card.Title>
                      <Card.Description className='mt-1 text-xs leading-5'>
                        {item.pullRequest.description}
                      </Card.Description>
                    </div>
                  </Card.Header>
                  <Card.Footer className='mt-3 flex flex-wrap items-center gap-2 p-0'>
                    <Chip color='success' size='sm' variant='soft'>
                      +18
                    </Chip>
                    <Chip color='danger' size='sm' variant='soft'>
                      -4
                    </Chip>
                    <div aria-hidden className='flex items-center gap-0.5'>
                      <span className='bg-success size-2' />
                      <span className='bg-success size-2' />
                      <span className='bg-success size-2' />
                      <span className='bg-danger size-2' />
                      <span className='bg-separator size-2' />
                    </div>
                    <span className='text-muted text-xs'>
                      - {item.pullRequest.comments}
                    </span>
                  </Card.Footer>
                </Card>
              ) : null}
              {item.title.startsWith('Opened') ? (
                <div className='flex flex-wrap gap-2'>
                  <Chip color='success' size='sm' variant='soft'>
                    16 triaged
                  </Chip>
                  <Chip color='accent' size='sm' variant='soft'>
                    9 assigned
                  </Chip>
                  <Chip color='danger' size='sm' variant='soft'>
                    6 open
                  </Chip>
                </div>
              ) : null}
            </Timeline.Content>
          </Timeline.Item>
        ))}
      </Timeline>
    </div>
  ),
};

const split = [
  {
    description: (
      <>
        Invoice copy, empty states, and seat-change messages passed the{' '}
        <Link className='text-xs' href='#'>
          annotation review
        </Link>
        .
      </>
    ),
    icon: Flag02Icon,
    lane: 'Design',
    laneColor: 'default',
    metrics: [
      { label: 'Screens', value: '18' },
      { label: 'Open notes', value: '2' },
    ],
    owner: 'Nina Park',
    status: 'default',
    time: '09:15',
    title: 'Checkout language approved',
  },
  {
    description:
      'Fraud review added a manual hold rule for high-value upgrades during the first rollout window.',
    icon: SecurityWarningIcon,
    lane: 'Risk',
    laneColor: 'warning',
    metrics: [
      { label: 'Threshold', value: '$750' },
      { label: 'Review SLA', value: '4 h' },
    ],
    owner: 'Omar Lee',
    status: 'warning',
    time: '10:40',
    title: 'Upgrade holds confirmed',
  },
  {
    description:
      'Billing telemetry is flowing into the release dashboard with workspace and plan dimensions.',
    icon: CheckmarkCircle02Icon,
    lane: 'Data',
    laneColor: 'accent',
    metrics: [
      { label: 'Events', value: '12' },
      { label: 'Lag', value: '42 s' },
    ],
    owner: 'Maya Hart',
    status: 'default',
    time: '12:05',
    title: 'Metrics dashboard connected',
  },
  {
    description:
      'Support macros, changelog copy, and escalation routing are scheduled for the release window.',
    icon: Megaphone02Icon,
    lane: 'Ops',
    laneColor: 'default',
    metrics: [
      { label: 'Macros', value: '6' },
      { label: 'Regions', value: '3' },
    ],
    owner: 'Priya Shah',
    status: 'default',
    time: '13:30',
    title: 'Customer messaging staged',
  },
  {
    description:
      'The rollback owner, dashboard links, and launch channel are pinned for the final go-live check.',
    icon: BadgeCheckIcon,
    lane: 'Launch',
    laneColor: 'success',
    metrics: [
      { label: 'Checks', value: '9/9' },
      { label: 'Window', value: '15 min' },
    ],
    owner: 'Eli Wong',
    status: 'success',
    time: '15:00',
    title: 'Release checklist signed',
  },
] as const;
export const SplitContent: Story = {
  render: () => (
    <div className='w-full max-w-[680px] min-w-0 py-4'>
      <div className='mx-auto mb-5 max-w-[360px] text-center'>
        <p className='text-muted m-0 text-xs font-medium'>Launch review</p>
        <h3 className='text-foreground m-0 text-base font-semibold'>
          Billing rollout
        </h3>
      </div>
      <Timeline axis='center' placement='end' size='sm'>
        {split.map((item) => (
          <Timeline.Item key={item.title} status={item.status}>
            <Timeline.Content className='max-w-[180px] gap-1.5' side='start'>
              <div className='flex flex-wrap items-center justify-end gap-2'>
                <time className='text-foreground text-xs leading-5 font-medium'>
                  {item.time}
                </time>
                <Chip color={item.laneColor} size='sm' variant='soft'>
                  {item.lane}
                </Chip>
              </div>
              <span className='text-muted text-xs leading-5'>{item.owner}</span>
            </Timeline.Content>
            <Timeline.Marker>
              <TimelineGlyph icon={item.icon} />
            </Timeline.Marker>
            <Timeline.Content className='max-w-[320px] gap-2' side='end'>
              <h3 className='text-foreground m-0 text-sm leading-5 font-medium'>
                {item.title}
              </h3>
              <Card
                className='!border-border w-full !border !border-solid p-3'
                variant='transparent'
              >
                <p className='text-muted m-0 text-xs leading-5'>
                  {item.description}
                </p>
                <div className='mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2'>
                  {item.metrics.map((metric) => (
                    <div className='min-w-0' key={metric.label}>
                      <span className='text-muted block text-[11px] leading-4'>
                        {metric.label}
                      </span>
                      <span className='text-foreground block truncate text-xs leading-5 font-medium'>
                        {metric.value}
                      </span>
                    </div>
                  ))}
                </div>
              </Card>
            </Timeline.Content>
          </Timeline.Item>
        ))}
      </Timeline>
    </div>
  ),
};
