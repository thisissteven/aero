import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import type { Selection, SelectionMode } from 'react-aria-components';

import { ActionBar } from '@aero/ui/action-bar';

import { Button } from '@/components/buttons/button';
import { Chip } from '@/components/data-display/chip';
import { Separator } from '@/components/layout/separator';
import { Tooltip } from '@/components/overlays/tooltip';

import { Icon } from '@/icon';

import { ListView } from './index';

const meta = {
  parameters: { layout: 'padded' },
  tags: ['autodocs'],
  title: 'Components/Collections/ListView',
} satisfies Meta<typeof ListView>;
export default meta;
type Story = StoryObj<typeof meta>;

const files = [
  { icon: 'folder', id: '1', name: 'Documents', updated: '2 days ago' },
  { icon: 'folder', id: '2', name: 'Photos', updated: '1 week ago' },
  { icon: 'file', id: '3', name: 'README.md', updated: '3 hours ago' },
  { icon: 'file', id: '4', name: 'package.json', updated: 'Yesterday' },
  { icon: 'folder', id: '5', name: 'src', updated: 'Just now' },
  { icon: 'file', id: '6', name: '.gitignore', updated: '2 weeks ago' },
];
function FileRows({ compact = false }: { compact?: boolean }) {
  return (item: (typeof files)[number]) => (
    <ListView.Item id={item.id} textValue={item.name}>
      <ListView.ItemContent>
        <Icon icon={item.icon === 'folder' ? 'lucide:folder' : 'lucide:file'} />
        <div className='flex min-w-0 flex-col'>
          <ListView.Title>{item.name}</ListView.Title>
          {compact ? null : (
            <ListView.Description>Updated {item.updated}</ListView.Description>
          )}
        </div>
      </ListView.ItemContent>
    </ListView.Item>
  );
}
function DefaultDemo() {
  const [selected, setSelected] = useState<Selection>(new Set());
  return (
    <div className='w-full max-w-md'>
      <ListView
        aria-label='Files'
        items={files}
        selectedKeys={selected}
        selectionMode='multiple'
        variant='primary'
        onSelectionChange={setSelected}
      >
        {FileRows({})}
      </ListView>
    </div>
  );
}
function SelectionDemo({
  label,
  selectionMode,
}: {
  label: string;
  selectionMode: SelectionMode;
}) {
  const [selected, setSelected] = useState<Selection>(new Set());
  return (
    <div className='flex flex-col gap-2'>
      <div className='flex items-center justify-between'>
        <span className='text-sm font-medium'>{label}</span>
        {selectionMode !== 'none' ? (
          <span className='text-muted text-xs'>
            {selected === 'all'
              ? 'All selected'
              : selected.size
                ? `${selected.size} selected`
                : 'None selected'}
          </span>
        ) : null}
      </div>
      <ListView
        aria-label={label}
        items={files.slice(0, 5)}
        selectedKeys={selected}
        selectionMode={selectionMode}
        onSelectionChange={setSelected}
      >
        {FileRows({})}
      </ListView>
    </div>
  );
}
function SelectionModesDemo() {
  return (
    <div className='flex w-full max-w-3xl flex-col gap-8 sm:flex-row'>
      <div className='flex-1'>
        <SelectionDemo label='None' selectionMode='none' />
      </div>
      <div className='flex-1'>
        <SelectionDemo label='Single' selectionMode='single' />
      </div>
      <div className='flex-1'>
        <SelectionDemo label='Multiple' selectionMode='multiple' />
      </div>
    </div>
  );
}
function SecondaryDemo() {
  const [selected, setSelected] = useState<Selection>(new Set());
  return (
    <div className='w-full max-w-md'>
      <ListView
        aria-label='Files'
        items={files.slice(0, 5)}
        selectedKeys={selected}
        selectionMode='multiple'
        variant='secondary'
        onSelectionChange={setSelected}
      >
        {FileRows({})}
      </ListView>
    </div>
  );
}
function Actions({ count, clear }: { clear: () => void; count: number }) {
  return (
    <ActionBar aria-label='File actions' isOpen={count > 0}>
      <ActionBar.Prefix>
        <Chip className='shrink-0 tabular-nums' size='sm'>
          {count}
        </Chip>
      </ActionBar.Prefix>
      <Separator />
      <ActionBar.Content>
        {[
          ['Edit', 'lucide:pencil'],
          ['Export', 'lucide:arrow-up-from-line'],
          ['Archive', 'lucide:archive'],
        ].map(([label, icon]) => (
          <Button aria-label={label} key={label} size='sm' variant='ghost'>
            <Icon icon={icon} />
            <span className='action-bar__label'>{label}</span>
          </Button>
        ))}
        <Separator orientation='vertical' />
        <Button
          aria-label='Delete'
          className='bg-danger/10 text-danger'
          size='sm'
          variant='ghost'
        >
          <Icon icon='lucide:trash-2' />
          <span className='action-bar__label'>Delete</span>
        </Button>
      </ActionBar.Content>
      <Separator />
      <ActionBar.Suffix>
        <Tooltip>
          <Button
            isIconOnly
            aria-label='Clear selection'
            size='sm'
            variant='ghost'
            onPress={clear}
          >
            <Icon icon='lucide:x' />
          </Button>
          <Tooltip.Content>Clear selection</Tooltip.Content>
        </Tooltip>
      </ActionBar.Suffix>
    </ActionBar>
  );
}
function WithActionsDemo() {
  const actionFiles = [
    { icon: 'folder', id: '1', name: 'Design System', updated: '2 days ago' },
    { icon: 'folder', id: '2', name: 'Photos', updated: '1 week ago' },
    { icon: 'file', id: '3', name: 'README.md', updated: '3 hours ago' },
    { icon: 'file', id: '4', name: 'package.json', updated: 'Yesterday' },
    { icon: 'folder', id: '5', name: 'src', updated: 'Just now' },
    { icon: 'file', id: '6', name: '.gitignore', updated: '2 weeks ago' },
    { icon: 'file', id: '7', name: 'tsconfig.json', updated: '3 days ago' },
    { icon: 'folder', id: '8', name: 'node_modules', updated: '1 day ago' },
  ];
  const [selected, setSelected] = useState<Selection>(new Set());
  const count = selected === 'all' ? actionFiles.length : selected.size;
  return (
    <div className='w-full max-w-md'>
      <ListView
        aria-label='Project files'
        items={actionFiles}
        selectedKeys={selected}
        selectionMode='multiple'
        onSelectionChange={setSelected}
      >
        {FileRows({})}
      </ListView>
      <Actions clear={() => setSelected(new Set())} count={count} />
    </div>
  );
}
const disabledFiles = [
  { icon: 'folder', id: '1', name: 'Documents' },
  { icon: 'file', id: '2', name: 'Budget.xlsx' },
  { icon: 'file', id: '3', locked: true, name: 'Archived.zip' },
  { icon: 'folder', id: '4', name: 'Photos' },
  { icon: 'file', id: '5', locked: true, name: 'Old backup.tar' },
  { icon: 'file', id: '6', name: 'README.md' },
];
function DisabledItemsDemo() {
  return (
    <div className='w-full max-w-md'>
      <ListView
        aria-label='Files'
        disabledKeys={disabledFiles
          .filter((item) => item.locked)
          .map((item) => item.id)}
        items={disabledFiles}
        selectionMode='multiple'
      >
        {(item) => (
          <ListView.Item id={item.id} textValue={item.name}>
            <ListView.ItemContent>
              <Icon
                icon={item.icon === 'folder' ? 'lucide:folder' : 'lucide:file'}
              />
              <div className='flex min-w-0 flex-col'>
                <ListView.Title>{item.name}</ListView.Title>
              </div>
            </ListView.ItemContent>
            {item.locked ? (
              <ListView.ItemAction>
                <Icon className='text-muted size-3.5' icon='lucide:lock' />
              </ListView.ItemAction>
            ) : null}
          </ListView.Item>
        )}
      </ListView>
    </div>
  );
}

export const Default: Story = { render: () => <DefaultDemo /> };
export const SelectionModes: Story = { render: () => <SelectionModesDemo /> };
export const SecondaryVariant: Story = { render: () => <SecondaryDemo /> };
export const WithActionBar: Story = { render: () => <WithActionsDemo /> };
export const Disabled: Story = { render: () => <DisabledItemsDemo /> };
