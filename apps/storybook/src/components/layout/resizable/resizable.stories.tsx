import type { Meta, StoryObj } from '@storybook/react';
import { useRef, useState } from 'react';

import { Button } from '@/components/buttons/button';

import type { PanelImperativeHandle } from './index';
import { Resizable } from './index';

const meta = {
  component: Resizable,
  parameters: { layout: 'padded' },
  tags: ['autodocs'],
  title: 'Components/Layout/Resizable',
} satisfies Meta<typeof Resizable>;
export default meta;
type Story = StoryObj<typeof meta>;

const Content = ({
  children,
  className = '',
}: {
  children: string;
  className?: string;
}) => (
  <div className={`flex h-full items-center justify-center p-6 ${className}`}>
    <span className='text-sm font-medium'>{children}</span>
  </div>
);

export const Default: Story = {
  render: () => (
    <div className='border-border bg-background h-[400px] w-full overflow-hidden rounded-xl border'>
      <Resizable orientation='horizontal'>
        <Resizable.Panel
          defaultSize='180px'
          groupResizeBehavior='preserve-pixel-size'
          maxSize='260px'
          minSize='140px'
        >
          <Content>Sidebar</Content>
        </Resizable.Panel>
        <Resizable.Handle />
        <Resizable.Panel minSize={30}>
          <Content className='text-foreground'>Main content</Content>
        </Resizable.Panel>
      </Resizable>
    </div>
  ),
};

export const VerticalStory: Story = {
  name: 'Vertical',
  render: () => (
    <div className='border-border bg-background h-[400px] w-full overflow-hidden rounded-xl border'>
      <Resizable orientation='vertical'>
        <Resizable.Panel defaultSize={60} minSize={20}>
          <Content className='text-foreground'>Top</Content>
        </Resizable.Panel>
        <Resizable.Handle />
        <Resizable.Panel defaultSize={40} minSize={20}>
          <Content>Bottom</Content>
        </Resizable.Panel>
      </Resizable>
    </div>
  ),
};

export const Types: Story = {
  render: () => (
    <div className='flex w-full flex-col gap-6'>
      {(['line', 'drag', 'pill', 'handle'] as const).map((type) => (
        <div className='flex flex-col gap-2' key={type}>
          <span className='text-muted text-xs font-medium tracking-wide uppercase'>
            {type}
          </span>
          <div className='border-border bg-background h-[200px] w-full overflow-hidden rounded-xl border'>
            <Resizable>
              <Resizable.Panel defaultSize={50} minSize={20}>
                <Content className='bg-surface text-surface-foreground'>
                  Left
                </Content>
              </Resizable.Panel>
              <Resizable.Handle type={type} />
              <Resizable.Panel defaultSize={50} minSize={20}>
                <Content className='text-foreground'>Right</Content>
              </Resizable.Panel>
            </Resizable>
          </div>
        </div>
      ))}
    </div>
  ),
};

export const Variants: Story = {
  render: () => (
    <div className='flex w-full flex-col gap-6'>
      {[
        {
          bg: 'bg-background',
          fg: 'text-foreground',
          label: 'primary — background',
          variant: 'primary',
        },
        {
          bg: 'bg-surface',
          fg: 'text-surface-foreground',
          label: 'secondary — surface',
          variant: 'secondary',
        },
        {
          bg: 'bg-surface-secondary',
          fg: 'text-surface-secondary-foreground',
          label: 'tertiary — surface secondary',
          variant: 'tertiary',
        },
      ].map((item) => (
        <div className='flex flex-col gap-2' key={item.variant}>
          <span className='text-muted text-xs font-medium tracking-wide uppercase'>
            {item.label}
          </span>
          <div
            className={`${item.bg} border-border h-[180px] w-full overflow-hidden rounded-xl border`}
          >
            <Resizable>
              <Resizable.Panel defaultSize={50}>
                <Content className={item.fg}>Left</Content>
              </Resizable.Panel>
              <Resizable.Handle
                variant={item.variant as 'primary' | 'secondary' | 'tertiary'}
              />
              <Resizable.Panel defaultSize={50}>
                <Content className={item.fg}>Right</Content>
              </Resizable.Panel>
            </Resizable>
          </div>
        </div>
      ))}
    </div>
  ),
};

export const Nested: Story = {
  render: () => (
    <div className='border-border bg-background h-[500px] w-full overflow-hidden rounded-xl border'>
      <Resizable orientation='horizontal'>
        <Resizable.Panel defaultSize={25} minSize={15}>
          <Content className='bg-surface text-surface-foreground'>
            Sidebar
          </Content>
        </Resizable.Panel>
        <Resizable.Handle />
        <Resizable.Panel defaultSize={75}>
          <Resizable orientation='vertical'>
            <Resizable.Panel defaultSize={65} minSize={20}>
              <Content className='text-foreground'>Editor</Content>
            </Resizable.Panel>
            <Resizable.Handle />
            <Resizable.Panel defaultSize={35} minSize={15}>
              <Content className='bg-surface-secondary text-surface-secondary-foreground'>
                Terminal
              </Content>
            </Resizable.Panel>
          </Resizable>
        </Resizable.Panel>
      </Resizable>
    </div>
  ),
};

export const WithCollapse: Story = {
  render: function Demo() {
    const panelRef = useRef<PanelImperativeHandle | null>(null);
    const [collapsed, setCollapsed] = useState(false);
    return (
      <div className='flex w-full flex-col gap-3'>
        <div className='flex items-center gap-2'>
          <Button
            size='sm'
            variant='secondary'
            onPress={() =>
              collapsed
                ? panelRef.current?.expand()
                : panelRef.current?.collapse()
            }
          >
            {collapsed ? 'Expand' : 'Collapse'} sidebar
          </Button>
        </div>
        <div className='border-border bg-background h-[400px] w-full overflow-hidden rounded-xl border'>
          <Resizable orientation='horizontal'>
            <Resizable.Panel
              collapsible
              collapsedSize={0}
              defaultSize={25}
              handleRef={panelRef}
              id='sidebar'
              minSize={15}
              onCollapse={() => setCollapsed(true)}
              onExpand={() => setCollapsed(false)}
            >
              <Content className='bg-surface text-surface-foreground'>
                Sidebar
              </Content>
            </Resizable.Panel>
            <Resizable.Handle />
            <Resizable.Panel defaultSize={75} id='main'>
              <Content className='text-foreground'>Main content</Content>
            </Resizable.Panel>
          </Resizable>
        </div>
      </div>
    );
  },
};

export const WithIndicator: Story = {
  render: () => (
    <div className='border-border bg-background h-[400px] w-full overflow-hidden rounded-xl border'>
      <Resizable orientation='horizontal'>
        <Resizable.Panel defaultSize={40} minSize={15}>
          <Content className='bg-surface text-surface-foreground'>Left</Content>
        </Resizable.Panel>
        <Resizable.Handle type='line' withIndicator />
        <Resizable.Panel defaultSize={60}>
          <Content className='text-foreground'>Right</Content>
        </Resizable.Panel>
      </Resizable>
    </div>
  ),
};
