import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';

import { CellSlider } from './index';

const meta = {
  component: CellSlider,
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
  title: 'Components/Forms/CellSlider',
} satisfies Meta<typeof CellSlider>;
export default meta;
type Story = StoryObj<typeof meta>;

const decimalProps = {
  formatOptions: { maximumFractionDigits: 2, minimumFractionDigits: 2 },
  maxValue: 1,
  minValue: 0,
  step: 0.01,
} as const;

function SliderContents({ label }: { label: string }) {
  return (
    <CellSlider.Track>
      <CellSlider.Fill />
      <CellSlider.Thumb />
      <CellSlider.Label>{label}</CellSlider.Label>
      <CellSlider.Output />
    </CellSlider.Track>
  );
}

export const Default: Story = {
  render: () => (
    <div className='w-[252px]'>
      <CellSlider {...decimalProps} aria-label='Spacing' defaultValue={0.5}>
        <SliderContents label='Spacing' />
      </CellSlider>
    </div>
  ),
};

export const Variants: Story = {
  render: () => (
    <div className='flex w-[252px] flex-col gap-3'>
      {(['default', 'secondary'] as const).map((variant) => (
        <div className='flex flex-col gap-1' key={variant}>
          <span className='text-muted text-xs'>{variant}</span>
          <CellSlider
            {...decimalProps}
            aria-label='Spacing'
            defaultValue={0.5}
            variant={variant}
          >
            <SliderContents label='Spacing' />
          </CellSlider>
        </div>
      ))}
    </div>
  ),
};

export const Controlled: Story = {
  render: function Demo() {
    const [value, setValue] = useState(0.5);
    return (
      <div className='flex w-[252px] flex-col gap-2'>
        <CellSlider
          {...decimalProps}
          aria-label='Spacing'
          value={value}
          onChange={setValue}
        >
          <SliderContents label='Spacing' />
        </CellSlider>
        <p className='text-muted px-1 text-sm'>Value: {value.toFixed(2)}</p>
      </div>
    );
  },
};

function ControlledCellSlider({
  defaultValue,
  label,
  variant = 'default',
}: {
  defaultValue: number;
  label: string;
  variant?: 'default' | 'secondary';
}) {
  const [value, setValue] = useState(defaultValue);
  return (
    <CellSlider
      {...decimalProps}
      aria-label={label}
      value={value}
      variant={variant}
      onChange={setValue}
    >
      <SliderContents label={label} />
    </CellSlider>
  );
}

export const SettingsGroup: Story = {
  render: () => (
    <div className='flex w-[252px] flex-col gap-4'>
      <div className='flex flex-col gap-2'>
        <span className='text-muted text-sm'>Density</span>
        <ControlledCellSlider defaultValue={0.5} label='Spacing' />
        <ControlledCellSlider defaultValue={0.3} label='Font Size' />
      </div>
      <div className='flex flex-col gap-2'>
        <span className='text-muted text-sm'>Corners</span>
        <ControlledCellSlider defaultValue={0.5} label='General Radius' />
        <ControlledCellSlider defaultValue={0.3} label='Forms Radius' />
      </div>
    </div>
  ),
};

export const SecondaryGroup: Story = {
  render: () => (
    <div className='flex w-[252px] flex-col gap-2'>
      <ControlledCellSlider
        defaultValue={0.5}
        label='Spacing'
        variant='secondary'
      />
      <ControlledCellSlider
        defaultValue={0.3}
        label='Font Size'
        variant='secondary'
      />
    </div>
  ),
};

export const IntegerStep: Story = {
  render: function Demo() {
    const [value, setValue] = useState(75);
    return (
      <div className='w-[252px]'>
        <CellSlider
          aria-label='Volume'
          maxValue={100}
          minValue={0}
          step={1}
          value={value}
          onChange={setValue}
        >
          <SliderContents label='Volume' />
        </CellSlider>
      </div>
    );
  },
};

export const Disabled: Story = {
  render: () => (
    <div className='flex w-[252px] flex-col gap-2'>
      <CellSlider
        {...decimalProps}
        isDisabled
        aria-label='Spacing'
        defaultValue={0.5}
      >
        <SliderContents label='Spacing' />
      </CellSlider>
      <CellSlider
        {...decimalProps}
        isDisabled
        aria-label='Font Size'
        defaultValue={0.3}
      >
        <SliderContents label='Font Size' />
      </CellSlider>
    </div>
  ),
};
