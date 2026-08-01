import type { Meta, StoryObj } from '@storybook/react';
import { useRef, useState } from 'react';

import {
  Avatar,
  Button,
  Dropdown,
  InlineSelect,
  Kbd,
  ListBox,
  SearchField,
  Segment,
} from '@aero/ui';
import {
  ArrowDown01Icon,
  ComputerIcon,
  DashboardSquare01Icon,
  Icon,
  Moon02Icon,
  Notification02Icon,
  PlusSignIcon,
  Search01Icon,
  Settings01Icon,
  Sun01Icon,
  UserGroupIcon,
} from '@aero/ui/icons';

import { Navbar } from './index';

const meta = {
  parameters: { layout: 'padded' },
  tags: ['autodocs'],
  title: 'Components/Navigation/Navbar',
} satisfies Meta;
export default meta;
type Story = StoryObj<any>;
const links = ['Features', 'Customers', 'Integrations', 'Pricing'];
const Logo = ({ compact = false }: { compact?: boolean }) => (
  <div className='flex items-center gap-2 font-semibold'>
    <span className='bg-accent text-accent-foreground flex size-7 items-center justify-center rounded-lg'>
      N
    </span>
    {compact ? null : <span>Aero</span>}
  </div>
);

const User = () => {
  const src = getRandomUserImage();
  return (
    <Avatar className='size-7'>
      <Avatar.Image alt='User avatar' src={src} />
    </Avatar>
  );
};

function BaseHeader({ mobile = false }: { mobile?: boolean }) {
  return (
    <Navbar.Header>
      <Navbar.Brand>
        <Logo />
      </Navbar.Brand>
      <Navbar.Spacer />
      <Navbar.Content className={mobile ? 'hidden md:flex' : undefined}>
        {links.map((label) => (
          <Navbar.Item
            href={`#${label.toLowerCase()}`}
            isCurrent={label === 'Customers'}
            key={label}
          >
            {label}
          </Navbar.Item>
        ))}
      </Navbar.Content>
      <Navbar.Spacer />
      <Navbar.Content>
        <Navbar.Item aria-label='Search'>
          <Icon data-slot='icon' icon={Search01Icon} />
        </Navbar.Item>
        <Navbar.Item aria-label='Notifications'>
          <Icon data-slot='icon' icon={Notification02Icon} />
        </Navbar.Item>
        <Navbar.Separator />
        <Navbar.Item aria-label='Profile'>
          <User />
        </Navbar.Item>
      </Navbar.Content>
      {mobile ? <Navbar.MenuToggle className='md:hidden' /> : null}
    </Navbar.Header>
  );
}
export const Default: Story = {
  render: () => (
    <div className='border-border w-full overflow-hidden rounded-xl border'>
      <Navbar position='static'>
        <BaseHeader />
      </Navbar>
    </div>
  ),
};
function HideDemo() {
  const ref = useRef<HTMLDivElement>(null);
  return (
    <div
      ref={ref}
      className='border-border relative h-[400px] w-full overflow-y-auto rounded-xl border'
    >
      <Navbar className='border-border border-b' hideOnScroll parentRef={ref}>
        <BaseHeader />
      </Navbar>
      <div className='space-y-6 p-6'>
        {Array.from({ length: 20 }, (_, i) => (
          <div className='bg-surface text-muted rounded-lg p-4 text-sm' key={i}>
            Scroll down to hide the navbar, scroll up to reveal it. This is
            paragraph {i + 1}.
          </div>
        ))}
      </div>
    </div>
  );
}
export const HideOnScroll: Story = { render: () => <HideDemo /> };
function WithMenuDemo() {
  const [current, setCurrent] = useState('Dashboard');
  const items = [
    ['Dashboard', DashboardSquare01Icon],
    ['Team', UserGroupIcon],
    ['Settings', Settings01Icon],
  ] as const;
  return (
    <div className='bg-background w-full overflow-visible'>
      <Navbar defaultMenuOpen position='static' shouldBlockScroll={false}>
        <Navbar.Header>
          <Navbar.Brand>
            <Logo />
          </Navbar.Brand>
          <Navbar.Content className='hidden sm:flex'>
            {items.map(([label]) => (
              <Navbar.Item
                href={`#${label}`}
                isCurrent={current === label}
                key={label}
                onClick={(e) => {
                  e.preventDefault();
                  setCurrent(label);
                }}
              >
                {label}
              </Navbar.Item>
            ))}
          </Navbar.Content>
          <Navbar.Spacer />
          <Navbar.Content>
            <Navbar.Item>
              <Icon data-slot='icon' icon={Search01Icon} />
            </Navbar.Item>
            <Navbar.Item>
              <User />
            </Navbar.Item>
          </Navbar.Content>
          <Navbar.MenuToggle />
        </Navbar.Header>
        <Navbar.Menu>
          {items.map(([label, icon]) => (
            <Navbar.MenuItem
              href={`#${label}`}
              isCurrent={current === label}
              key={label}
              onClick={(e) => {
                e.preventDefault();
                setCurrent(label);
              }}
            >
              <Icon data-slot='icon' icon={icon} />
              {label}
            </Navbar.MenuItem>
          ))}
        </Navbar.Menu>
      </Navbar>
      <main className='min-h-[680px] p-6'>
        <section className='border-border bg-surface rounded-lg border p-4'>
          <h2 className='text-xl font-semibold'>Team workspace</h2>
          <p className='text-muted mt-2 text-sm'>
            Responsive mobile navigation overlay.
          </p>
        </section>
      </main>
    </div>
  );
}
export const WithMenu: Story = { render: () => <WithMenuDemo /> };
export const DocsSite: Story = {
  render: () => (
    <Navbar position='static'>
      <Navbar.Header>
        <Navbar.MenuToggle className='md:hidden' />
        <Navbar.Brand>
          <span className='font-semibold'>Aero</span>
        </Navbar.Brand>
        <Navbar.Content className='hidden md:flex'>
          {['Docs', 'Pro', 'Blog'].map((label) => (
            <Navbar.Item href={`#${label.toLowerCase()}`} key={label}>
              {label}
            </Navbar.Item>
          ))}
        </Navbar.Content>
        <Navbar.Spacer />
        <Navbar.Content className='hidden md:flex'>
          <SearchField className='w-[200px]' variant='secondary'>
            <SearchField.Group className='h-8'>
              <SearchField.SearchIcon />
              <SearchField.Input
                aria-label='Search documentation'
                className='w-16'
                placeholder='Search docs…'
              />
              <Kbd className='pointer-events-none mr-1.5 text-xs'>
                <Kbd.Abbr keyValue='command' />
                <Kbd.Content>K</Kbd.Content>
              </Kbd>
            </SearchField.Group>
          </SearchField>
          <Segment defaultSelectedKey='system' size='sm'>
            <Segment.Item aria-label='Light' id='light'>
              <Icon icon={Sun01Icon} />
            </Segment.Item>
            <Segment.Item aria-label='Dark' id='dark'>
              <Icon icon={Moon02Icon} />
            </Segment.Item>
            <Segment.Item aria-label='System' id='system'>
              <Icon icon={ComputerIcon} />
            </Segment.Item>
          </Segment>
        </Navbar.Content>
      </Navbar.Header>
    </Navbar>
  ),
};
function UserMenu() {
  return (
    <Dropdown>
      <Dropdown.Trigger>
        <Button isIconOnly variant='ghost'>
          <User />
        </Button>
      </Dropdown.Trigger>
      <Dropdown.Popover>
        <Dropdown.Menu>
          <Dropdown.Item id='profile'>Profile</Dropdown.Item>
          <Dropdown.Item id='settings'>Settings</Dropdown.Item>
          <Dropdown.Item id='logout' variant='danger'>
            Log out
          </Dropdown.Item>
        </Dropdown.Menu>
      </Dropdown.Popover>
    </Dropdown>
  );
}
export const WithDropdowns: Story = {
  render: () => (
    <div className='border-border w-full overflow-hidden rounded-xl border'>
      <Navbar position='static'>
        <Navbar.Header>
          <Navbar.Brand>
            <Logo />
          </Navbar.Brand>
          <Navbar.Content>
            <Dropdown>
              <Dropdown.Trigger>
                <Button variant='ghost'>
                  Acme Inc. <Icon icon={ArrowDown01Icon} />
                </Button>
              </Dropdown.Trigger>
              <Dropdown.Popover>
                <Dropdown.Menu>
                  {['Acme Inc.', 'Aero', 'Aero'].map((x) => (
                    <Dropdown.Item id={x} key={x}>
                      {x}
                    </Dropdown.Item>
                  ))}
                </Dropdown.Menu>
              </Dropdown.Popover>
            </Dropdown>
          </Navbar.Content>
          <Navbar.Spacer />
          <Navbar.Content className='hidden md:flex'>
            {['Overview', 'Projects', 'Team', 'Settings'].map((x) => (
              <Navbar.Item key={x}>{x}</Navbar.Item>
            ))}
          </Navbar.Content>
          <Navbar.Spacer />
          <UserMenu />
          <Navbar.MenuToggle className='md:hidden' />
        </Navbar.Header>
      </Navbar>
    </div>
  ),
};

const dashboardWorkspaces = ['samlee', 'acme-corp', 'moonshot'];
const dashboardProjects = [
  'content-hub',
  'marketing-site',
  'api-gateway',
  'design-tokens',
];
const dashboardTimezones = [
  ['utc', 'UTC', 'UTC+00:00'],
  ['pst', 'PST', 'UTC−08:00'],
  ['est', 'EST', 'UTC−05:00'],
  ['cet', 'CET', 'UTC+01:00'],
  ['jst', 'JST', 'UTC+09:00'],
] as const;

function DashboardNavbar() {
  const [workspace, setWorkspace] = useState('samlee');
  const [project, setProject] = useState('content-hub');
  const [timezone, setTimezone] = useState('utc');
  const timezoneLabel =
    dashboardTimezones.find(([id]) => id === timezone)?.[1] ?? 'UTC';
  const src = getRandomUserImage();

  return (
    <Navbar position='static'>
      <Navbar.Header className='gap-2'>
        <Navbar.Brand className='mr-1'>
          <span className='font-semibold'>Aero</span>
        </Navbar.Brand>
        <InlineSelect
          aria-label='Workspace'
          value={workspace}
          onChange={setWorkspace}
        >
          <InlineSelect.Trigger className='gap-2'>
            <Avatar className='size-5'>
              <Avatar.Image alt={workspace} src={src} />
            </Avatar>
            <span className='text-foreground text-sm font-medium'>
              {workspace}
            </span>
            <InlineSelect.Indicator />
          </InlineSelect.Trigger>
          <InlineSelect.Popover className='w-44'>
            <ListBox>
              {dashboardWorkspaces.map((item) => (
                <ListBox.Item id={item} key={item} textValue={item}>
                  {item}
                  <ListBox.ItemIndicator />
                </ListBox.Item>
              ))}
            </ListBox>
          </InlineSelect.Popover>
        </InlineSelect>
        <InlineSelect
          aria-label='Project'
          value={project}
          onChange={setProject}
        >
          <InlineSelect.Trigger>
            <span className='text-foreground text-sm font-medium'>
              {project}
            </span>
            <InlineSelect.Indicator />
          </InlineSelect.Trigger>
          <InlineSelect.Popover className='w-44'>
            <ListBox>
              {dashboardProjects.map((item) => (
                <ListBox.Item id={item} key={item} textValue={item}>
                  {item}
                  <ListBox.ItemIndicator />
                </ListBox.Item>
              ))}
            </ListBox>
          </InlineSelect.Popover>
        </InlineSelect>
        <Navbar.Spacer />
        <div
          aria-label='Estimated monthly costs'
          className='hidden items-center gap-1.5 md:flex'
        >
          <span className='text-muted text-[11px] font-medium tracking-wider uppercase'>
            Est. costs
          </span>
          <span className='text-foreground text-sm font-semibold tabular-nums'>
            $71.96
          </span>
        </div>
        <Navbar.Separator className='hidden h-4 md:block' />
        <InlineSelect
          aria-label='Timezone'
          value={timezone}
          onChange={setTimezone}
        >
          <InlineSelect.Trigger>
            <span className='text-foreground text-sm font-medium'>
              {timezoneLabel}
            </span>
            <InlineSelect.Indicator />
          </InlineSelect.Trigger>
          <InlineSelect.Popover className='w-44'>
            <ListBox>
              {dashboardTimezones.map(([id, label, offset]) => (
                <ListBox.Item id={id} key={id} textValue={`${label} ${offset}`}>
                  <span>{label}</span>
                  <span className='text-muted ml-auto text-xs'>{offset}</span>
                  <ListBox.ItemIndicator />
                </ListBox.Item>
              ))}
            </ListBox>
          </InlineSelect.Popover>
        </InlineSelect>
        <Navbar.Content>
          <Navbar.Item aria-label='Notifications'>
            <Icon data-slot='icon' icon={Notification02Icon} />
          </Navbar.Item>
          <Button aria-label='Account menu' isIconOnly variant='ghost'>
            <Avatar className='size-7' color='success' variant='soft'>
              <Avatar.Fallback className='text-xs font-semibold'>
                SM
              </Avatar.Fallback>
            </Avatar>
          </Button>
        </Navbar.Content>
      </Navbar.Header>
    </Navbar>
  );
}

export const Dashboard: Story = {
  render: () => <DashboardNavbar />,
};
export const Compact: Story = {
  render: () => (
    <div className='border-border w-full overflow-hidden rounded-xl border'>
      <Navbar
        height='2.75rem'
        position='static'
        size='sm'
        style={{ '--spacing': '0.22rem' } as React.CSSProperties}
      >
        <Navbar.Header>
          <Navbar.Brand>
            <Logo compact />
          </Navbar.Brand>
          <Navbar.Content>
            {['Home', 'Projects', 'Tasks'].map((x) => (
              <Navbar.Item key={x} isCurrent={x === 'Home'}>
                {x}
              </Navbar.Item>
            ))}
          </Navbar.Content>
          <Navbar.Spacer />
          <Button isIconOnly size='sm' variant='ghost'>
            <Icon icon={PlusSignIcon} />
          </Button>
          <UserMenu />
        </Navbar.Header>
      </Navbar>
    </div>
  ),
};
