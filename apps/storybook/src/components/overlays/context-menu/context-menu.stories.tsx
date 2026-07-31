import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';

import { Header, Kbd } from '@aero/ui';

import { Icon } from '@/icon';

import { ContextMenu } from './index';

const meta = {
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
  title: 'Components/Overlays/ContextMenu',
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;
const Trigger = ({ children = 'Right-click here' }: { children?: string }) => (
  <ContextMenu.Trigger>
    <div className='border-border text-muted flex h-48 w-80 items-center justify-center rounded-xl border border-dashed text-sm select-none'>
      {children}
    </div>
  </ContextMenu.Trigger>
);
const Item = ({
  disabled = false,
  label,
  shortcut,
}: {
  disabled?: boolean;
  label: string;
  shortcut?: string;
}) => (
  <ContextMenu.Item
    isDisabled={disabled}
    id={label.toLowerCase().replaceAll(' ', '-')}
    textValue={label}
  >
    <span>{label}</span>
    {shortcut ? (
      <Kbd className='ms-auto' variant='light'>
        {shortcut}
      </Kbd>
    ) : null}
  </ContextMenu.Item>
);
function DefaultDemo() {
  return (
    <ContextMenu>
      <Trigger />
      <ContextMenu.Popover>
        <ContextMenu.Menu>
          <Item label='Back' shortcut='⌘ [' />
          <Item disabled label='Forward' shortcut='⌘ ]' />
          <Item label='Reload' shortcut='⌘ R' />
          <ContextMenu.Separator />
          <Item label='View Page Source' />
          <Item label='Inspect' />
        </ContextMenu.Menu>
      </ContextMenu.Popover>
    </ContextMenu>
  );
}
export const Default: Story = { render: () => <DefaultDemo /> };
function Sections() {
  return (
    <ContextMenu>
      <Trigger />
      <ContextMenu.Popover>
        <ContextMenu.Menu>
          <ContextMenu.Section>
            <Header>Edit</Header>
            {[
              ['Cut', 'lucide:scissors', '⌘ X'],
              ['Copy', 'lucide:copy', '⌘ C'],
              ['Paste', 'lucide:clipboard', '⌘ V'],
            ].map(([label, icon, key]) => (
              <ContextMenu.Item id={label} key={label} textValue={label}>
                <Icon className='text-muted size-4' icon={icon!} />
                <span>{label}</span>
                <Kbd className='ms-auto' variant='light'>
                  {key}
                </Kbd>
              </ContextMenu.Item>
            ))}
          </ContextMenu.Section>
          <ContextMenu.Separator />
          <ContextMenu.Section>
            <Header>Manage</Header>
            {[
              ['Rename', 'lucide:pencil'],
              ['Copy Link', 'lucide:link'],
              ['Delete', 'lucide:trash-2'],
            ].map(([label, icon]) => (
              <ContextMenu.Item
                id={label}
                key={label}
                textValue={label}
                variant={label === 'Delete' ? 'danger' : undefined}
              >
                <Icon className='size-4' icon={icon!} />
                <span>{label}</span>
              </ContextMenu.Item>
            ))}
          </ContextMenu.Section>
        </ContextMenu.Menu>
      </ContextMenu.Popover>
    </ContextMenu>
  );
}
export const WithSections: Story = { render: () => <Sections /> };
function Submenus() {
  const [bookmarks, setBookmarks] = useState(new Set(['bookmarks']));
  const [person, setPerson] = useState(new Set(['junior']));
  return (
    <ContextMenu>
      <Trigger />
      <ContextMenu.Popover>
        <ContextMenu.Menu>
          <Item label='Back' shortcut='⌘ [' />
          <Item disabled label='Forward' shortcut='⌘ ]' />
          <Item label='Reload' shortcut='⌘ R' />
          <ContextMenu.SubmenuTrigger>
            <ContextMenu.Item id='more-tools' textValue='More Tools'>
              <span>More Tools</span>
              <ContextMenu.SubmenuIndicator />
            </ContextMenu.Item>
            <ContextMenu.Popover>
              <ContextMenu.Menu>
                <Item label='Save Page As…' shortcut='⌘ S' />
                <Item label='Create Shortcut…' />
                <Item label='Name Window…' />
                <ContextMenu.Separator />
                <Item label='Developer Tools' />
              </ContextMenu.Menu>
            </ContextMenu.Popover>
          </ContextMenu.SubmenuTrigger>
          <ContextMenu.Separator />
          <ContextMenu.Section
            selectedKeys={bookmarks}
            selectionMode='multiple'
            onSelectionChange={setBookmarks}
          >
            <ContextMenu.Item id='bookmarks' textValue='Show Bookmarks'>
              <ContextMenu.ItemIndicator />
              <span>Show Bookmarks</span>
            </ContextMenu.Item>
            <ContextMenu.Item id='urls' textValue='Show Full URLs'>
              <ContextMenu.ItemIndicator />
              <span>Show Full URLs</span>
            </ContextMenu.Item>
          </ContextMenu.Section>
          <ContextMenu.Separator />
          <ContextMenu.Section
            selectedKeys={person}
            selectionMode='single'
            onSelectionChange={setPerson}
          >
            <Header>People</Header>
            {['junior', 'andres', 'volodymyr', 'diego'].map((name) => (
              <ContextMenu.Item id={name} key={name} textValue={name}>
                <ContextMenu.ItemIndicator type='dot' />
                <span className='capitalize'>{name}</span>
              </ContextMenu.Item>
            ))}
          </ContextMenu.Section>
        </ContextMenu.Menu>
      </ContextMenu.Popover>
    </ContextMenu>
  );
}
export const WithSubmenus: Story = { render: () => <Submenus /> };
function Selection() {
  const [selected, setSelected] = useState(new Set(['grid']));
  return (
    <ContextMenu>
      <Trigger children='Right-click to change view' />
      <ContextMenu.Popover>
        <ContextMenu.Menu
          selectedKeys={selected}
          selectionMode='single'
          onSelectionChange={setSelected}
        >
          <ContextMenu.Section>
            <Header>View</Header>
            {['grid', 'list', 'columns'].map((view) => (
              <ContextMenu.Item id={view} key={view} textValue={view}>
                <ContextMenu.ItemIndicator />
                <span className='capitalize'>{view}</span>
              </ContextMenu.Item>
            ))}
          </ContextMenu.Section>
        </ContextMenu.Menu>
      </ContextMenu.Popover>
    </ContextMenu>
  );
}
export const WithSelection: Story = { render: () => <Selection /> };
function ControlledDemo() {
  const [open, setOpen] = useState(false);
  return (
    <div className='flex flex-col items-center gap-4'>
      <p className='text-muted text-sm'>Menu is {open ? 'open' : 'closed'}</p>
      <ContextMenu open={open} onOpenChange={setOpen}>
        <Trigger children='Right-click here (controlled)' />
        <ContextMenu.Popover>
          <ContextMenu.Menu>
            {[1, 2, 3].map((x) => (
              <Item key={x} label={`Action ${x}`} />
            ))}
          </ContextMenu.Menu>
        </ContextMenu.Popover>
      </ContextMenu>
    </div>
  );
}
export const Controlled: Story = { render: () => <ControlledDemo /> };
export const Disabled: Story = {
  render: () => (
    <ContextMenu isDisabled>
      <Trigger children='Right-click here (disabled)' />
      <ContextMenu.Popover>
        <ContextMenu.Menu>
          <Item label='Action 1' />
        </ContextMenu.Menu>
      </ContextMenu.Popover>
    </ContextMenu>
  ),
};
export const LongPress: Story = {
  parameters: {
    docs: {
      description: {
        story:
          'On touch devices, long-pressing (500ms) opens the context menu. Moving more than 10px cancels.',
      },
    },
  },
  render: () => (
    <ContextMenu>
      <Trigger children='Long-press here (touch devices)' />
      <ContextMenu.Popover>
        <ContextMenu.Menu>
          <Item label='Select' />
          <Item label='Select All' />
          <ContextMenu.Separator />
          <Item label='Cut' />
          <Item label='Copy' />
          <Item label='Paste' />
        </ContextMenu.Menu>
      </ContextMenu.Popover>
    </ContextMenu>
  ),
};
