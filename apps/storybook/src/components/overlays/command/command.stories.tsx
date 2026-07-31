import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';

import { Button, Chip, Kbd } from '@aero/ui';

import { Icon } from '@/icon';

import { Command } from './index';

const meta = {
  parameters: { layout: 'centered' },
  title: 'Components/Overlays/Command',
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;
const actions = [
  ['Create new file...', 'lucide:file-plus-2'],
  ['Create new folder...', 'lucide:folder-plus'],
  ['Assign to me', 'lucide:user-round-pen'],
] as const;
const settings = [
  ['Preferences', 'lucide:settings'],
  ['Change theme', 'lucide:palette'],
  ['Keyboard shortcuts', 'lucide:keyboard'],
] as const;

function Contents({ minimal = false }: { minimal?: boolean }) {
  return (
    <>
      {minimal ? null : (
        <Command.Header>
          <Chip size='sm'>Home</Chip>
        </Command.Header>
      )}
      <Command.InputGroup>
        <Command.InputGroup.Prefix>
          <Icon icon='lucide:search' />
        </Command.InputGroup.Prefix>
        <Command.InputGroup.Input
          placeholder={
            minimal ? 'What do you need?' : 'Type a command or search...'
          }
        />
        <Command.InputGroup.ClearButton />
        <Command.InputGroup.Suffix>
          <Kbd>Esc</Kbd>
        </Command.InputGroup.Suffix>
      </Command.InputGroup>
      <Command.List renderEmptyState={() => <>No results found.</>}>
        <Command.Group heading={minimal ? undefined : 'Actions'}>
          {actions.map(([label, icon]) => (
            <Command.Item key={label} textValue={label}>
              <Icon icon={icon} />
              <span>{label}</span>
            </Command.Item>
          ))}
        </Command.Group>
        {minimal ? null : (
          <Command.Group heading='Settings'>
            {settings.map(([label, icon]) => (
              <Command.Item key={label} textValue={label}>
                <Icon icon={icon} />
                <span>{label}</span>
              </Command.Item>
            ))}
          </Command.Group>
        )}
      </Command.List>
      {minimal ? null : (
        <Command.Footer>
          <Kbd>↑</Kbd>
          <Kbd>↓</Kbd>
          <span>Navigate</span>
          <Kbd>↵</Kbd>
          <span>Select</span>
        </Command.Footer>
      )}
    </>
  );
}
function Palette({
  label = 'Open Command Palette',
  size = 'md',
  variant = 'opaque',
  children,
}: {
  children?: React.ReactNode;
  label?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'transparent' | 'opaque' | 'blur';
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant='outline' onPress={() => setOpen(true)}>
        {label} <Kbd>⌘ K</Kbd>
      </Button>
      <Command>
        <Command.Backdrop
          isOpen={open}
          variant={variant}
          onOpenChange={setOpen}
        >
          <Command.Container size={size}>
            <Command.Dialog>{children ?? <Contents />}</Command.Dialog>
          </Command.Container>
        </Command.Backdrop>
      </Command>
    </>
  );
}
export const Default: Story = { render: () => <Palette /> };
function SizesDemo() {
  const [size, setSize] = useState<'sm' | 'md' | 'lg'>('md');
  const [open, setOpen] = useState(false);
  return (
    <div className='flex gap-2'>
      {(['sm', 'md', 'lg'] as const).map((value) => (
        <Button
          key={value}
          variant='tertiary'
          onPress={() => {
            setSize(value);
            setOpen(true);
          }}
        >
          Size: {value}
        </Button>
      ))}
      <Command>
        <Command.Backdrop isOpen={open} onOpenChange={setOpen}>
          <Command.Container size={size}>
            <Command.Dialog>
              <Contents />
            </Command.Dialog>
          </Command.Container>
        </Command.Backdrop>
      </Command>
    </div>
  );
}
export const Sizes: Story = { render: () => <SizesDemo /> };
function Backdrops() {
  const [variant, setVariant] = useState<'transparent' | 'opaque' | 'blur'>(
    'opaque',
  );
  const [open, setOpen] = useState(false);
  return (
    <div className='flex gap-2'>
      {(['transparent', 'opaque', 'blur'] as const).map((value) => (
        <Button
          key={value}
          variant='tertiary'
          onPress={() => {
            setVariant(value);
            setOpen(true);
          }}
        >
          {value}
        </Button>
      ))}
      <Command>
        <Command.Backdrop
          isOpen={open}
          variant={variant}
          onOpenChange={setOpen}
        >
          <Command.Container>
            <Command.Dialog>
              <Contents />
            </Command.Dialog>
          </Command.Container>
        </Command.Backdrop>
      </Command>
    </div>
  );
}
export const BackdropVariants: Story = { render: () => <Backdrops /> };
export const MultipleSearchTerms: Story = {
  render: () => (
    <Palette label='Multiple Search Terms' size='lg'>
      <Command.InputGroup>
        <Command.InputGroup.Prefix>
          <Icon icon='lucide:search' />
        </Command.InputGroup.Prefix>
        <Command.InputGroup.Input placeholder='Search or jump to' />
        <Command.InputGroup.ClearButton />
        <Command.InputGroup.Suffix>
          <Kbd>⌘ K</Kbd>
        </Command.InputGroup.Suffix>
      </Command.InputGroup>
      <Command.Header>
        <div className='flex flex-wrap gap-1.5'>
          {['Projects', 'Tasks', 'People', 'Documents', 'Channels'].map((x) => (
            <span className='bg-default rounded px-2 py-1 text-xs' key={x}>
              {x}
            </span>
          ))}
        </div>
      </Command.Header>
      <Command.List renderEmptyState={() => <>No results found.</>}>
        <Command.Group heading='Smart Prompt Examples'>
          {[
            "Summarize this week's progress",
            'Create a task for the team',
            'Draft a project brief',
            'Schedule a standup meeting',
          ].map((x) => (
            <Command.Item key={x} textValue={x}>
              <Icon icon='lucide:sparkles' />
              {x}
            </Command.Item>
          ))}
        </Command.Group>
      </Command.List>
      <Command.Footer>↑↓ Navigate · ↵ Select</Command.Footer>
    </Palette>
  ),
};
export const DevToolbar: Story = {
  render: () => (
    <Palette label='Dev Toolbar'>
      <Command.InputGroup>
        <Command.InputGroup.Prefix>
          <Icon icon='lucide:search' />
        </Command.InputGroup.Prefix>
        <Command.InputGroup.Input placeholder='What do you need?' />
        <Command.InputGroup.ClearButton />
      </Command.InputGroup>
      <Command.List>
        {[
          'Feedback',
          'Notifications',
          'Feature Flags',
          'Share Preview',
          'Switch Branch',
          'View Logs',
          'Tracing',
        ].map((x) => (
          <Command.Item key={x} textValue={x}>
            <Icon icon='lucide:wrench' />
            {x}
            <Kbd className='ms-auto'>{x[0]}</Kbd>
          </Command.Item>
        ))}
      </Command.List>
    </Palette>
  ),
};
export const Clean: Story = {
  render: () => (
    <Palette label='Clean' size='lg'>
      <Command.Header>
        <span className='bg-default rounded px-2 py-1 text-xs'>home</span>
      </Command.Header>
      <Contents minimal />
    </Palette>
  ),
};
export const Minimal: Story = {
  render: () => (
    <Palette label='Minimal'>
      <Contents minimal />
    </Palette>
  ),
};
export const Launcher: Story = {
  render: () => (
    <Palette label='Launcher' size='lg'>
      <Command.InputGroup>
        <Command.InputGroup.Input placeholder='Search for apps and commands...' />
        <Command.InputGroup.ClearButton />
      </Command.InputGroup>
      <Command.List>
        {[
          'Design Tool',
          'Project Tracker',
          'Team Chat',
          'Calendar',
          'Settings',
        ].map((x, i) => (
          <Command.Item key={x} textValue={x}>
            <span className='flex size-5 items-center justify-center rounded bg-violet-500 text-white'>
              <Icon
                icon={
                  [
                    'lucide:palette',
                    'lucide:flag',
                    'lucide:message-circle',
                    'lucide:calendar',
                    'lucide:settings',
                  ][i]!
                }
              />
            </span>
            {x}
            <span className='text-muted ms-auto text-xs'>Application</span>
          </Command.Item>
        ))}
      </Command.List>
    </Palette>
  ),
};
function Split() {
  const [selected, setSelected] = useState('Button');
  const items = [
    'Button',
    'Input',
    'Radio',
    'Chip',
    'Slider',
    'Avatar',
    'Switch',
  ];
  return (
    <Palette label='Split View' size='lg'>
      <Command.InputGroup>
        <Command.InputGroup.Prefix>
          <Icon icon='lucide:search' />
        </Command.InputGroup.Prefix>
        <Command.InputGroup.Input placeholder='Find components, packages, and interactions...' />
        <Command.InputGroup.ClearButton />
      </Command.InputGroup>
      <div className='flex min-h-[308px]'>
        <Command.List
          className='!w-2/5 !flex-none'
          onAction={(key) => setSelected(String(key))}
        >
          <Command.Group heading='Components'>
            {items.map((x) => (
              <Command.Item id={x} key={x} textValue={x}>
                <Icon icon='lucide:component' />
                <div>
                  <div>{x}</div>
                  <div className='text-muted text-xs'>UI component</div>
                </div>
              </Command.Item>
            ))}
          </Command.Group>
        </Command.List>
        <div className='bg-separator w-px' />
        <div className='flex flex-1 items-center justify-center p-4'>
          <Button>{selected}</Button>
        </div>
      </div>
    </Palette>
  );
}
export const SplitView: Story = { render: () => <Split /> };
