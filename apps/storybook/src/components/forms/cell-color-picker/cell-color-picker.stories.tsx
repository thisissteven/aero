import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { parseColor } from 'react-aria-components';

import { ColorArea } from '@/components/colors/color-area';
import { ColorSlider } from '@/components/colors/color-slider';
import { ColorSwatchPicker } from '@/components/colors/color-swatch-picker';
import { Input } from '@/components/forms/input';
import { Label } from '@/components/forms/label';

import { CellColorPicker } from './index';

const meta = {
  component: CellColorPicker,
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
  title: 'Components/Forms/CellColorPicker',
} satisfies Meta<typeof CellColorPicker>;
export default meta;
type Story = StoryObj<any>;

function PickerControls() {
  return (
    <>
      <ColorArea
        aria-label='Color area'
        className='max-w-full'
        colorSpace='hsb'
        xChannel='saturation'
        yChannel='brightness'
      >
        <ColorArea.Thumb />
      </ColorArea>
      <ColorSlider
        aria-label='Hue'
        channel='hue'
        className='gap-1 px-1'
        colorSpace='hsb'
      >
        <Label>Hue</Label>
        <ColorSlider.Output className='text-muted' />
        <ColorSlider.Track>
          <ColorSlider.Thumb />
        </ColorSlider.Track>
      </ColorSlider>
    </>
  );
}

function Picker({
  label = 'Accent',
  variant = 'default',
}: {
  label?: string;
  variant?: 'default' | 'secondary';
}) {
  return (
    <CellColorPicker
      aria-label={label}
      defaultValue='#3B82F6'
      variant={variant}
    >
      <CellColorPicker.Trigger>
        <CellColorPicker.Label>{label}</CellColorPicker.Label>
        <CellColorPicker.ValueDisplay />
        <CellColorPicker.Swatch />
      </CellColorPicker.Trigger>
      <CellColorPicker.Popover>
        <PickerControls />
      </CellColorPicker.Popover>
    </CellColorPicker>
  );
}

export const Default: Story = {
  render: () => (
    <div className='w-[252px]'>
      <Picker />
    </div>
  ),
};

export const Variants: Story = {
  render: () => (
    <div className='flex w-[252px] flex-col gap-3'>
      {(['default', 'secondary'] as const).map((variant) => (
        <div className='flex flex-col gap-1' key={variant}>
          <span className='text-muted text-xs'>{variant}</span>
          <Picker variant={variant} />
        </div>
      ))}
    </div>
  ),
};

export const Controlled: Story = {
  render: function Demo() {
    const [color, setColor] = useState(parseColor('#3B82F6'));
    return (
      <div className='flex w-[252px] flex-col gap-2'>
        <CellColorPicker aria-label='Accent' value={color} onChange={setColor}>
          <CellColorPicker.Trigger>
            <CellColorPicker.Label>Accent</CellColorPicker.Label>
            <CellColorPicker.ValueDisplay />
            <CellColorPicker.Swatch />
          </CellColorPicker.Trigger>
          <CellColorPicker.Popover>
            <PickerControls />
          </CellColorPicker.Popover>
        </CellColorPicker>
        <p className='text-muted px-1 text-sm'>
          Selected: {color.toString('hex').toUpperCase()}
        </p>
      </div>
    );
  },
};

const presets = [
  '#ef4444',
  '#f97316',
  '#eab308',
  '#22c55e',
  '#06b6d4',
  '#3b82f6',
  '#8b5cf6',
  '#ec4899',
  '#f43f5e',
];

export const WithPresets: Story = {
  render: function Demo() {
    const [color, setColor] = useState(parseColor('#3B82F6'));
    return (
      <div className='w-[252px]'>
        <CellColorPicker
          aria-label='Brand Color'
          value={color}
          onChange={setColor}
        >
          <CellColorPicker.Trigger>
            <CellColorPicker.Label>Brand Color</CellColorPicker.Label>
            <CellColorPicker.ValueDisplay />
            <CellColorPicker.Swatch />
          </CellColorPicker.Trigger>
          <CellColorPicker.Popover>
            <ColorSwatchPicker className='justify-center pt-2' size='xs'>
              {presets.map((preset) => (
                <ColorSwatchPicker.Item color={preset} key={preset}>
                  <ColorSwatchPicker.Swatch />
                </ColorSwatchPicker.Item>
              ))}
            </ColorSwatchPicker>
            <PickerControls />
            <Input aria-label='Hex value'>
              <Input.Group variant='secondary'>
                <Input.Prefix>#</Input.Prefix>
                <Input.Input />
              </Input.Group>
            </Input>
          </CellColorPicker.Popover>
        </CellColorPicker>
      </div>
    );
  },
};

export const SettingsGroup: Story = {
  render: function Demo() {
    const [accent, setAccent] = useState(parseColor('#3B82F6'));
    const [success, setSuccess] = useState(parseColor('#22C55E'));
    const [danger, setDanger] = useState(parseColor('#EF4444'));
    return (
      <div className='flex w-[252px] flex-col gap-2'>
        {[
          ['Accent', accent, setAccent],
          ['Success', success, setSuccess],
          ['Danger', danger, setDanger],
        ].map(([label, color, setColor]) => (
          <CellColorPicker
            aria-label={label as string}
            key={label as string}
            value={color as typeof accent}
            onChange={setColor as typeof setAccent}
          >
            <CellColorPicker.Trigger>
              <CellColorPicker.Label>{label as string}</CellColorPicker.Label>
              <CellColorPicker.ValueDisplay />
              <CellColorPicker.Swatch />
            </CellColorPicker.Trigger>
            <CellColorPicker.Popover>
              <PickerControls />
            </CellColorPicker.Popover>
          </CellColorPicker>
        ))}
      </div>
    );
  },
};

export const Disabled: Story = {
  render: () => (
    <div className='w-[252px]'>
      <CellColorPicker aria-label='Accent' defaultValue='#3B82F6'>
        <CellColorPicker.Trigger isDisabled>
          <CellColorPicker.Label>Accent</CellColorPicker.Label>
          <CellColorPicker.ValueDisplay />
          <CellColorPicker.Swatch />
        </CellColorPicker.Trigger>
        <CellColorPicker.Popover>
          <ColorArea
            aria-label='Color area'
            className='max-w-full'
            colorSpace='hsb'
            xChannel='saturation'
            yChannel='brightness'
          >
            <ColorArea.Thumb />
          </ColorArea>
        </CellColorPicker.Popover>
      </CellColorPicker>
    </div>
  ),
};
