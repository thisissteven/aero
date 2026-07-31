import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import type { Placement } from 'react-aria-components';

import { ArrowRight01Icon, Building03Icon } from '@aero/ui/icons';
import { HugeiconsIcon } from '@aero/ui/icons';

import { ListBox } from '@/components/collections/list-box';

import { InlineSelect } from './index';

const meta = {
  component: InlineSelect,
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
  title: 'Components/Forms/InlineSelect',
} satisfies Meta<typeof InlineSelect>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: function Demo() {
    const [value, setValue] = useState('en');
    return (
      <InlineSelect aria-label='Language' value={value} onChange={setValue}>
        <InlineSelect.Trigger>
          <InlineSelect.Value />
          <InlineSelect.Indicator />
        </InlineSelect.Trigger>
        <InlineSelect.Popover className='w-[140px]'>
          <ListBox>
            {[
              ['en', 'English'],
              ['es', 'Spanish'],
              ['fr', 'French'],
              ['ja', 'Japanese'],
            ].map(([id, name]) => (
              <ListBox.Item id={id} key={id} textValue={name}>
                {name}
                <ListBox.ItemIndicator />
              </ListBox.Item>
            ))}
          </ListBox>
        </InlineSelect.Popover>
      </InlineSelect>
    );
  },
};

export const MultiSelect: Story = {
  render: function Demo() {
    const [value, setValue] = useState(['email', 'push']);
    return (
      <InlineSelect
        aria-label='Notification channels'
        selectionMode='multiple'
        value={value}
        onChange={setValue}
      >
        <InlineSelect.Trigger>
          <InlineSelect.Value />
          <InlineSelect.Indicator />
        </InlineSelect.Trigger>
        <InlineSelect.Popover className='w-48 max-w-48 min-w-48'>
          <ListBox selectionMode='multiple'>
            {[
              ['email', 'Email'],
              ['whatsapp', 'WhatsApp'],
              ['push', 'Push Notification'],
            ].map(([id, name]) => (
              <ListBox.Item id={id} key={id} textValue={name}>
                {name}
                <ListBox.ItemIndicator />
              </ListBox.Item>
            ))}
          </ListBox>
        </InlineSelect.Popover>
      </InlineSelect>
    );
  },
};

export const CustomIndicator: Story = {
  render: function Demo() {
    const [value, setValue] = useState('editor');
    return (
      <InlineSelect aria-label='Role' value={value} onChange={setValue}>
        <InlineSelect.Trigger>
          <InlineSelect.Value />
          <InlineSelect.Indicator>
            <HugeiconsIcon
              aria-hidden
              icon={ArrowRight01Icon}
              size={12}
              strokeWidth={2}
            />
          </InlineSelect.Indicator>
        </InlineSelect.Trigger>
        <InlineSelect.Popover className='w-[124px]'>
          <ListBox>
            {['Viewer', 'Editor', 'Admin'].map((name) => (
              <ListBox.Item id={name.toLowerCase()} key={name} textValue={name}>
                {name}
                <ListBox.ItemIndicator />
              </ListBox.Item>
            ))}
          </ListBox>
        </InlineSelect.Popover>
      </InlineSelect>
    );
  },
};

const teams = [
  {
    color: 'bg-violet-700',
    id: 'northwind-labs',
    letter: 'N',
    name: 'Northwind Labs',
  },
  { color: 'bg-blue-600', id: 'acme-corp', letter: 'A', name: 'Acme Corp' },
  {
    color: 'bg-amber-600',
    id: 'maple-studio',
    letter: 'M',
    name: 'Maple Studio',
  },
];

function TeamIcon({ color, letter }: { color: string; letter: string }) {
  return (
    <div
      className={`${color} flex size-5 shrink-0 items-center justify-center rounded`}
    >
      <span className='text-[10px] font-bold text-white'>{letter}</span>
    </div>
  );
}

export const TeamSwitcher: Story = {
  render: function Demo() {
    const [value, setValue] = useState('northwind-labs');
    const selected = teams.find((team) => team.id === value) ?? teams[0];
    return (
      <div className='flex items-center gap-2.5'>
        <HugeiconsIcon icon={Building03Icon} size={24} />
        <span className='text-border text-lg font-light'>/</span>
        <InlineSelect aria-label='Team' value={value} onChange={setValue}>
          <InlineSelect.Trigger className='gap-2'>
            <TeamIcon color={selected.color} letter={selected.letter} />
            <span className='text-sm font-medium'>{selected.name}</span>
            <InlineSelect.Indicator />
          </InlineSelect.Trigger>
          <InlineSelect.Popover className='w-[200px]'>
            <ListBox>
              {teams.map((team) => (
                <ListBox.Item id={team.id} key={team.id} textValue={team.name}>
                  <TeamIcon color={team.color} letter={team.letter} />
                  {team.name}
                  <ListBox.ItemIndicator />
                </ListBox.Item>
              ))}
            </ListBox>
          </InlineSelect.Popover>
        </InlineSelect>
      </div>
    );
  },
};

const placements: Placement[] = [
  'bottom',
  'bottom start',
  'bottom end',
  'top',
  'top start',
  'top end',
  'left',
  'left top',
  'left bottom',
  'right',
  'right top',
  'right bottom',
];

export const Placements: Story = {
  render: function Demo() {
    const [value, setValue] = useState<Placement>('bottom end');
    return (
      <div className='flex items-center justify-center px-10'>
        <InlineSelect
          aria-label='Placement'
          value={value}
          onChange={(next) => setValue(next as Placement)}
        >
          <InlineSelect.Trigger>
            <InlineSelect.Value />
            <InlineSelect.Indicator />
          </InlineSelect.Trigger>
          <InlineSelect.Popover placement={value}>
            <ListBox>
              {placements.map((placement) => (
                <ListBox.Item
                  id={placement}
                  key={placement}
                  textValue={placement}
                >
                  {placement === 'bottom end'
                    ? 'bottom end (default)'
                    : placement}
                  <ListBox.ItemIndicator />
                </ListBox.Item>
              ))}
            </ListBox>
          </InlineSelect.Popover>
        </InlineSelect>
      </div>
    );
  },
};
