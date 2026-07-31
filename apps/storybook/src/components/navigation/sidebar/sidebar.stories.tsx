import type { Meta, StoryObj } from '@storybook/react';
import { Fragment } from 'react';

import {
  Avatar,
  Breadcrumbs,
  Button,
  Chip,
  Dropdown,
  Kbd,
  Label,
  Segment,
  Tooltip,
} from '@aero/ui';
import {
  Activity01Icon,
  Add01Icon,
  AiBrain01Icon,
  Airplane01Icon,
  Analytics01Icon,
  ArrowDown01Icon,
  BookOpen01Icon,
  CodeIcon,
  Copy01Icon,
  Delete02Icon,
  File01Icon,
  FolderOpenIcon,
  Globe02Icon,
  HelpCircleIcon,
  Home01Icon,
  HugeiconsIcon,
  LibraryIcon,
  Logout01Icon,
  MoreVerticalIcon,
  Notification01Icon,
  ReceiptTextIcon,
  Search01Icon,
  Settings01Icon,
  Task01Icon,
  UserMultipleIcon,
} from '@aero/ui/icons';

import { Sidebar, useSidebar } from './index';

const meta = {
  parameters: { layout: 'fullscreen' },
  tags: ['autodocs'],
  title: 'Components/Navigation/Sidebar',
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;
const nav = [
  { icon: Home01Icon, label: 'Dashboard' },
  {
    icon: Analytics01Icon,
    items: ['Overview', 'Reports', 'Conversions'],
    label: 'Analytics',
  },
  { badge: 'New', icon: Task01Icon, label: 'Tracker' },
  {
    icon: Settings01Icon,
    items: ['General', 'Team', 'Notifications'],
    label: 'Settings',
  },
] as const;

function MoreActions({ label }: { label: string }) {
  return (
    <Dropdown>
      <Dropdown.Trigger
        aria-label={`More actions for ${label}`}
        className='sidebar__menu-action'
        data-slot='sidebar-menu-action'
      >
        <HugeiconsIcon icon={MoreVerticalIcon} size={16} />
      </Dropdown.Trigger>
      <Dropdown.Popover className='w-44' offset={6} placement='right top'>
        <Dropdown.Menu aria-label={`${label} actions`}>
          <Dropdown.Item id='open' textValue='Open'>
            <HugeiconsIcon
              className='text-muted size-4 shrink-0'
              icon={FolderOpenIcon}
            />
            <Label>Open</Label>
          </Dropdown.Item>
          <Dropdown.Item id='duplicate' textValue='Duplicate'>
            <HugeiconsIcon
              className='text-muted size-4 shrink-0'
              icon={Copy01Icon}
            />
            <Label>Duplicate</Label>
          </Dropdown.Item>
          <Dropdown.Item id='delete' textValue='Delete' variant='danger'>
            <HugeiconsIcon
              className='text-danger size-4 shrink-0'
              icon={Delete02Icon}
            />
            <Label>Delete</Label>
          </Dropdown.Item>
        </Dropdown.Menu>
      </Dropdown.Popover>
    </Dropdown>
  );
}

function Menu({
  analyticsItems = ['Overview', 'Reports', 'Conversions'],
  nested = true,
}: {
  analyticsItems?: readonly string[];
  nested?: boolean;
}) {
  return (
    <Sidebar.Menu
      aria-label='Navigation'
      defaultExpandedKeys={nested ? ['Analytics'] : []}
    >
      {nav.map((item) => (
        <Sidebar.MenuItem
          href={item.items ? undefined : '#'}
          id={item.label}
          isCurrent={item.label === 'Dashboard'}
          key={item.label}
          textValue={item.label}
        >
          <Sidebar.MenuIcon>
            <HugeiconsIcon icon={item.icon} size={16} />
          </Sidebar.MenuIcon>
          <Sidebar.MenuLabel>
            {item.label}
            {nested && item.items ? (
              <Sidebar.MenuTrigger>
                <Sidebar.MenuIndicator />
              </Sidebar.MenuTrigger>
            ) : null}
          </Sidebar.MenuLabel>
          {'badge' in item ? (
            <Sidebar.MenuChip>
              <Chip color='success' size='sm' variant='soft'>
                {item.badge}
              </Chip>
            </Sidebar.MenuChip>
          ) : null}
          {nested && item.items ? (
            <Sidebar.Submenu>
              {(item.label === 'Analytics' ? analyticsItems : item.items).map(
                (child) => (
                  <Sidebar.MenuItem
                    href='#'
                    id={`${item.label}-${child}`}
                    key={child}
                    textValue={child}
                  >
                    <Sidebar.MenuLabel>{child}</Sidebar.MenuLabel>
                    <Sidebar.MenuActions className='ml-auto'>
                      <MoreActions label={child} />
                    </Sidebar.MenuActions>
                  </Sidebar.MenuItem>
                ),
              )}
            </Sidebar.Submenu>
          ) : null}
        </Sidebar.MenuItem>
      ))}
    </Sidebar.Menu>
  );
}
function UserMenu() {
  return (
    <Dropdown>
      <Dropdown.Trigger>
        <Button className='w-full justify-start' variant='ghost'>
          <Avatar className='size-7'>
            <Avatar.Fallback>JD</Avatar.Fallback>
          </Avatar>
          <span>Jordan Davis</span>
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
function Demo({
  collapsible = 'icon',
  defaultOpen = true,
  description = 'Main content area. Resize to mobile to see the Sheet sidebar.',
  nested = false,
  side = 'left',
  variant = 'sidebar',
  title = 'Workspace',
  user = false,
}: {
  collapsible?: 'icon' | 'none' | 'offcanvas';
  defaultOpen?: boolean;
  description?: string;
  nested?: boolean;
  side?: 'left' | 'right';
  title?: string;
  user?: boolean;
  variant?: 'floating' | 'inset' | 'sidebar';
}) {
  const sidebar = (
    <Sidebar>
      <Sidebar.Header>
        <div className='flex items-center gap-3 px-1 py-2'>
          <span className='bg-accent flex size-6 shrink-0 items-center justify-center rounded-md'>
            <span className='text-sm font-bold text-white'>H</span>
          </span>
          <span
            className='text-foreground text-sm font-semibold'
            data-sidebar='label'
          >
            {title}
          </span>
        </div>
      </Sidebar.Header>
      <Sidebar.Content>
        <Sidebar.Group>{Menu({ nested })}</Sidebar.Group>
      </Sidebar.Content>
      <Sidebar.Footer>
        {user ? (
          <UserMenu />
        ) : (
          <Sidebar.Menu aria-label='Footer actions'>
            <Sidebar.MenuItem href='#' id='help' textValue='Help & Information'>
              <Sidebar.MenuIcon>
                <HugeiconsIcon icon={HelpCircleIcon} size={16} />
              </Sidebar.MenuIcon>
              <Sidebar.MenuLabel>Help & Information</Sidebar.MenuLabel>
            </Sidebar.MenuItem>
            <Sidebar.MenuItem href='#' id='logout' textValue='Log out'>
              <Sidebar.MenuIcon>
                <HugeiconsIcon icon={Logout01Icon} size={16} />
              </Sidebar.MenuIcon>
              <Sidebar.MenuLabel>Log out</Sidebar.MenuLabel>
            </Sidebar.MenuItem>
          </Sidebar.Menu>
        )}
      </Sidebar.Footer>
      <Sidebar.Rail />
    </Sidebar>
  );
  const main = (
    <Sidebar.Main>
      <div className='flex items-center gap-3 p-4'>
        <Sidebar.Trigger />
        <Breadcrumbs className='min-w-0'>
          <Breadcrumbs.Item className='min-w-0 font-semibold'>
            <span className='flex min-w-0 items-center gap-2 overflow-hidden'>
              <HugeiconsIcon icon={Home01Icon} size={16} />
              <span className='truncate'>Dashboard</span>
            </span>
          </Breadcrumbs.Item>
        </Breadcrumbs>
      </div>
      <div className='p-6'>
        <p className='text-muted'>{description}</p>
      </div>
    </Sidebar.Main>
  );

  return (
    <Sidebar.Provider
      collapsible={collapsible}
      defaultOpen={defaultOpen}
      side={side}
      variant={variant}
    >
      {side === 'right' ? (
        <>
          {main}
          {sidebar}
        </>
      ) : (
        <>
          {sidebar}
          {main}
        </>
      )}
    </Sidebar.Provider>
  );
}

const collapsibleNav = [
  { icon: Home01Icon, label: 'Dashboard' },
  { icon: ReceiptTextIcon, label: 'Orders' },
  { badge: 'New', icon: Task01Icon, label: 'Tracker' },
  { icon: Analytics01Icon, label: 'Analytics' },
  { icon: UserMultipleIcon, label: 'Team' },
  { icon: Settings01Icon, label: 'Settings' },
] as const;

function CollapsibleDemo() {
  return (
    <Sidebar.Provider collapsible='icon'>
      <Sidebar>
        <Sidebar.Header>
          <div className='flex items-center gap-3 px-1 py-2'>
            <span className='bg-accent flex size-6 shrink-0 items-center justify-center rounded-md'>
              <span className='text-sm font-bold text-white'>H</span>
            </span>
            <span
              className='text-foreground text-sm font-semibold'
              data-sidebar='label'
            >
              Namespace
            </span>
          </div>
        </Sidebar.Header>
        <Sidebar.Content>
          <Sidebar.Group>
            <Sidebar.GroupLabel>Navigation</Sidebar.GroupLabel>
            <Sidebar.Menu aria-label='Navigation'>
              {collapsibleNav.map((item) => (
                <Sidebar.MenuItem
                  href='#'
                  id={item.label}
                  isCurrent={item.label === 'Dashboard'}
                  key={item.label}
                  textValue={item.label}
                >
                  <Sidebar.MenuIcon>
                    <HugeiconsIcon icon={item.icon} size={16} />
                  </Sidebar.MenuIcon>
                  <Sidebar.MenuLabel>{item.label}</Sidebar.MenuLabel>
                  {'badge' in item ? (
                    <Sidebar.MenuChip>
                      <Chip color='success' size='sm' variant='soft'>
                        {item.badge}
                      </Chip>
                    </Sidebar.MenuChip>
                  ) : null}
                </Sidebar.MenuItem>
              ))}
            </Sidebar.Menu>
          </Sidebar.Group>
        </Sidebar.Content>
        <Sidebar.Rail />
      </Sidebar>
      <Sidebar.Main>
        <div className='flex items-center gap-3 p-4'>
          <Sidebar.Trigger />
          <Breadcrumbs className='min-w-0'>
            <Breadcrumbs.Item className='min-w-0 font-semibold'>
              <span className='flex min-w-0 items-center gap-2 overflow-hidden'>
                <HugeiconsIcon icon={Home01Icon} size={16} />
                <span className='truncate'>Dashboard</span>
              </span>
            </Breadcrumbs.Item>
          </Breadcrumbs>
        </div>
        <div className='p-6'>
          <p className='text-muted'>
            Click the rail edge or trigger button to collapse. Press Cmd+B.
          </p>
        </div>
      </Sidebar.Main>
    </Sidebar.Provider>
  );
}

function IconOnlyDemo() {
  return (
    <Sidebar.Provider collapsible='none'>
      <Sidebar className='[--sidebar-width:56px]'>
        <Sidebar.Header className='items-center justify-center p-0 py-4'>
          <Avatar className='size-8 shrink-0'>
            <Avatar.Image
              alt='Kate Moore'
              src='/assets/avatars/blue-light.jpg'
            />
            <Avatar.Fallback>KM</Avatar.Fallback>
          </Avatar>
        </Sidebar.Header>
        <Sidebar.Content className='items-center justify-center px-1.5'>
          <Sidebar.Group>
            <Sidebar.Menu
              aria-label='Navigation'
              className='items-center gap-1'
            >
              {collapsibleNav.map((item) => (
                <Sidebar.MenuItem
                  id={item.label}
                  key={item.label}
                  textValue={item.label}
                  tooltipProps={{ content: item.label, delay: 0 }}
                >
                  <Sidebar.MenuItemContent className='justify-center gap-0 p-2.5'>
                    <Sidebar.MenuIcon>
                      <HugeiconsIcon icon={item.icon} size={16} />
                    </Sidebar.MenuIcon>
                  </Sidebar.MenuItemContent>
                </Sidebar.MenuItem>
              ))}
            </Sidebar.Menu>
          </Sidebar.Group>
        </Sidebar.Content>
        <Sidebar.Footer className='items-center justify-center p-0 py-4'>
          <Sidebar.Menu
            aria-label='Footer actions'
            className='items-center gap-1'
          >
            <Sidebar.MenuItem
              id='support'
              textValue='Help & Support'
              tooltipProps={{ content: 'Help & Support', delay: 0 }}
            >
              <Sidebar.MenuItemContent className='justify-center gap-0 p-2.5'>
                <Sidebar.MenuIcon>
                  <HugeiconsIcon icon={HelpCircleIcon} size={16} />
                </Sidebar.MenuIcon>
              </Sidebar.MenuItemContent>
            </Sidebar.MenuItem>
          </Sidebar.Menu>
        </Sidebar.Footer>
      </Sidebar>
      <Sidebar.Main>
        <div className='flex flex-col px-10 py-6'>
          <h1 className='text-foreground text-lg font-semibold'>Dashboard</h1>
          <p className='text-muted'>
            Icon-only sidebar that is always collapsed.
          </p>
        </div>
      </Sidebar.Main>
    </Sidebar.Provider>
  );
}

const groupSections = [
  {
    label: 'Platform',
    items: [
      { icon: Home01Icon, label: 'Dashboard' },
      { icon: Analytics01Icon, label: 'Analytics' },
      { icon: ReceiptTextIcon, label: 'Orders' },
    ],
  },
  {
    label: 'Settings',
    items: [
      { icon: Settings01Icon, label: 'General' },
      { icon: UserMultipleIcon, label: 'Team' },
      { icon: Notification01Icon, label: 'Notifications' },
    ],
  },
] as const;

function WithGroupsDemo() {
  return (
    <Sidebar.Provider>
      <Sidebar>
        <Sidebar.Header>
          <div className='flex items-center gap-3 px-1 py-2'>
            <span className='bg-accent flex size-6 shrink-0 items-center justify-center rounded-md'>
              <span className='text-sm font-bold text-white'>H</span>
            </span>
            <span
              className='text-foreground text-sm font-semibold'
              data-sidebar='label'
            >
              Namespace
            </span>
          </div>
        </Sidebar.Header>
        <Sidebar.Content>
          {groupSections.map((section, index) => (
            <Fragment key={section.label}>
              {index > 0 ? <Sidebar.Separator /> : null}
              <Sidebar.Group>
                <Sidebar.GroupLabel>{section.label}</Sidebar.GroupLabel>
                <Sidebar.Menu aria-label={section.label}>
                  {section.items.map((item) => (
                    <Sidebar.MenuItem
                      id={item.label.toLowerCase()}
                      key={item.label}
                      textValue={item.label}
                    >
                      <Sidebar.MenuIcon>
                        <HugeiconsIcon icon={item.icon} size={16} />
                      </Sidebar.MenuIcon>
                      <Sidebar.MenuLabel>{item.label}</Sidebar.MenuLabel>
                    </Sidebar.MenuItem>
                  ))}
                </Sidebar.Menu>
              </Sidebar.Group>
            </Fragment>
          ))}
        </Sidebar.Content>
      </Sidebar>
      <Sidebar.Main>
        <div className='flex items-center gap-3 p-4'>
          <Sidebar.Trigger />
          <Breadcrumbs className='min-w-0'>
            <Breadcrumbs.Item className='min-w-0 font-semibold'>
              <span className='flex min-w-0 items-center gap-2 overflow-hidden'>
                <HugeiconsIcon icon={Home01Icon} size={16} />
                <span className='truncate'>Dashboard</span>
              </span>
            </Breadcrumbs.Item>
          </Breadcrumbs>
        </div>
        <div className='p-6'>
          <p className='text-muted'>Main content area</p>
        </div>
      </Sidebar.Main>
    </Sidebar.Provider>
  );
}

const documentationSections = [
  { items: ['Installation', 'Project Structure'], label: 'Getting Started' },
  {
    items: [
      'Routing',
      'Data Fetching',
      'Rendering',
      'Caching',
      'Styling',
      'Testing',
    ],
    label: 'Build Your Application',
  },
  {
    items: ['Components', 'Functions', 'Hooks', 'Config'],
    label: 'API Reference',
  },
] as const;

function DocumentationMenu() {
  return (
    <Sidebar.Menu
      aria-label='Documentation navigation'
      defaultExpandedKeys={['Build Your Application']}
      showGuideLines='hover'
    >
      {documentationSections.map((section) => (
        <Sidebar.MenuSection key={section.label}>
          <Sidebar.MenuHeader>{section.label}</Sidebar.MenuHeader>
          <Sidebar.MenuItem id={section.label} textValue={section.label}>
            <Sidebar.MenuLabel>{section.label}</Sidebar.MenuLabel>
            <Sidebar.MenuTrigger>
              <Sidebar.MenuIndicator />
            </Sidebar.MenuTrigger>
            <Sidebar.Submenu>
              {section.items.map((item) => (
                <Sidebar.MenuItem
                  href='#'
                  id={`${section.label}-${item}`}
                  isCurrent={item === 'Data Fetching'}
                  key={item}
                  textValue={item}
                >
                  <Sidebar.MenuLabel>{item}</Sidebar.MenuLabel>
                  <Sidebar.MenuActions className='ml-auto'>
                    <MoreActions label={item} />
                  </Sidebar.MenuActions>
                </Sidebar.MenuItem>
              ))}
            </Sidebar.Submenu>
          </Sidebar.MenuItem>
        </Sidebar.MenuSection>
      ))}
    </Sidebar.Menu>
  );
}

function CollapsibleGroupsDemo() {
  return (
    <Sidebar.Provider collapsible='offcanvas'>
      <Sidebar>
        <Sidebar.Header>
          <div className='flex items-center gap-3 px-1 py-2'>
            <span className='bg-accent flex size-6 shrink-0 items-center justify-center rounded-md'>
              <span className='text-xs font-bold text-white'>D</span>
            </span>
            <span className='flex flex-col'>
              <span className='text-foreground text-sm leading-tight font-semibold'>
                Documentation
              </span>
              <span className='text-muted text-xs leading-tight'>v1.0.0</span>
            </span>
          </div>
        </Sidebar.Header>
        <Sidebar.Content>
          <DocumentationMenu />
        </Sidebar.Content>
      </Sidebar>
      <Sidebar.Main>
        <div className='flex items-center gap-3 p-4'>
          <Sidebar.Trigger />
          <Breadcrumbs className='min-w-0'>
            <Breadcrumbs.Item className='text-muted min-w-0' href='#'>
              <span className='flex min-w-0 items-center gap-2 overflow-hidden'>
                <HugeiconsIcon icon={BookOpen01Icon} size={16} />
                <span className='truncate'>Build Your Application</span>
              </span>
            </Breadcrumbs.Item>
            <Breadcrumbs.Item className='min-w-0 font-semibold'>
              <span className='truncate'>Data Fetching</span>
            </Breadcrumbs.Item>
          </Breadcrumbs>
        </div>
        <div className='p-6'>
          <p className='text-muted'>
            Documentation content area. Toggle the sidebar with the trigger
            button.
          </p>
        </div>
      </Sidebar.Main>
    </Sidebar.Provider>
  );
}

function ReducedMotionDemo() {
  return (
    <Sidebar.Provider collapsible='icon' reduceMotion>
      <Sidebar>
        <Sidebar.Header>
          <div className='flex items-center gap-3 px-1 py-2'>
            <span className='bg-accent flex size-6 shrink-0 items-center justify-center rounded-md'>
              <span className='text-sm font-bold text-white'>H</span>
            </span>
            <span
              className='text-foreground text-sm font-semibold'
              data-sidebar='label'
            >
              Namespace
            </span>
          </div>
        </Sidebar.Header>
        <Sidebar.Content>
          <Sidebar.Group>
            <Sidebar.GroupLabel>Navigation</Sidebar.GroupLabel>
            <Menu analyticsItems={['Overview', 'Reports', 'Exports']} nested />
          </Sidebar.Group>
        </Sidebar.Content>
        <Sidebar.Rail />
      </Sidebar>
      <Sidebar.Main>
        <div className='flex items-center gap-3 p-4'>
          <Sidebar.Trigger />
          <Breadcrumbs className='min-w-0'>
            <Breadcrumbs.Item className='text-muted min-w-0' href='#'>
              <span className='flex min-w-0 items-center gap-2 overflow-hidden'>
                <HugeiconsIcon icon={Analytics01Icon} size={16} />
                <span className='truncate'>Analytics</span>
              </span>
            </Breadcrumbs.Item>
            <Breadcrumbs.Item className='min-w-0 font-semibold'>
              <span>Reports</span>
            </Breadcrumbs.Item>
          </Breadcrumbs>
        </div>
        <div className='p-6'>
          <p className='text-muted'>
            reduceMotion is enabled, so nested sections open and close
            instantly.
          </p>
        </div>
      </Sidebar.Main>
    </Sidebar.Provider>
  );
}

function SimpleNavigation({
  current = 'Dashboard',
  showBadge = false,
}: {
  current?: string;
  showBadge?: boolean;
}) {
  return (
    <Sidebar.Menu aria-label='Navigation'>
      {collapsibleNav.map((item) => (
        <Sidebar.MenuItem
          id={item.label}
          isCurrent={item.label === current}
          key={item.label}
          textValue={item.label}
        >
          <Sidebar.MenuIcon>
            <HugeiconsIcon icon={item.icon} size={16} />
          </Sidebar.MenuIcon>
          <Sidebar.MenuLabel>{item.label}</Sidebar.MenuLabel>
          {showBadge && 'badge' in item ? (
            <Sidebar.MenuChip>
              <Chip color='success' size='sm' variant='soft'>
                {item.badge}
              </Chip>
            </Sidebar.MenuChip>
          ) : null}
        </Sidebar.MenuItem>
      ))}
    </Sidebar.Menu>
  );
}

function FloatingVariantDemo() {
  return (
    <Sidebar.Provider collapsible='offcanvas' variant='floating'>
      <Sidebar>
        <Sidebar.Header>
          <div className='flex items-center gap-3 px-1 py-2'>
            <span className='bg-accent flex size-6 shrink-0 items-center justify-center rounded-md'>
              <span className='text-sm font-bold text-white'>H</span>
            </span>
            <span
              className='text-foreground text-sm font-semibold'
              data-sidebar='label'
            >
              Namespace
            </span>
          </div>
        </Sidebar.Header>
        <Sidebar.Content>
          <Sidebar.Group>
            <SimpleNavigation current='' />
          </Sidebar.Group>
        </Sidebar.Content>
        <Sidebar.Rail />
      </Sidebar>
      <Sidebar.Main>
        <div className='flex items-center gap-3 p-4'>
          <Sidebar.Trigger />
          <Breadcrumbs className='min-w-0'>
            <Breadcrumbs.Item className='min-w-0 font-semibold'>
              <span className='flex min-w-0 items-center gap-2 overflow-hidden'>
                <HugeiconsIcon icon={Home01Icon} size={16} />
                <span className='truncate'>Dashboard</span>
              </span>
            </Breadcrumbs.Item>
          </Breadcrumbs>
        </div>
        <div className='p-6'>
          <p className='text-muted'>
            Floating sidebar with rounded corners and shadow
          </p>
        </div>
      </Sidebar.Main>
    </Sidebar.Provider>
  );
}

function WithAvatarDemo() {
  return (
    <Sidebar.Provider collapsible='icon'>
      <Sidebar className='group'>
        <Sidebar.Header>
          <div className='flex items-center gap-3 px-1 py-2'>
            <Avatar className='size-8 shrink-0'>
              <Avatar.Image
                alt='Kate Moore'
                src='/assets/avatars/blue-light.jpg'
              />
              <Avatar.Fallback>KM</Avatar.Fallback>
            </Avatar>
            <div
              className='flex min-w-0 flex-col group-data-[state=collapsed]:hidden'
              data-sidebar='label'
            >
              <span className='text-foreground text-sm leading-tight font-medium'>
                Kate Moore
              </span>
              <span className='text-muted text-xs leading-tight'>
                kate@acme.com
              </span>
            </div>
          </div>
        </Sidebar.Header>
        <Sidebar.Separator />
        <Sidebar.Content>
          <Sidebar.Group>
            <SimpleNavigation showBadge />
          </Sidebar.Group>
        </Sidebar.Content>
        <Sidebar.Separator />
        <Sidebar.Footer>
          <Sidebar.Menu aria-label='Footer actions'>
            <Sidebar.MenuItem href='#' id='help' textValue='Help & Information'>
              <Sidebar.MenuIcon>
                <HugeiconsIcon icon={HelpCircleIcon} size={16} />
              </Sidebar.MenuIcon>
              <Sidebar.MenuLabel>Help & Information</Sidebar.MenuLabel>
            </Sidebar.MenuItem>
            <Sidebar.MenuItem href='#' id='logout' textValue='Log out'>
              <Sidebar.MenuIcon>
                <HugeiconsIcon icon={Logout01Icon} size={16} />
              </Sidebar.MenuIcon>
              <Sidebar.MenuLabel>Log out</Sidebar.MenuLabel>
            </Sidebar.MenuItem>
          </Sidebar.Menu>
        </Sidebar.Footer>
        <Sidebar.Rail />
      </Sidebar>
      <Sidebar.Main>
        <div className='flex items-center gap-3 p-4'>
          <Sidebar.Trigger />
          <Breadcrumbs className='min-w-0'>
            <Breadcrumbs.Item className='min-w-0 font-semibold'>
              <span className='flex min-w-0 items-center gap-2 overflow-hidden'>
                <HugeiconsIcon icon={UserMultipleIcon} size={16} />
                <span className='truncate'>Team</span>
              </span>
            </Breadcrumbs.Item>
          </Breadcrumbs>
        </div>
        <div className='p-6'>
          <p className='text-muted'>Main content area</p>
        </div>
      </Sidebar.Main>
    </Sidebar.Provider>
  );
}

const insetSections = [
  {
    label: 'Platform',
    items: [
      { icon: CodeIcon, label: 'Playground' },
      { icon: AiBrain01Icon, label: 'Models' },
      { icon: BookOpen01Icon, label: 'Documentation' },
      { icon: Settings01Icon, label: 'Settings' },
    ],
  },
  {
    label: 'Projects',
    items: [
      { icon: Task01Icon, label: 'Design Engineering' },
      { icon: Globe02Icon, label: 'Sales & Marketing' },
      { icon: Airplane01Icon, label: 'Travel' },
    ],
  },
] as const;

function InsetVariantDemo() {
  return (
    <Sidebar.Provider collapsible='offcanvas' variant='inset'>
      <Sidebar>
        <Sidebar.Header>
          <div className='flex items-center gap-3 px-1 py-2'>
            <span className='bg-foreground flex size-8 shrink-0 items-center justify-center rounded-lg'>
              <HugeiconsIcon
                className='text-background size-4'
                icon={AiBrain01Icon}
              />
            </span>
            <span className='flex flex-col'>
              <span className='text-foreground text-sm leading-tight font-semibold'>
                Namespace Inc.
              </span>
              <span className='text-muted text-xs leading-tight'>
                Enterprise
              </span>
            </span>
          </div>
        </Sidebar.Header>
        <Sidebar.Content>
          {insetSections.map((section, index) => (
            <Fragment key={section.label}>
              {index > 0 ? <Sidebar.Separator /> : null}
              <Sidebar.Group>
                <Sidebar.GroupLabel>{section.label}</Sidebar.GroupLabel>
                <Sidebar.Menu aria-label={section.label}>
                  {section.items.map((item) => (
                    <Sidebar.MenuItem
                      id={item.label.toLowerCase().replaceAll(' ', '-')}
                      key={item.label}
                      textValue={item.label}
                    >
                      <Sidebar.MenuIcon>
                        <HugeiconsIcon icon={item.icon} size={16} />
                      </Sidebar.MenuIcon>
                      <Sidebar.MenuLabel>{item.label}</Sidebar.MenuLabel>
                    </Sidebar.MenuItem>
                  ))}
                </Sidebar.Menu>
              </Sidebar.Group>
            </Fragment>
          ))}
        </Sidebar.Content>
      </Sidebar>
      <Sidebar.Main>
        <div className='flex items-center gap-3 p-4'>
          <Sidebar.Trigger />
          <Breadcrumbs className='min-w-0'>
            <Breadcrumbs.Item className='text-muted min-w-0' href='#'>
              <span className='flex min-w-0 items-center gap-2 overflow-hidden'>
                <HugeiconsIcon icon={AiBrain01Icon} size={16} />
                <span className='truncate'>Build Your Application</span>
              </span>
            </Breadcrumbs.Item>
            <Breadcrumbs.Item className='min-w-0 font-semibold'>
              <span>Data Fetching</span>
            </Breadcrumbs.Item>
          </Breadcrumbs>
        </div>
        <div className='grid gap-4 p-4 pt-0'>
          <div className='grid grid-cols-3 gap-4'>
            <div className='bg-surface rounded-xl border p-6' />
            <div className='bg-surface rounded-xl border p-6' />
            <div className='bg-surface rounded-xl border p-6' />
          </div>
          <div className='bg-surface min-h-[50vh] rounded-xl border p-6' />
        </div>
      </Sidebar.Main>
    </Sidebar.Provider>
  );
}

const compactMainNav = [
  { icon: Search01Icon, isButton: true, label: 'Search' },
  { icon: Home01Icon, label: 'Home' },
  { icon: Activity01Icon, label: 'Activity' },
  { icon: Globe02Icon, label: 'Browse' },
] as const;
const compactLibraryItems = ['Design Tokens', 'Color Palette', 'Typography'];

function CompactWithUserMenuDemo() {
  return (
    <Sidebar.Provider>
      <Sidebar style={{ '--spacing': '0.2rem' } as React.CSSProperties}>
        <Sidebar.Header>
          <div className='flex items-center gap-3 px-1 py-2'>
            <span className='flex size-6 shrink-0 items-center justify-center rounded-md bg-green-600'>
              <span className='text-sm font-bold text-white'>H</span>
            </span>
            <span
              className='text-foreground text-sm font-semibold'
              data-sidebar='label'
            >
              Namespace Labs
            </span>
          </div>
        </Sidebar.Header>
        <Sidebar.Content>
          <Sidebar.Group>
            <Sidebar.Menu aria-label='Main navigation'>
              {compactMainNav.map((item) => (
                <Sidebar.MenuItem
                  href={item.isButton ? undefined : '#'}
                  id={`compact-user-menu-nav-${item.label}`}
                  isCurrent={item.label === 'Home'}
                  key={item.label}
                  textValue={item.label}
                >
                  <Sidebar.MenuIcon>
                    <HugeiconsIcon icon={item.icon} size={16} />
                  </Sidebar.MenuIcon>
                  <Sidebar.MenuLabel>{item.label}</Sidebar.MenuLabel>
                  {item.label === 'Search' ? (
                    <Sidebar.MenuChip>
                      <Kbd className='text-xs'>
                        <Kbd.Abbr keyValue='command' />
                        <Kbd.Content>K</Kbd.Content>
                      </Kbd>
                    </Sidebar.MenuChip>
                  ) : null}
                </Sidebar.MenuItem>
              ))}
            </Sidebar.Menu>
          </Sidebar.Group>
          <Sidebar.Group>
            <Sidebar.GroupLabel>Spaces</Sidebar.GroupLabel>
            <Sidebar.Menu
              aria-label='Spaces'
              defaultExpandedKeys={['compact-user-menu-my-library']}
            >
              <Sidebar.MenuItem
                id='compact-user-menu-my-library'
                textValue='My library'
              >
                <Sidebar.MenuIcon>
                  <HugeiconsIcon icon={LibraryIcon} size={16} />
                </Sidebar.MenuIcon>
                <Sidebar.MenuLabel>
                  My library
                  <Sidebar.MenuTrigger>
                    <Sidebar.MenuIndicator />
                  </Sidebar.MenuTrigger>
                </Sidebar.MenuLabel>
                <Sidebar.Submenu>
                  {compactLibraryItems.map((item) => (
                    <Sidebar.MenuItem
                      href='#'
                      id={`compact-user-menu-sp-${item}`}
                      key={item}
                      textValue={item}
                    >
                      <Sidebar.MenuIcon>
                        <HugeiconsIcon icon={File01Icon} size={16} />
                      </Sidebar.MenuIcon>
                      <Sidebar.MenuLabel>{item}</Sidebar.MenuLabel>
                    </Sidebar.MenuItem>
                  ))}
                </Sidebar.Submenu>
              </Sidebar.MenuItem>
              <Sidebar.MenuItem
                href='#'
                id='compact-user-menu-design-team'
                textValue='Design team'
              >
                <Sidebar.MenuIcon>
                  <HugeiconsIcon icon={UserMultipleIcon} size={16} />
                </Sidebar.MenuIcon>
                <Sidebar.MenuLabel>Design team</Sidebar.MenuLabel>
              </Sidebar.MenuItem>
              <Sidebar.MenuItem
                id='compact-user-menu-add-space'
                textValue='Add space'
              >
                <Sidebar.MenuIcon>
                  <HugeiconsIcon icon={Add01Icon} size={16} />
                </Sidebar.MenuIcon>
                <Sidebar.MenuLabel className='text-muted'>
                  Add space
                </Sidebar.MenuLabel>
              </Sidebar.MenuItem>
            </Sidebar.Menu>
          </Sidebar.Group>
        </Sidebar.Content>
        <Sidebar.Separator />
        <Sidebar.Footer className='px-2 pt-0 pb-2'>
          <Dropdown>
            <Dropdown.Trigger className='hover:bg-default flex w-full items-center gap-2 rounded-xl px-2 py-1.5 text-left outline-none'>
              <Avatar size='sm'>
                <Avatar.Image
                  alt='Junior Garcia'
                  src='/assets/avatars/orange.jpg'
                />
                <Avatar.Fallback delayMs={600}>JG</Avatar.Fallback>
              </Avatar>
              <span
                className='text-foreground text-sm font-medium'
                data-sidebar='label'
              >
                Junior
              </span>
              <HugeiconsIcon
                className='text-muted ml-auto size-3'
                data-sidebar='label'
                icon={ArrowDown01Icon}
              />
            </Dropdown.Trigger>
            <Dropdown.Popover placement='top start'>
              <div className='px-3 pt-3 pb-1'>
                <div className='flex items-center gap-2'>
                  <Avatar size='sm'>
                    <Avatar.Image
                      alt='Junior Garcia'
                      src='/assets/avatars/orange.jpg'
                    />
                    <Avatar.Fallback delayMs={600}>JG</Avatar.Fallback>
                  </Avatar>
                  <div className='flex flex-col gap-0'>
                    <p className='text-sm leading-5 font-medium'>
                      Junior Garcia
                    </p>
                    <p className='text-muted text-xs leading-none'>
                      junior@namespace.ninja
                    </p>
                  </div>
                </div>
              </div>
              <Dropdown.Menu>
                <Dropdown.Item id='compact-user-menu-dd-dashboard'>
                  <Label>Dashboard</Label>
                </Dropdown.Item>
                <Dropdown.Item id='compact-user-menu-dd-profile'>
                  <Label>Profile</Label>
                </Dropdown.Item>
                <Dropdown.Item id='compact-user-menu-dd-settings'>
                  <Label>Settings</Label>
                </Dropdown.Item>
                <Dropdown.Item id='compact-user-menu-dd-create-team'>
                  <Label>Create Team</Label>
                </Dropdown.Item>
                <Dropdown.Item
                  id='compact-user-menu-dd-logout'
                  variant='danger'
                >
                  <Label>Log Out</Label>
                </Dropdown.Item>
              </Dropdown.Menu>
            </Dropdown.Popover>
          </Dropdown>
        </Sidebar.Footer>
        <Sidebar.Rail />
      </Sidebar>
      <Sidebar.Main>
        <div className='flex items-center gap-3 p-4'>
          <Sidebar.Trigger />
          <Breadcrumbs className='min-w-0'>
            <Breadcrumbs.Item className='min-w-0 font-semibold'>
              <span className='flex min-w-0 items-center gap-2 overflow-hidden'>
                <HugeiconsIcon icon={Home01Icon} size={16} />
                <span className='truncate'>Home</span>
              </span>
            </Breadcrumbs.Item>
          </Breadcrumbs>
        </div>
        <div className='p-6'>
          <p className='text-muted'>
            Compact sidebar with user dropdown menu. Uses{' '}
            <code className='bg-default rounded px-1 py-0.5 text-xs'>
              --spacing: 0.2rem
            </code>{' '}
            for dense layout.
          </p>
        </div>
      </Sidebar.Main>
    </Sidebar.Provider>
  );
}

const complexRecents = [
  'User Settings',
  'Onboarding Flow',
  'API Gateway',
  'Theme Builder',
  'Navigation',
];
const complexTeamspaceItems = [
  'Home',
  'My Tasks',
  'Projects',
  'Epics',
  'Roadmap',
  'Sprint Board',
  'Eng Board',
  'Design Board',
  'Sprints',
  'Initiatives',
  'Vault',
  'Archive',
  'Wiki',
  'Brainstorm',
  'Standup',
  'Launch v3',
];

function ComplexSidebarContent() {
  const { collapsible, isMobile, isOpen } = useSidebar();
  const isCollapsed = collapsible === 'icon' && !isMobile && !isOpen;

  return (
    <>
      <Sidebar.Header>
        <div className='flex items-center justify-between px-1 py-2'>
          <div className='flex items-center gap-3'>
            <span className='flex size-6 shrink-0 items-center justify-center rounded-md bg-amber-700'>
              <span className='text-sm font-bold text-white'>A</span>
            </span>
            <span
              className='text-foreground text-sm font-semibold'
              data-sidebar='label'
            >
              Acme Labs
            </span>
          </div>
          {!isCollapsed ? (
            <div className='flex items-center' data-sidebar='label'>
              <button
                className='text-foreground hover:bg-default flex items-center gap-0.5 rounded-md p-1'
                type='button'
              >
                <HugeiconsIcon icon={AiBrain01Icon} size={16} />
                <HugeiconsIcon
                  className='text-muted size-3'
                  icon={ArrowDown01Icon}
                />
              </button>
            </div>
          ) : null}
        </div>
        {!isCollapsed ? (
          <Segment
            className='[&_.segment__indicator]:bg-default bg-transparent p-0 [&_.segment__indicator]:shadow-none'
            defaultSelectedKey='home'
            size='sm'
          >
            {[
              ['home', Home01Icon, 'Home'],
              ['meetings', Activity01Icon, 'Meetings'],
              ['ai', AiBrain01Icon, 'Acme AI'],
              ['inbox', Notification01Icon, 'Inbox'],
            ].map(([id, icon, label]) => (
              <Segment.Item
                className='w-auto'
                id={id as string}
                key={id as string}
              >
                {({ isSelected }) => (
                  <>
                    <HugeiconsIcon icon={icon} size={16} />
                    <span
                      className='inline-grid transition-all duration-200 ease-out motion-reduce:transition-none'
                      style={{
                        gridTemplateColumns: isSelected ? '1fr' : '0fr',
                        opacity: isSelected ? 1 : 0,
                      }}
                    >
                      <span className='overflow-hidden'>{label as string}</span>
                    </span>
                  </>
                )}
              </Segment.Item>
            ))}
          </Segment>
        ) : null}
      </Sidebar.Header>
      <Sidebar.Content>
        <Sidebar.Group>
          <Sidebar.GroupLabel className='capitalize'>
            Recents
          </Sidebar.GroupLabel>
          <Sidebar.Menu aria-label='Recents'>
            {complexRecents.map((item) => (
              <Sidebar.MenuItem
                href='#'
                id={`complex-${item}`}
                key={item}
                textValue={item}
              >
                <Sidebar.MenuIcon>
                  <HugeiconsIcon icon={File01Icon} size={16} />
                </Sidebar.MenuIcon>
                <Sidebar.MenuLabel>{item}</Sidebar.MenuLabel>
              </Sidebar.MenuItem>
            ))}
          </Sidebar.Menu>
        </Sidebar.Group>
        <Sidebar.Group>
          <Sidebar.GroupLabel>Favorites</Sidebar.GroupLabel>
          <Sidebar.Menu aria-label='Favorites'>
            {[
              ['Tutorials', BookOpen01Icon],
              ['My Tasks', Task01Icon],
            ].map(([label, icon]) => (
              <Sidebar.MenuItem
                href='#'
                id={`complex-fav-${label}`}
                key={label as string}
                textValue={label as string}
              >
                <Sidebar.MenuIcon>
                  <HugeiconsIcon icon={icon} size={16} />
                </Sidebar.MenuIcon>
                <Sidebar.MenuLabel>{label as string}</Sidebar.MenuLabel>
              </Sidebar.MenuItem>
            ))}
          </Sidebar.Menu>
        </Sidebar.Group>
        <Sidebar.Group>
          <Sidebar.GroupLabel>
            <span className='flex items-center gap-2'>
              Agents
              <Chip size='sm' variant='soft'>
                Beta
              </Chip>
            </span>
          </Sidebar.GroupLabel>
          <Sidebar.Menu aria-label='Agents'>
            <Sidebar.MenuItem
              href='#'
              id='complex-personal'
              textValue='Personal'
            >
              <Sidebar.MenuIcon>
                <HugeiconsIcon icon={UserMultipleIcon} size={16} />
              </Sidebar.MenuIcon>
              <Sidebar.MenuLabel>Personal</Sidebar.MenuLabel>
            </Sidebar.MenuItem>
            <Sidebar.MenuItem id='complex-add-agent' textValue='Add new'>
              <Sidebar.MenuIcon>
                <HugeiconsIcon icon={Add01Icon} size={16} />
              </Sidebar.MenuIcon>
              <Sidebar.MenuLabel className='text-muted'>
                Add new
              </Sidebar.MenuLabel>
            </Sidebar.MenuItem>
          </Sidebar.Menu>
        </Sidebar.Group>
        <Sidebar.Group>
          <Sidebar.GroupLabel>
            <span className='flex flex-1 items-center justify-between'>
              Teamspaces
              <Dropdown>
                <Dropdown.Trigger
                  aria-label='Teamspaces section actions'
                  className='text-muted hover:bg-default -mr-1 flex size-6 items-center justify-center rounded-md'
                >
                  <HugeiconsIcon icon={MoreVerticalIcon} size={16} />
                </Dropdown.Trigger>
                <Dropdown.Popover
                  className='w-48'
                  offset={6}
                  placement='right top'
                >
                  <Dropdown.Menu aria-label='Teamspaces section actions'>
                    <Dropdown.Item id='show'>Show</Dropdown.Item>
                    <Dropdown.Item id='move-up'>Move up</Dropdown.Item>
                    <Dropdown.Item id='move-down'>Move down</Dropdown.Item>
                    <Dropdown.Item id='hide'>Hide section</Dropdown.Item>
                    <Dropdown.Item id='new-teamspace'>
                      New teamspace
                    </Dropdown.Item>
                    <Dropdown.Item id='open-library'>
                      Open in Library
                    </Dropdown.Item>
                  </Dropdown.Menu>
                </Dropdown.Popover>
              </Dropdown>
            </span>
          </Sidebar.GroupLabel>
          <Sidebar.Menu
            aria-label='Teamspaces'
            defaultExpandedKeys={['complex-acme-hq']}
          >
            <Sidebar.MenuItem id='complex-acme-hq' textValue='Acme HQ'>
              <Sidebar.MenuIcon>
                <HugeiconsIcon icon={Home01Icon} size={16} />
              </Sidebar.MenuIcon>
              <Sidebar.MenuLabel>
                Acme HQ
                <Sidebar.MenuTrigger>
                  <Sidebar.MenuIndicator />
                </Sidebar.MenuTrigger>
              </Sidebar.MenuLabel>
              <Sidebar.Submenu>
                {complexTeamspaceItems.map((item) => (
                  <Sidebar.MenuItem
                    href='#'
                    id={`complex-ts-${item}`}
                    isCurrent={item === 'Roadmap'}
                    key={item}
                    textValue={item}
                  >
                    <Sidebar.MenuIcon>
                      <HugeiconsIcon
                        icon={item === 'Roadmap' ? Analytics01Icon : File01Icon}
                        size={16}
                      />
                    </Sidebar.MenuIcon>
                    <Sidebar.MenuLabel>{item}</Sidebar.MenuLabel>
                    <Sidebar.MenuActions className='ml-auto'>
                      <MoreActions label={item} />
                    </Sidebar.MenuActions>
                  </Sidebar.MenuItem>
                ))}
              </Sidebar.Submenu>
            </Sidebar.MenuItem>
            {[
              ['Engineering', Settings01Icon],
              ['Metrics', Analytics01Icon],
              ['Tracker', Task01Icon],
              ['Reports', ReceiptTextIcon],
            ].map(([label, icon]) => (
              <Sidebar.MenuItem
                href='#'
                id={`complex-ts-extra-${label}`}
                key={label as string}
                textValue={label as string}
              >
                <Sidebar.MenuIcon>
                  <HugeiconsIcon icon={icon} size={16} />
                </Sidebar.MenuIcon>
                <Sidebar.MenuLabel>{label as string}</Sidebar.MenuLabel>
                {label === 'Metrics' ? (
                  <Sidebar.MenuChip>
                    <HugeiconsIcon icon={LibraryIcon} size={12} />
                  </Sidebar.MenuChip>
                ) : null}
                <Sidebar.MenuActions className='ml-auto'>
                  <MoreActions label={label as string} />
                </Sidebar.MenuActions>
              </Sidebar.MenuItem>
            ))}
          </Sidebar.Menu>
        </Sidebar.Group>
        <Sidebar.Separator />
        <Sidebar.Group>
          <Sidebar.GroupLabel>Shared</Sidebar.GroupLabel>
          <Sidebar.Menu aria-label='Shared'>
            <Sidebar.MenuItem
              href='#'
              id='complex-shared-sprints'
              textValue='Sprints'
            >
              <Sidebar.MenuIcon>
                <HugeiconsIcon icon={Activity01Icon} size={16} />
              </Sidebar.MenuIcon>
              <Sidebar.MenuLabel>Sprints</Sidebar.MenuLabel>
            </Sidebar.MenuItem>
          </Sidebar.Menu>
        </Sidebar.Group>
        <Sidebar.Group>
          <Sidebar.GroupLabel>Apps</Sidebar.GroupLabel>
          <Sidebar.Menu aria-label='Apps'>
            <Sidebar.MenuItem href='#' id='complex-mail' textValue='Acme Mail'>
              <Sidebar.MenuIcon>
                <HugeiconsIcon icon={Notification01Icon} size={16} />
              </Sidebar.MenuIcon>
              <Sidebar.MenuLabel>Acme Mail</Sidebar.MenuLabel>
            </Sidebar.MenuItem>
            <Sidebar.MenuItem
              href='#'
              id='complex-calendar'
              textValue='Acme Calendar'
            >
              <Sidebar.MenuIcon>
                <HugeiconsIcon icon={Activity01Icon} size={16} />
              </Sidebar.MenuIcon>
              <Sidebar.MenuLabel>Acme Calendar</Sidebar.MenuLabel>
            </Sidebar.MenuItem>
          </Sidebar.Menu>
        </Sidebar.Group>
      </Sidebar.Content>
      <Sidebar.Separator />
      <Sidebar.Footer>
        {!isMobile ? (
          <Sidebar.Menu aria-label='Utilities'>
            {[
              ['Library', LibraryIcon],
              ['My Tasks', Task01Icon],
              ['Marketplace', Globe02Icon],
              ['Help', HelpCircleIcon],
              ['Trash', Delete02Icon],
            ].map(([label, icon]) => (
              <Sidebar.MenuItem
                href='#'
                id={`complex-util-${label}`}
                key={label as string}
                textValue={label as string}
              >
                <Sidebar.MenuIcon>
                  <HugeiconsIcon icon={icon} size={16} />
                </Sidebar.MenuIcon>
                <Sidebar.MenuLabel>{label as string}</Sidebar.MenuLabel>
              </Sidebar.MenuItem>
            ))}
          </Sidebar.Menu>
        ) : null}
        <div className='flex items-center justify-center gap-2 px-2 py-2'>
          {!isCollapsed ? (
            <Button
              className={`text-muted flex h-10 flex-1 gap-2 text-sm ${
                isMobile
                  ? 'border-default border bg-transparent shadow-none'
                  : 'bg-surface shadow-surface'
              }`}
              size='sm'
              variant='tertiary'
            >
              <HugeiconsIcon icon={AiBrain01Icon} size={16} />
              <span>New chat</span>
              <Kbd className='text-xs'>
                <Kbd.Abbr keyValue='command' />
                <Kbd.Content>N</Kbd.Content>
              </Kbd>
            </Button>
          ) : null}
          <Button isIconOnly size='sm' variant='tertiary'>
            <HugeiconsIcon className='text-muted size-4' icon={Add01Icon} />
          </Button>
        </div>
      </Sidebar.Footer>
    </>
  );
}

function ComplexDemo() {
  return (
    <Sidebar.Provider>
      <Sidebar style={{ '--spacing': '0.2rem' } as React.CSSProperties}>
        <ComplexSidebarContent />
        <Sidebar.Rail />
      </Sidebar>
      <Sidebar.Main>
        <div className='flex items-center gap-3 p-4'>
          <Sidebar.Trigger />
          <Breadcrumbs className='min-w-0'>
            <Breadcrumbs.Item className='min-w-0 font-semibold'>
              <span className='flex min-w-0 items-center gap-2 overflow-hidden'>
                <HugeiconsIcon icon={Analytics01Icon} size={16} />
                <span className='truncate'>Roadmap</span>
              </span>
            </Breadcrumbs.Item>
          </Breadcrumbs>
        </div>
        <div className='p-6'>
          <p className='text-muted'>
            Complex sidebar with compact spacing. All density is controlled via{' '}
            <code className='bg-default rounded px-1 py-0.5 text-xs'>
              --spacing: 0.2rem
            </code>
            .
          </p>
        </div>
      </Sidebar.Main>
    </Sidebar.Provider>
  );
}

const meetingChats = [
  ['Call Prep Notes for Upco...', '4m'],
  ['Q2 Marketing Strategy', '12m'],
  ['Design System Migration', '1h'],
  ['Sprint Retro Action Items', '3h'],
] as const;

function MeetingNotesDemo() {
  return (
    <Sidebar.Provider collapsible='offcanvas'>
      <Sidebar>
        <Sidebar.Header>
          <Button className='w-full justify-start' variant='tertiary'>
            <HugeiconsIcon icon={Search01Icon} size={16} />
            <span>Search</span>
            <Kbd className='ml-auto text-xs'>
              <Kbd.Abbr keyValue='command' />
              <Kbd.Content>K</Kbd.Content>
            </Kbd>
          </Button>
        </Sidebar.Header>
        <Sidebar.Content>
          <Sidebar.Group>
            <Sidebar.Menu
              aria-label='Main navigation'
              defaultExpandedKeys={['meeting-chat']}
            >
              <Sidebar.MenuItem href='#' id='meeting-home' textValue='Home'>
                <Sidebar.MenuIcon>
                  <HugeiconsIcon icon={Home01Icon} size={16} />
                </Sidebar.MenuIcon>
                <Sidebar.MenuLabel>Home</Sidebar.MenuLabel>
              </Sidebar.MenuItem>
              <Sidebar.MenuItem
                href='#'
                id='meeting-shared'
                textValue='Shared with me'
              >
                <Sidebar.MenuIcon>
                  <HugeiconsIcon icon={UserMultipleIcon} size={16} />
                </Sidebar.MenuIcon>
                <Sidebar.MenuLabel>Shared with me</Sidebar.MenuLabel>
              </Sidebar.MenuItem>
              <Sidebar.MenuItem id='meeting-chat' textValue='Chat'>
                <Sidebar.MenuIcon>
                  <HugeiconsIcon icon={Notification01Icon} size={16} />
                </Sidebar.MenuIcon>
                <Sidebar.MenuLabel>
                  Chat
                  <Sidebar.MenuTrigger>
                    <Sidebar.MenuIndicator />
                  </Sidebar.MenuTrigger>
                </Sidebar.MenuLabel>
                <Sidebar.Submenu>
                  {meetingChats.map(([label, time]) => (
                    <Sidebar.MenuItem
                      href='#'
                      id={`meeting-chat-${label}`}
                      key={label}
                      textValue={label}
                    >
                      <Sidebar.MenuLabel>{label}</Sidebar.MenuLabel>
                      <Sidebar.MenuChip>{time}</Sidebar.MenuChip>
                    </Sidebar.MenuItem>
                  ))}
                </Sidebar.Submenu>
              </Sidebar.MenuItem>
            </Sidebar.Menu>
          </Sidebar.Group>
          <Sidebar.Group>
            <Sidebar.GroupLabel>Spaces</Sidebar.GroupLabel>
            <Sidebar.Menu
              aria-label='Spaces'
              defaultExpandedKeys={['meeting-my-notes']}
            >
              <Sidebar.MenuItem id='meeting-my-notes' textValue='My notes'>
                <Sidebar.MenuIcon>
                  <HugeiconsIcon icon={LibraryIcon} size={16} />
                </Sidebar.MenuIcon>
                <Sidebar.MenuLabel>
                  My notes
                  <Sidebar.MenuTrigger>
                    <Sidebar.MenuIndicator />
                  </Sidebar.MenuTrigger>
                </Sidebar.MenuLabel>
                <Sidebar.Submenu>
                  <Sidebar.MenuItem
                    href='#'
                    id='meeting-personal'
                    textValue='Personal'
                  >
                    <Sidebar.MenuLabel>Personal</Sidebar.MenuLabel>
                  </Sidebar.MenuItem>
                </Sidebar.Submenu>
              </Sidebar.MenuItem>
              <Sidebar.MenuItem
                href='#'
                id='meeting-design-team'
                textValue='Design team'
              >
                <Sidebar.MenuIcon>
                  <HugeiconsIcon icon={UserMultipleIcon} size={16} />
                </Sidebar.MenuIcon>
                <Sidebar.MenuLabel>Design team</Sidebar.MenuLabel>
              </Sidebar.MenuItem>
              <Sidebar.MenuItem id='meeting-add-folder' textValue='Add folder'>
                <Sidebar.MenuIcon>
                  <HugeiconsIcon icon={Add01Icon} size={16} />
                </Sidebar.MenuIcon>
                <Sidebar.MenuLabel className='text-muted'>
                  Add folder
                </Sidebar.MenuLabel>
              </Sidebar.MenuItem>
            </Sidebar.Menu>
          </Sidebar.Group>
        </Sidebar.Content>
        <Sidebar.Footer>
          <div className='flex items-center gap-1'>
            <Button aria-label='Notes' isIconOnly size='sm' variant='ghost'>
              <HugeiconsIcon icon={File01Icon} size={16} />
            </Button>
            <Button aria-label='People' isIconOnly size='sm' variant='ghost'>
              <HugeiconsIcon icon={UserMultipleIcon} size={16} />
            </Button>
            <Button aria-label='Teams' isIconOnly size='sm' variant='ghost'>
              <HugeiconsIcon icon={Globe02Icon} size={16} />
            </Button>
          </div>
          <Sidebar.Separator />
          <Dropdown>
            <Dropdown.Trigger
              aria-label='Sarah'
              className='w-full justify-start'
            >
              <Avatar className='size-7'>
                <Avatar.Fallback>Sarah</Avatar.Fallback>
              </Avatar>
            </Dropdown.Trigger>
            <Dropdown.Popover placement='top start'>
              <Dropdown.Menu>
                <Dropdown.Item id='profile'>Profile</Dropdown.Item>
                <Dropdown.Item id='logout' variant='danger'>
                  Log out
                </Dropdown.Item>
              </Dropdown.Menu>
            </Dropdown.Popover>
          </Dropdown>
        </Sidebar.Footer>
      </Sidebar>
      <Sidebar.Main>
        <div className='flex items-center gap-3 p-4'>
          <Sidebar.Trigger />
          <Breadcrumbs className='min-w-0'>
            <Breadcrumbs.Item className='min-w-0 font-semibold'>
              <span className='flex min-w-0 items-center gap-2 overflow-hidden'>
                <HugeiconsIcon icon={Home01Icon} size={16} />
                <span className='truncate'>Home</span>
              </span>
            </Breadcrumbs.Item>
          </Breadcrumbs>
        </div>
        <div className='p-6'>
          <p className='text-muted'>
            Meeting notes sidebar with search, spaces, and user menu. Uses
            offcanvas collapsible mode.
          </p>
        </div>
      </Sidebar.Main>
    </Sidebar.Provider>
  );
}

const agentHubNavigation = [
  ['New Agent', AiBrain01Icon, true],
  ['Search', Search01Icon, true],
  ['Home', Home01Icon, false],
  ['Activity', Activity01Icon, false],
  ['Marketplace', Globe02Icon, false],
] as const;
const agentHubChats = [
  'Refactor auth module',
  'Debug payment flow',
  'Write API docs',
  'Review PR #482',
  'Plan v3 migration',
];

function AgentHubContent() {
  const { collapsible, isMobile, isOpen } = useSidebar();
  const isCollapsed = collapsible === 'icon' && !isMobile && !isOpen;

  return (
    <>
      <Sidebar.Header>
        <div className='flex items-center justify-between px-1 py-2'>
          <div className='flex items-center gap-3'>
            <span className='flex size-6 shrink-0 items-center justify-center rounded-md bg-violet-600'>
              <HugeiconsIcon
                className='size-3.5 text-white'
                icon={AiBrain01Icon}
              />
            </span>
            <span
              className='text-foreground text-sm font-semibold'
              data-sidebar='label'
            >
              AgentHub
            </span>
          </div>
          {!isCollapsed ? (
            <div className='flex items-center' data-sidebar='label'>
              <button
                className='text-foreground hover:bg-default flex items-center gap-0.5 rounded-md p-1'
                type='button'
              >
                <HugeiconsIcon icon={Add01Icon} size={16} />
              </button>
            </div>
          ) : null}
        </div>
      </Sidebar.Header>
      <Sidebar.Content>
        <Sidebar.Group>
          <Sidebar.Menu aria-label='Main navigation'>
            {agentHubNavigation.map(([label, icon, isButton]) => (
              <Sidebar.MenuItem
                href={isButton ? undefined : '#'}
                id={`agent-hub-nav-${label}`}
                isCurrent={label === 'Home'}
                key={label}
                textValue={label}
                tooltipProps={{
                  className: 'bg-foreground text-background',
                  content: label,
                  delay: 250,
                  placement: 'right',
                }}
              >
                <Sidebar.MenuIcon>
                  <HugeiconsIcon icon={icon} size={16} />
                </Sidebar.MenuIcon>
                <Sidebar.MenuLabel>{label}</Sidebar.MenuLabel>
                {label === 'Search' ? (
                  <Sidebar.MenuChip>
                    <Kbd className='text-xs'>
                      <Kbd.Abbr keyValue='command' />
                      <Kbd.Content>K</Kbd.Content>
                    </Kbd>
                  </Sidebar.MenuChip>
                ) : null}
              </Sidebar.MenuItem>
            ))}
          </Sidebar.Menu>
        </Sidebar.Group>
        <Sidebar.Group>
          <Sidebar.GroupLabel>Recent chats</Sidebar.GroupLabel>
          <Sidebar.Menu aria-label='Recent chats'>
            {agentHubChats.map((item) => (
              <Sidebar.MenuItem
                href='#'
                id={`agent-hub-chat-${item}`}
                key={item}
                textValue={item}
              >
                <Sidebar.MenuIcon>
                  <HugeiconsIcon icon={AiBrain01Icon} size={16} />
                </Sidebar.MenuIcon>
                <Sidebar.MenuLabel>{item}</Sidebar.MenuLabel>
                <Sidebar.MenuActions className='ml-auto'>
                  <MoreActions label={item} />
                </Sidebar.MenuActions>
              </Sidebar.MenuItem>
            ))}
          </Sidebar.Menu>
        </Sidebar.Group>
        <Sidebar.Group>
          <Sidebar.GroupLabel>
            <span className='flex items-center gap-2'>
              Agents
              <Chip size='sm' variant='soft'>
                Beta
              </Chip>
            </span>
          </Sidebar.GroupLabel>
          <Sidebar.Menu aria-label='Agents'>
            {[
              ['Coder', CodeIcon],
              ['Reviewer', Task01Icon],
              ['Writer', File01Icon],
              ['Add agent', Add01Icon],
            ].map(([label, icon]) => (
              <Sidebar.MenuItem
                href={label === 'Add agent' ? undefined : '#'}
                id={`agent-hub-agent-${label}`}
                key={label as string}
                textValue={label as string}
              >
                <Sidebar.MenuIcon>
                  <HugeiconsIcon icon={icon} size={16} />
                </Sidebar.MenuIcon>
                <Sidebar.MenuLabel
                  className={label === 'Add agent' ? 'text-muted' : undefined}
                >
                  {label as string}
                </Sidebar.MenuLabel>
              </Sidebar.MenuItem>
            ))}
          </Sidebar.Menu>
        </Sidebar.Group>
        <Sidebar.Group>
          <Sidebar.GroupLabel>
            <span className='flex flex-1 items-center justify-between'>
              Workspaces
              <Dropdown>
                <Dropdown.Trigger
                  aria-label='Workspaces section actions'
                  className='text-muted hover:bg-default -mr-1 flex size-6 items-center justify-center rounded-md'
                >
                  <HugeiconsIcon icon={MoreVerticalIcon} size={16} />
                </Dropdown.Trigger>
                <Dropdown.Popover
                  className='w-48'
                  offset={6}
                  placement='right top'
                >
                  <Dropdown.Menu aria-label='Workspaces section actions'>
                    <Dropdown.Item id='show'>Show</Dropdown.Item>
                    <Dropdown.Item id='new-workspace'>
                      New workspace
                    </Dropdown.Item>
                    <Dropdown.Item id='open-library'>
                      Open in Library
                    </Dropdown.Item>
                  </Dropdown.Menu>
                </Dropdown.Popover>
              </Dropdown>
            </span>
          </Sidebar.GroupLabel>
          <Sidebar.Menu
            aria-label='Workspaces'
            defaultExpandedKeys={['agent-hub-ws-personal']}
          >
            <Sidebar.MenuItem id='agent-hub-ws-personal' textValue='Personal'>
              <Sidebar.MenuIcon>
                <HugeiconsIcon icon={UserMultipleIcon} size={16} />
              </Sidebar.MenuIcon>
              <Sidebar.MenuLabel>
                Personal
                <Sidebar.MenuTrigger>
                  <Sidebar.MenuIndicator />
                </Sidebar.MenuTrigger>
              </Sidebar.MenuLabel>
              <Sidebar.Submenu>
                {['Backend API', 'Mobile app', 'Tracker'].map((item) => (
                  <Sidebar.MenuItem
                    href='#'
                    id={`agent-hub-ws-p-${item}`}
                    isCurrent={item === 'Backend API'}
                    key={item}
                    textValue={item}
                  >
                    <Sidebar.MenuIcon>
                      <HugeiconsIcon icon={CodeIcon} size={16} />
                    </Sidebar.MenuIcon>
                    <Sidebar.MenuLabel>{item}</Sidebar.MenuLabel>
                    <Sidebar.MenuActions className='ml-auto'>
                      <MoreActions label={item} />
                    </Sidebar.MenuActions>
                  </Sidebar.MenuItem>
                ))}
              </Sidebar.Submenu>
            </Sidebar.MenuItem>
            <Sidebar.MenuItem id='agent-hub-ws-team' textValue='Team'>
              <Sidebar.MenuIcon>
                <HugeiconsIcon icon={UserMultipleIcon} size={16} />
              </Sidebar.MenuIcon>
              <Sidebar.MenuLabel>Team</Sidebar.MenuLabel>
            </Sidebar.MenuItem>
          </Sidebar.Menu>
        </Sidebar.Group>
        <Sidebar.Separator />
        <Sidebar.Group>
          <Sidebar.GroupLabel>Apps</Sidebar.GroupLabel>
          <Sidebar.Menu aria-label='Apps'>
            <Sidebar.MenuItem href='#' id='agent-hub-app-docs' textValue='Docs'>
              <Sidebar.MenuIcon>
                <HugeiconsIcon icon={BookOpen01Icon} size={16} />
              </Sidebar.MenuIcon>
              <Sidebar.MenuLabel>Docs</Sidebar.MenuLabel>
            </Sidebar.MenuItem>
            <Sidebar.MenuItem
              href='#'
              id='agent-hub-app-calendar'
              textValue='Calendar'
            >
              <Sidebar.MenuIcon>
                <HugeiconsIcon icon={Activity01Icon} size={16} />
              </Sidebar.MenuIcon>
              <Sidebar.MenuLabel>Calendar</Sidebar.MenuLabel>
            </Sidebar.MenuItem>
          </Sidebar.Menu>
        </Sidebar.Group>
      </Sidebar.Content>
      <Sidebar.Separator />
      <Sidebar.Footer className='gap-0'>
        {!isMobile ? (
          <div className='flex items-center justify-center gap-2 px-2 py-2'>
            {!isCollapsed ? (
              <Button
                className='text-muted bg-surface shadow-surface flex h-9 flex-1 gap-2 text-sm'
                size='sm'
                variant='tertiary'
              >
                <HugeiconsIcon icon={AiBrain01Icon} size={16} />
                <span>New chat</span>
                <Kbd className='text-xs'>
                  <Kbd.Abbr keyValue='command' />
                  <Kbd.Content>N</Kbd.Content>
                </Kbd>
              </Button>
            ) : null}
            <Button isIconOnly size='sm' variant='tertiary'>
              <HugeiconsIcon className='text-muted size-4' icon={Add01Icon} />
            </Button>
          </div>
        ) : null}
        <div className='px-2 pb-2'>
          <Dropdown>
            <Dropdown.Trigger className='hover:bg-default flex w-full items-center gap-2 rounded-xl px-2 py-1.5 text-left outline-none'>
              <Avatar size='sm'>
                <Avatar.Image
                  alt='Junior Garcia'
                  src='/assets/avatars/orange.jpg'
                />
                <Avatar.Fallback delayMs={600}>JG</Avatar.Fallback>
              </Avatar>
              <span
                className='text-foreground text-sm font-medium'
                data-sidebar='label'
              >
                Junior
              </span>
              <HugeiconsIcon
                className='text-muted ml-auto size-3'
                data-sidebar='label'
                icon={ArrowDown01Icon}
              />
            </Dropdown.Trigger>
            <Dropdown.Popover placement='top start'>
              <Dropdown.Menu>
                <Dropdown.Item id='agent-profile'>Profile</Dropdown.Item>
                <Dropdown.Item id='agent-settings'>Settings</Dropdown.Item>
                <Dropdown.Item id='agent-logout' variant='danger'>
                  Log out
                </Dropdown.Item>
              </Dropdown.Menu>
            </Dropdown.Popover>
          </Dropdown>
        </div>
      </Sidebar.Footer>
    </>
  );
}

function AgentHubDemo() {
  return (
    <Sidebar.Provider>
      <Sidebar style={{ '--spacing': '0.2rem' } as React.CSSProperties}>
        <AgentHubContent />
        <Sidebar.Rail />
      </Sidebar>
      <Sidebar.Main>
        <div className='flex items-center gap-3 p-4'>
          <Sidebar.Trigger />
          <Breadcrumbs className='min-w-0'>
            <Breadcrumbs.Item className='min-w-0 font-semibold'>
              <span className='flex min-w-0 items-center gap-2 overflow-hidden'>
                <HugeiconsIcon icon={CodeIcon} size={16} />
                <span className='truncate'>Backend API</span>
              </span>
            </Breadcrumbs.Item>
          </Breadcrumbs>
        </div>
        <div className='p-6'>
          <p className='text-muted'>
            Agent-focused sidebar for AI startups. Combines compact spacing,
            workspaces, recent chats, and a user dropdown menu.
          </p>
        </div>
      </Sidebar.Main>
    </Sidebar.Provider>
  );
}

const workspaceGroups = [
  {
    items: [
      ['User naming preference refactor', 'now'],
      ['Agents sidebar keyboard expe...', '12m'],
      ['Glass sidebar group by none op...', '33m'],
      ['Cloud agent error message re...', '1h'],
      ['UseApplicationProperty migrati...', undefined],
      ['Glass test timing stabilization', undefined],
      ['Flaky tests root cause', '10h'],
    ],
    label: 'acme/platform',
  },
  {
    items: [
      ['Marketing pages responsiven...', '2h'],
      ['Git & checkpoints automatic c...', '3h'],
      ['Local server update process', undefined],
      ['Performance audit for redesigne...', '1d'],
      ['Localized page SEO', undefined],
    ],
    label: 'acme/landing',
  },
  {
    items: [
      ['New page for natural language f...', '5h'],
      ['Background worker retry handling', undefined],
      ['Admin-only metric strip for inco...', undefined],
    ],
    label: 'acme/backoffice',
  },
  {
    items: [['Plugin schema verification', '2d']],
    label: 'tools/plugins',
  },
  {
    items: [
      ['Light mode settings', undefined],
      ['MCP server setup', '4h'],
    ],
    label: 'compass',
  },
] as const;

function AgentWorkspaceDemo() {
  return (
    <Sidebar.Provider>
      <Sidebar style={{ '--spacing': '0.2rem' } as React.CSSProperties}>
        <Sidebar.Header>
          <Sidebar.Menu aria-label='Top actions' className='px-1 py-2'>
            <Sidebar.MenuItem id='aw-new-agent' textValue='New Agent'>
              <Sidebar.MenuIcon>
                <HugeiconsIcon icon={AiBrain01Icon} size={16} />
              </Sidebar.MenuIcon>
              <Sidebar.MenuLabel>New Agent</Sidebar.MenuLabel>
              <Sidebar.MenuChip>
                <Kbd className='text-xs'>
                  <Kbd.Abbr keyValue='command' />
                  <Kbd.Content>N</Kbd.Content>
                </Kbd>
              </Sidebar.MenuChip>
            </Sidebar.MenuItem>
            <Sidebar.MenuItem
              href='#'
              id='aw-marketplace'
              isCurrent
              textValue='Marketplace'
            >
              <Sidebar.MenuIcon>
                <HugeiconsIcon icon={Globe02Icon} size={16} />
              </Sidebar.MenuIcon>
              <Sidebar.MenuLabel>Marketplace</Sidebar.MenuLabel>
            </Sidebar.MenuItem>
          </Sidebar.Menu>
        </Sidebar.Header>
        <Sidebar.Content>
          {workspaceGroups.map((group) => (
            <Sidebar.Group key={group.label}>
              <Sidebar.GroupLabel>
                <span className='flex flex-1 items-center justify-between'>
                  {group.label}
                  <Tooltip delay={250}>
                    <Tooltip.Trigger>
                      <button
                        aria-label={`New task in ${group.label}`}
                        className='text-muted hover:bg-default -mr-1 flex size-5 items-center justify-center rounded-md'
                        type='button'
                      >
                        <HugeiconsIcon icon={Add01Icon} size={14} />
                      </button>
                    </Tooltip.Trigger>
                    <Tooltip.Content>New task</Tooltip.Content>
                  </Tooltip>
                </span>
              </Sidebar.GroupLabel>
              <Sidebar.Menu aria-label={group.label}>
                {group.items.map(([label, timeAgo]) => (
                  <Sidebar.MenuItem
                    href='#'
                    id={`aw-${group.label}-${label}`}
                    key={label}
                    textValue={label}
                    tooltipProps={{
                      className: 'text-xs',
                      content: (
                        <div className='flex flex-col gap-1'>
                          <span className='font-medium'>{label}</span>
                          <span className='opacity-60'>{group.label}</span>
                        </div>
                      ),
                      delay: 500,
                      placement: 'right',
                    }}
                  >
                    <Sidebar.MenuIcon>
                      <span className='flex size-4 items-center justify-center'>
                        <span className='bg-muted size-1.5 rounded-full' />
                      </span>
                    </Sidebar.MenuIcon>
                    <Sidebar.MenuLabel>{label}</Sidebar.MenuLabel>
                    {timeAgo ? (
                      <Sidebar.MenuChip>
                        <span className='text-muted text-[10px] leading-none'>
                          {timeAgo}
                        </span>
                      </Sidebar.MenuChip>
                    ) : null}
                    <Sidebar.MenuActions className='ml-auto'>
                      <Sidebar.MenuAction aria-label={`Archive ${label}`}>
                        <HugeiconsIcon icon={LibraryIcon} size={14} />
                      </Sidebar.MenuAction>
                      <Sidebar.MenuAction aria-label={`Delete ${label}`}>
                        <HugeiconsIcon icon={Delete02Icon} size={14} />
                      </Sidebar.MenuAction>
                    </Sidebar.MenuActions>
                  </Sidebar.MenuItem>
                ))}
              </Sidebar.Menu>
            </Sidebar.Group>
          ))}
          <Sidebar.Group>
            <Sidebar.Menu aria-label='Utility'>
              <Sidebar.MenuItem id='aw-more' textValue='More'>
                <Sidebar.MenuIcon>
                  <HugeiconsIcon icon={MoreVerticalIcon} size={16} />
                </Sidebar.MenuIcon>
                <Sidebar.MenuLabel className='text-muted'>
                  More
                </Sidebar.MenuLabel>
              </Sidebar.MenuItem>
              <Sidebar.MenuItem
                href='#'
                id='aw-open-workspace'
                textValue='Open Workspace'
              >
                <Sidebar.MenuIcon>
                  <HugeiconsIcon icon={FolderOpenIcon} size={16} />
                </Sidebar.MenuIcon>
                <Sidebar.MenuLabel>Open Workspace</Sidebar.MenuLabel>
              </Sidebar.MenuItem>
            </Sidebar.Menu>
          </Sidebar.Group>
        </Sidebar.Content>
        <Sidebar.Footer className='px-2 pt-0 pb-2'>
          <Dropdown>
            <Dropdown.Trigger className='hover:bg-default flex w-full items-center gap-2 rounded-xl px-2 py-1.5 text-left outline-none'>
              <Avatar size='sm'>
                <Avatar.Image
                  alt='Alex Chen'
                  src='/assets/avatars/blue-light.jpg'
                />
                <Avatar.Fallback delayMs={600}>AC</Avatar.Fallback>
              </Avatar>
              <div className='flex min-w-0 flex-col' data-sidebar='label'>
                <span className='text-foreground truncate text-sm leading-tight font-medium'>
                  Alex Chen
                </span>
                <span className='text-muted truncate text-xs leading-tight'>
                  Hero Labs
                </span>
              </div>
            </Dropdown.Trigger>
            <Dropdown.Popover placement='top start'>
              <Dropdown.Menu>
                <Dropdown.Item id='aw-profile'>Profile</Dropdown.Item>
                <Dropdown.Item id='aw-settings'>Settings</Dropdown.Item>
                <Dropdown.Item id='aw-team'>Create Team</Dropdown.Item>
                <Dropdown.Item id='aw-logout' variant='danger'>
                  Log out
                </Dropdown.Item>
              </Dropdown.Menu>
            </Dropdown.Popover>
          </Dropdown>
        </Sidebar.Footer>
        <Sidebar.Rail />
      </Sidebar>
      <Sidebar.Main>
        <div className='flex items-center gap-3 p-4'>
          <Sidebar.Trigger />
          <Breadcrumbs className='min-w-0'>
            <Breadcrumbs.Item className='min-w-0 font-semibold'>
              <span className='flex min-w-0 items-center gap-2 overflow-hidden'>
                <HugeiconsIcon icon={CodeIcon} size={16} />
                <span className='truncate'>acme/platform</span>
              </span>
            </Breadcrumbs.Item>
          </Breadcrumbs>
        </div>
        <div className='p-6'>
          <p className='text-muted'>
            Workspace sidebar with agent tasks grouped by repository. Mirrors
            the pattern used by AI coding tools.
          </p>
        </div>
      </Sidebar.Main>
    </Sidebar.Provider>
  );
}
export const Default: Story = {
  render: () => <Demo nested title='Namespace' />,
};
export const RightSide: Story = {
  render: () => (
    <Demo
      description='Main content area with the sidebar attached to the right. Resize to mobile to see the Sheet open from the right.'
      nested
      side='right'
      title='Namespace'
    />
  ),
};
export const RightSideOffcanvas: Story = {
  render: () => (
    <Demo
      collapsible='offcanvas'
      description='Right-side offcanvas sidebar. Use the trigger or rail to collapse the sidebar off the right edge. Resize to mobile to verify the Sheet also opens from the right.'
      nested
      side='right'
      title='Namespace'
    />
  ),
};
export const WithGroups: Story = {
  render: () => <WithGroupsDemo />,
};
export const CollapsibleGroups: Story = {
  render: () => <CollapsibleGroupsDemo />,
};
export const Collapsible: Story = {
  render: () => <CollapsibleDemo />,
};
export const ReducedMotion: Story = {
  render: () => <ReducedMotionDemo />,
};
export const FloatingVariant: Story = {
  render: () => <FloatingVariantDemo />,
};
export const WithAvatar: Story = {
  render: () => <WithAvatarDemo />,
};
export const InsetVariant: Story = { render: () => <InsetVariantDemo /> };
export const IconOnly: Story = {
  render: () => <IconOnlyDemo />,
};
export const Complex: Story = {
  render: () => <ComplexDemo />,
};
export const CompactWithUserMenu: Story = {
  render: () => <CompactWithUserMenuDemo />,
};
export const AgentHub: Story = {
  render: () => <AgentHubDemo />,
};
export const AgentWorkspace: Story = {
  render: () => <AgentWorkspaceDemo />,
};
export const MeetingNotes: Story = {
  render: () => <MeetingNotesDemo />,
};
