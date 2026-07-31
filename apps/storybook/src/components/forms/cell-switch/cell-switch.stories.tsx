import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';

import { Chip } from '@/components/data-display/chip';

import { CellSwitch } from './index';

const meta = {
  component: CellSwitch,
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
  title: 'Components/Forms/CellSwitch',
} satisfies Meta<typeof CellSwitch>;
export default meta;
type Story = StoryObj<typeof meta>;

function SwitchContents({ label }: { label: string }) {
  return (
    <CellSwitch.Trigger>
      <CellSwitch.Label>{label}</CellSwitch.Label>
      <CellSwitch.Control />
    </CellSwitch.Trigger>
  );
}

export const Default: Story = {
  render: () => (
    <div className='w-[252px]'>
      <CellSwitch defaultSelected aria-label='Animations'>
        <SwitchContents label='Animations' />
      </CellSwitch>
    </div>
  ),
};

export const Variants: Story = {
  render: () => (
    <div className='flex w-[252px] flex-col gap-3'>
      {(['default', 'secondary'] as const).map((variant) => (
        <div className='flex flex-col gap-1' key={variant}>
          <span className='text-muted text-xs'>{variant}</span>
          <CellSwitch defaultSelected aria-label='Animations' variant={variant}>
            <SwitchContents label='Animations' />
          </CellSwitch>
        </div>
      ))}
    </div>
  ),
};

export const Controlled: Story = {
  render: function Demo() {
    const [selected, setSelected] = useState(true);
    return (
      <div className='flex w-[252px] flex-col gap-2'>
        <CellSwitch
          aria-label='Animations'
          isSelected={selected}
          onChange={setSelected}
        >
          <SwitchContents label='Animations' />
        </CellSwitch>
        <p className='text-muted px-1 text-sm'>
          Animations: {selected ? 'On' : 'Off'}
        </p>
      </div>
    );
  },
};

function ControlledSwitch({
  defaultSelected,
  label,
  variant = 'default',
}: {
  defaultSelected: boolean;
  label: string;
  variant?: 'default' | 'secondary';
}) {
  const [selected, setSelected] = useState(defaultSelected);
  return (
    <CellSwitch
      aria-label={label}
      isSelected={selected}
      variant={variant}
      onChange={setSelected}
    >
      <SwitchContents label={label} />
    </CellSwitch>
  );
}

export const SettingsGroup: Story = {
  render: () => (
    <div className='flex w-[252px] flex-col gap-2'>
      <ControlledSwitch defaultSelected label='Animations' />
      <ControlledSwitch defaultSelected={false} label='Sounds' />
      <ControlledSwitch defaultSelected label='Haptics' />
    </div>
  ),
};

export const SecondaryGroup: Story = {
  render: () => (
    <div className='flex w-[252px] flex-col gap-2'>
      <ControlledSwitch
        defaultSelected
        label='Notifications'
        variant='secondary'
      />
      <ControlledSwitch
        defaultSelected={false}
        label='Marketing emails'
        variant='secondary'
      />
    </div>
  ),
};

export const Disabled: Story = {
  render: () => (
    <div className='flex w-[252px] flex-col gap-2'>
      <CellSwitch defaultSelected isDisabled aria-label='Animations'>
        <SwitchContents label='Animations' />
      </CellSwitch>
      <CellSwitch isDisabled aria-label='Animations' defaultSelected={false}>
        <SwitchContents label='Animations' />
      </CellSwitch>
    </div>
  ),
};

export const FeatureAnnouncement: Story = {
  render: function Demo() {
    const [selected, setSelected] = useState(false);
    return (
      <div className='w-[320px]'>
        <CellSwitch
          aria-label='Try the new sidebar'
          className='border-border relative h-auto rounded-xl border'
          isSelected={selected}
          onChange={setSelected}
        >
          <CellSwitch.Trigger className='h-auto bg-transparent py-2 shadow-none'>
            <div className='flex min-w-0 flex-1 flex-col gap-0.5'>
              <span className='flex items-center gap-1 text-sm font-semibold'>
                Try the new sidebar
                <Chip
                  className='h-4 px-0.5 text-[10px]'
                  color='accent'
                  size='sm'
                  variant='soft'
                >
                  <Chip.Label>New</Chip.Label>
                </Chip>
              </span>
              <span className='text-muted text-xs font-normal text-wrap'>
                Keep your pages, meetings, and AI within reach.
              </span>
            </div>
            <CellSwitch.Control />
          </CellSwitch.Trigger>
        </CellSwitch>
      </div>
    );
  },
};
