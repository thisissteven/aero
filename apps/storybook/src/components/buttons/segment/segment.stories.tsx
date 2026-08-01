import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import type { Key } from 'react-aria-components';

import { Icon } from '@/icon';

import { Segment } from './index';

const meta = {
  component: Segment,
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
  title: 'Components/Buttons/Segment',
} satisfies Meta<typeof Segment>;
export default meta;
type Story = StoryObj<any>;

const items = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'analytics', label: 'Analytics' },
  { id: 'reports', label: 'Reports' },
  { id: 'settings', label: 'Settings' },
];
const BasicItems = ({ separators = false }: { separators?: boolean }) => (
  <>
    {items.map((item) => (
      <Segment.Item id={item.id} key={item.id}>
        {separators ? <Segment.Separator /> : null}
        {item.label}
      </Segment.Item>
    ))}
  </>
);

export const Default: Story = {
  render: () => (
    <Segment defaultSelectedKey='dashboard'>
      <BasicItems />
    </Segment>
  ),
};
export const Sizes: Story = {
  render: () => (
    <div className='flex flex-col items-start gap-6'>
      {(['sm', 'md', 'lg'] as const).map((size) => (
        <div className='flex flex-col gap-2' key={size}>
          <span className='text-muted text-xs'>{size}</span>
          <Segment defaultSelectedKey='dashboard' size={size}>
            <BasicItems />
          </Segment>
        </div>
      ))}
    </div>
  ),
};
export const Disabled: Story = {
  render: () => (
    <Segment isDisabled defaultSelectedKey='dashboard'>
      <BasicItems />
    </Segment>
  ),
};
export const DisabledItem: Story = {
  render: () => (
    <Segment defaultSelectedKey='dashboard'>
      <Segment.Item id='dashboard'>Dashboard</Segment.Item>
      <Segment.Item isDisabled id='analytics'>
        Analytics
      </Segment.Item>
      <Segment.Item id='reports'>Reports</Segment.Item>
    </Segment>
  ),
};

function ControlledDemo() {
  const [selected, setSelected] = useState<Key>('analytics');
  return (
    <div className='flex flex-col items-start gap-4'>
      <Segment selectedKey={selected} onSelectionChange={setSelected}>
        <BasicItems />
      </Segment>
      <span className='text-muted text-sm'>
        Selected:{' '}
        <strong className='text-foreground'>{String(selected)}</strong>
      </span>
    </div>
  );
}
export const Controlled: Story = { render: () => <ControlledDemo /> };

const iconItems = [
  { icon: 'lucide:layout-dashboard', id: 'dashboard', label: 'Dashboard' },
  { icon: 'lucide:chart-column', id: 'analytics', label: 'Analytics' },
  { icon: 'lucide:users', id: 'team', label: 'Team' },
  { icon: 'lucide:settings', id: 'settings', label: 'Settings' },
];
export const WithIcons: Story = {
  render: () => (
    <Segment defaultSelectedKey='dashboard'>
      {iconItems.map((item) => (
        <Segment.Item id={item.id} key={item.id}>
          <Icon icon={item.icon} />
          {item.label}
        </Segment.Item>
      ))}
    </Segment>
  ),
};
export const ThemeSwitcher: Story = {
  render: () => (
    <Segment defaultSelectedKey='system' size='sm'>
      <Segment.Item aria-label='Light' id='light'>
        <Icon icon='lucide:sun' />
      </Segment.Item>
      <Segment.Item aria-label='Dark' id='dark'>
        <Icon icon='lucide:moon' />
      </Segment.Item>
      <Segment.Item aria-label='System' id='system'>
        <Icon icon='lucide:monitor' />
      </Segment.Item>
    </Segment>
  ),
};
export const TwoItems: Story = {
  render: () => (
    <Segment defaultSelectedKey='monthly' size='sm'>
      <Segment.Item id='monthly'>Monthly</Segment.Item>
      <Segment.Item id='yearly'>Yearly</Segment.Item>
    </Segment>
  ),
};
export const Ghost: Story = {
  render: () => (
    <Segment defaultSelectedKey='mtd' size='sm' variant='ghost'>
      {['1W', '4W', '1Y', 'MTD', 'QTD', 'YTD', 'ALL'].map((label) => (
        <Segment.Item id={label.toLowerCase()} key={label}>
          {label}
        </Segment.Item>
      ))}
    </Segment>
  ),
};
export const IconExpand: Story = {
  render: () => (
    <Segment defaultSelectedKey='meetings' variant='ghost'>
      {[
        { icon: 'lucide:house', id: 'home', label: 'Home' },
        { icon: 'lucide:message-circle', id: 'chat', label: 'Chat' },
        { icon: 'lucide:video', id: 'meetings', label: 'Meetings' },
        { icon: 'lucide:inbox', id: 'inbox', label: 'Inbox' },
      ].map((item) => (
        <Segment.Item
          className='w-auto'
          id={item.id}
          key={item.id}
          style={{ gap: 0 }}
        >
          {({ isSelected }) => (
            <>
              <Icon icon={item.icon} />
              <span
                className='inline-grid transition-all duration-200'
                style={{
                  gridTemplateColumns: isSelected ? '1fr' : '0fr',
                  minWidth: 0,
                  opacity: isSelected ? 1 : 0,
                }}
              >
                <span
                  className='overflow-hidden whitespace-nowrap transition-[padding] duration-200'
                  style={{
                    minWidth: 0,
                    paddingInlineStart: isSelected ? '.375rem' : 0,
                  }}
                >
                  {item.label}
                </span>
              </span>
            </>
          )}
        </Segment.Item>
      ))}
    </Segment>
  ),
};
export const WithSeparators: Story = {
  render: () => (
    <Segment defaultSelectedKey='dashboard'>
      <BasicItems separators />
    </Segment>
  ),
};
