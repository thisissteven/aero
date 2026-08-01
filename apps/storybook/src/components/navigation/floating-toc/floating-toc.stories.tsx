import type { Meta, StoryObj } from '@storybook/react';
import type { CSSProperties } from 'react';
import { useMemo, useState } from 'react';
import {
  ListBox,
  ListBoxItem,
  ListLayout,
  Virtualizer,
} from 'react-aria-components';

import { Button } from '@aero/ui/button';

import { FloatingToc } from './index';

const sections = [
  'Overview',
  'Installation',
  'Quick start',
  'Configuration',
  'API reference',
  'Troubleshooting',
].map((label) => ({ id: label.toLowerCase().replaceAll(' ', '-'), label }));
const hierarchy = [
  ['s1', 'Design principles', 1],
  ['s1-1', 'Composability', 2],
  ['s1-2', 'Accessibility first', 2],
  ['s2', 'Getting started', 1],
  ['s2-1', 'Installation', 2],
  ['s2-2', 'Project setup', 2],
  ['s3', 'Core components', 1],
  ['s3-1', 'Layout primitives', 2],
  ['s3-2', 'Interactive elements', 2],
  ['s3-2-1', 'Buttons & actions', 3],
  ['s3-2-2', 'Form controls', 3],
  ['s3-3', 'Data display', 2],
  ['s3-3-1', 'Tables', 3],
  ['s3-3-2', 'Charts', 3],
  ['s4', 'Theming', 1],
  ['s4-1', 'Color tokens', 2],
  ['s4-2', 'Dark mode', 2],
  ['s5', 'Advanced patterns', 1],
  ['s6', 'Changelog', 1],
].map(([id, label, level]) => ({
  id: String(id),
  label: String(label),
  level: Number(level),
}));
const article = [
  [
    'intro',
    'Introduction',
    'Welcome to the documentation. This guide covers everything you need to get started with the library, from installation to advanced usage patterns.',
  ],
  [
    'setup',
    'Getting Started',
    'Install the package using your preferred package manager. The library supports npm, yarn, and pnpm out of the box with zero configuration needed.',
  ],
  [
    'api',
    'API Reference',
    'The API provides a clean interface for building composable components. Each component follows the compound pattern, giving you full control over rendering.',
  ],
  [
    'examples',
    'Examples',
    'Browse through real-world examples to see how the components work in production scenarios. Each example is fully functional and can be copied directly.',
  ],
  [
    'faq',
    'FAQ',
    'Find answers to the most commonly asked questions about the library, including migration guides, browser support, and accessibility compliance.',
  ],
].map(([id, label, text]) => ({ id, label, text }));

const meta = {
  component: FloatingToc,
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
  title: 'Components/Navigation/FloatingTOC',
} satisfies Meta<typeof FloatingToc>;
export default meta;
type Story = StoryObj<any>;

function Basic({
  placement = 'right',
  triggerMode = 'hover',
}: {
  placement?: 'left' | 'right';
  triggerMode?: 'hover' | 'press';
}) {
  const [active, setActive] = useState('overview');
  return (
    <div className='px-10 py-24'>
      <FloatingToc placement={placement} triggerMode={triggerMode}>
        <FloatingToc.Trigger aria-label='Table of contents'>
          {sections.map((item) => (
            <FloatingToc.Bar active={item.id === active} key={item.id} />
          ))}
        </FloatingToc.Trigger>
        <FloatingToc.Content>
          {sections.map((item) => (
            <FloatingToc.Item
              active={item.id === active}
              key={item.id}
              onClick={() => setActive(item.id)}
            >
              {item.label}
            </FloatingToc.Item>
          ))}
        </FloatingToc.Content>
      </FloatingToc>
    </div>
  );
}
export const Default: Story = { render: () => <Basic /> };
export const LeftPlacement: Story = {
  render: () => <Basic placement='left' />,
};

function InPage() {
  const [active, setActive] = useState('intro');
  return (
    <div className='border-border relative h-[420px] w-[640px] overflow-hidden rounded-xl border'>
      <div className='h-full overflow-auto p-8 pr-16'>
        {article.map((item) => (
          <div className='mb-10 last:mb-0' key={item.id}>
            <h2
              className={`text-base font-semibold ${item.id === active ? 'text-accent' : ''}`}
            >
              {item.label}
            </h2>
            <p className='text-muted mt-2 text-sm leading-relaxed'>
              {item.text}
            </p>
          </div>
        ))}
      </div>
      <div className='absolute top-1/2 right-3 -translate-y-1/2'>
        <FloatingToc>
          <FloatingToc.Trigger aria-label='Table of contents'>
            {article.map((item) => (
              <FloatingToc.Bar active={item.id === active} key={item.id} />
            ))}
          </FloatingToc.Trigger>
          <FloatingToc.Content>
            {article.map((item) => (
              <FloatingToc.Item
                active={item.id === active}
                key={item.id}
                onClick={() => setActive(item.id)}
              >
                {item.label}
              </FloatingToc.Item>
            ))}
          </FloatingToc.Content>
        </FloatingToc>
      </div>
    </div>
  );
}
export const InPageContext: Story = { render: () => <InPage /> };

function ControlledDemo() {
  const [open, setOpen] = useState(false),
    [active, setActive] = useState('overview');
  return (
    <div className='px-10 py-24'>
      <div className='mb-6 flex items-center gap-3'>
        <Button
          onPress={() => setOpen((value) => !value)}
          size='sm'
          variant='outline'
        >
          {open ? 'Close' : 'Open'} TOC
        </Button>
        <span className='text-muted inline-block w-24 text-sm'>
          State: <strong>{open ? 'open' : 'closed'}</strong>
        </span>
      </div>
      <FloatingToc onOpenChange={setOpen} open={open}>
        <FloatingToc.Trigger aria-label='Table of contents'>
          {sections.map((item) => (
            <FloatingToc.Bar active={item.id === active} key={item.id} />
          ))}
        </FloatingToc.Trigger>
        <FloatingToc.Content>
          {sections.map((item) => (
            <FloatingToc.Item
              active={item.id === active}
              key={item.id}
              onClick={() => setActive(item.id)}
            >
              {item.label}
            </FloatingToc.Item>
          ))}
        </FloatingToc.Content>
      </FloatingToc>
    </div>
  );
}
export const Controlled: Story = { render: () => <ControlledDemo /> };

function Delays() {
  const [active, setActive] = useState('overview');
  return (
    <div className='flex items-center gap-12 px-10 py-24'>
      {[
        { closeDelay: 0, label: 'Instant', openDelay: 0 },
        { closeDelay: 300, label: 'Default (200/300)', openDelay: 200 },
        { closeDelay: 500, label: 'Slow (600/500)', openDelay: 600 },
      ].map((config) => (
        <div className='flex flex-col items-center gap-3' key={config.label}>
          <span className='text-muted text-xs'>{config.label}</span>
          <FloatingToc
            closeDelay={config.closeDelay}
            openDelay={config.openDelay}
          >
            <FloatingToc.Trigger aria-label='Table of contents'>
              {sections.map((item) => (
                <FloatingToc.Bar active={item.id === active} key={item.id} />
              ))}
            </FloatingToc.Trigger>
            <FloatingToc.Content>
              {sections.map((item) => (
                <FloatingToc.Item
                  active={item.id === active}
                  key={item.id}
                  onClick={() => setActive(item.id)}
                >
                  {item.label}
                </FloatingToc.Item>
              ))}
            </FloatingToc.Content>
          </FloatingToc>
        </div>
      ))}
    </div>
  );
}
export const CustomDelays: Story = { render: () => <Delays /> };
export const LeftAlignedBars: Story = {
  render: () => <Basic placement='left' />,
};

function HierarchicalDemo({ press = false }: { press?: boolean }) {
  const [active, setActive] = useState(press ? 's1' : 's3-2-1');
  return (
    <div className='px-10 py-10'>
      <FloatingToc
        placement={press ? 'left' : 'right'}
        triggerMode={press ? 'press' : 'hover'}
      >
        <FloatingToc.Trigger aria-label='Table of contents'>
          {hierarchy.map((item) => (
            <FloatingToc.Bar
              active={item.id === active}
              key={item.id}
              level={item.level}
            />
          ))}
        </FloatingToc.Trigger>
        <FloatingToc.Content>
          <span className='text-muted mb-1 block px-3 py-1 text-[10px] font-semibold tracking-wider uppercase'>
            Contents
          </span>
          {hierarchy.map((item) => (
            <FloatingToc.Item
              active={item.id === active}
              key={item.id}
              level={item.level}
              onClick={() => setActive(item.id)}
            >
              {item.label}
            </FloatingToc.Item>
          ))}
        </FloatingToc.Content>
      </FloatingToc>
    </div>
  );
}
export const PressMode: Story = { render: () => <HierarchicalDemo press /> };
export const Hierarchical: Story = { render: () => <HierarchicalDemo /> };

function PressInPage() {
  const [active, setActive] = useState('s3');
  return (
    <div className='border-border relative h-[520px] w-[640px] overflow-hidden rounded-xl border'>
      <div className='h-full overflow-auto p-8 pl-16'>
        {hierarchy
          .filter((item) => item.level === 1)
          .map((item) => (
            <div className='mb-10 last:mb-0' key={item.id}>
              <h2
                className={`text-base font-semibold ${item.id === active ? 'text-accent' : ''}`}
              >
                {item.label}
              </h2>
              <p className='text-muted mt-2 text-sm leading-relaxed'>
                Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do
                eiusmod tempor incididunt ut labore et dolore magna aliqua.
              </p>
            </div>
          ))}
      </div>
      <div className='absolute top-1/2 left-3 -translate-y-1/2'>
        <FloatingToc placement='left' triggerMode='press'>
          <FloatingToc.Trigger aria-label='Table of contents'>
            {hierarchy.map((item) => (
              <FloatingToc.Bar
                active={item.id === active}
                key={item.id}
                level={item.level}
              />
            ))}
          </FloatingToc.Trigger>
          <FloatingToc.Content>
            <span className='text-muted mb-1 block px-3 py-1 text-[10px] font-semibold tracking-wider uppercase'>
              Contents
            </span>
            {hierarchy.map((item) => (
              <FloatingToc.Item
                active={item.id === active}
                key={item.id}
                level={item.level}
                onClick={() => setActive(item.id)}
              >
                {item.label}
              </FloatingToc.Item>
            ))}
          </FloatingToc.Content>
        </FloatingToc>
      </div>
    </div>
  );
}
export const PressModeInPage: Story = { render: () => <PressInPage /> };

const manyItems = (() => {
  const sectionNames = [
    'Introduction',
    'Architecture',
    'Components',
    'State Management',
    'Routing',
    'Data Fetching',
    'Authentication',
    'Authorization',
    'Testing',
    'Performance',
    'Deployment',
    'Monitoring',
    'Error Handling',
    'Logging',
    'Caching',
    'Security',
    'Accessibility',
    'Internationalization',
    'Theming',
    'Animation',
  ];
  const items: Array<{ id: string; label: string; level: number }> = [];
  let index = 0;
  for (const [sectionIndex, label] of sectionNames.entries()) {
    items.push({ id: `v-${index++}`, label, level: 1 });
    const childCount = 2 + (sectionIndex % 3);
    for (let childIndex = 0; childIndex < childCount; childIndex++) {
      items.push({
        id: `v-${index++}`,
        label: `${label} — Part ${childIndex + 1}`,
        level: 2,
      });
      if (childIndex % 2 === 0)
        items.push({
          id: `v-${index++}`,
          label: 'Implementation details',
          level: 3,
        });
    }
  }
  return items;
})();
const topLevelItems = manyItems.filter((item) => item.level === 1);
const parentById = (() => {
  const parents = new Map<string, string>();
  let parent = '';
  for (const item of manyItems) {
    if (item.level === 1) parent = item.id;
    parents.set(item.id, parent);
  }
  return parents;
})();
function LargeList() {
  const [active, setActive] = useState(manyItems[0]?.id ?? 'v-0');
  const selectedKeys = useMemo(() => new Set([active]), [active]);
  const activeParent = parentById.get(active) ?? active;
  return (
    <div className='px-10 py-10'>
      <FloatingToc triggerMode='press'>
        <FloatingToc.Trigger aria-label='Table of contents'>
          {topLevelItems.map((item) => (
            <FloatingToc.Bar active={item.id === activeParent} key={item.id} />
          ))}
        </FloatingToc.Trigger>
        <FloatingToc.Content className='w-72 overflow-hidden !p-0'>
          <span className='text-muted block px-3 pt-2.5 pb-1 text-[10px] font-semibold tracking-wider uppercase'>
            Contents ({manyItems.length} items)
          </span>
          <Virtualizer
            layout={ListLayout}
            layoutOptions={{ estimatedRowHeight: 32, padding: 6 }}
          >
            <ListBox
              aria-label='Table of contents'
              className='block h-[320px] overflow-auto outline-none'
              items={manyItems}
              selectedKeys={selectedKeys}
              selectionMode='single'
              onSelectionChange={(keys) => {
                const key = [...keys][0];
                if (key) setActive(String(key));
              }}
            >
              {(item) => (
                <ListBoxItem
                  className='floating-toc__item'
                  data-active={item.id === active || undefined}
                  style={
                    item.level > 1
                      ? ({
                          '--floating-toc-level': item.level,
                        } as CSSProperties)
                      : undefined
                  }
                  textValue={item.label}
                >
                  {item.label}
                </ListBoxItem>
              )}
            </ListBox>
          </Virtualizer>
        </FloatingToc.Content>
      </FloatingToc>
    </div>
  );
}
export const Virtualized: Story = { render: () => <LargeList /> };
