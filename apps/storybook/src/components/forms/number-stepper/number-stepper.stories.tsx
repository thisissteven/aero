import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';

import {
  IconMinus,
  IconPlus,
  ZoomInAreaIcon,
  ZoomOutAreaIcon,
} from '@aero/ui/icons';
import { HugeiconsIcon } from '@aero/ui/icons';

import { Button } from '@/components/buttons/button';
import { Description } from '@/components/forms/description';
import { Label } from '@/components/forms/label';

import { NumberStepper } from './index';

const meta: Meta<typeof NumberStepper> = {
  component: NumberStepper,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  title: 'Components/Forms/NumberStepper',
};

export default meta;
type Story = StoryObj<typeof meta>;

interface StepperContentProps {
  decrementLabel?: string;
  incrementLabel?: string;
}

function StepperContent({
  decrementLabel = 'Decrease Quantity',
  incrementLabel = 'Increase Quantity',
}: StepperContentProps) {
  return (
    <NumberStepper.Group>
      <NumberStepper.DecrementButton aria-label={decrementLabel} />
      <NumberStepper.Value />
      <NumberStepper.IncrementButton aria-label={incrementLabel} />
    </NumberStepper.Group>
  );
}

export const Default: Story = {
  render: () => (
    <NumberStepper
      aria-label='Quantity'
      defaultValue={1}
      maxValue={99}
      minValue={0}
    >
      <StepperContent />
    </NumberStepper>
  ),
};

export const Sizes: Story = {
  render: () => (
    <div className='flex items-end gap-6'>
      {(['sm', 'md', 'lg'] as const).map((size) => (
        <div className='flex flex-col items-center gap-2' key={size}>
          <span className='text-muted text-sm'>{size}</span>
          <NumberStepper
            aria-label={`Quantity ${size}`}
            defaultValue={1}
            size={size}
          >
            <StepperContent
              decrementLabel={`Decrease Quantity ${size}`}
              incrementLabel={`Increase Quantity ${size}`}
            />
          </NumberStepper>
        </div>
      ))}
    </div>
  ),
};

function ControlledExample() {
  const [value, setValue] = React.useState(5);

  return (
    <div className='flex flex-col items-center gap-3'>
      <NumberStepper
        aria-label='Quantity'
        maxValue={10}
        minValue={0}
        onChange={setValue}
        value={value}
      >
        <StepperContent />
      </NumberStepper>
      <span className='text-muted text-sm'>Value: {value}</span>
    </div>
  );
}

export const Controlled: Story = {
  render: () => <ControlledExample />,
};

export const WithStep: Story = {
  render: () => (
    <div className='flex gap-8'>
      {[5, 10].map((step) => (
        <div className='flex flex-col items-center gap-2' key={step}>
          <span className='text-muted text-sm'>Step: {step}</span>
          <NumberStepper
            aria-label={`Quantity step ${step}`}
            defaultValue={0}
            minValue={0}
            step={step}
          >
            <StepperContent
              decrementLabel={`Decrease Quantity step ${step}`}
              incrementLabel={`Increase Quantity step ${step}`}
            />
          </NumberStepper>
        </div>
      ))}
    </div>
  ),
};

export const MinMaxValues: Story = {
  render: () => (
    <div className='flex gap-8'>
      <div className='flex flex-col items-center gap-2'>
        <span className='text-muted text-sm'>Min: 0, Max: 5</span>
        <NumberStepper
          aria-label='Rating'
          defaultValue={3}
          maxValue={5}
          minValue={0}
        >
          <StepperContent
            decrementLabel='Decrease Rating'
            incrementLabel='Increase Rating'
          />
        </NumberStepper>
      </div>
      <div className='flex flex-col items-center gap-2'>
        <span className='text-muted text-sm'>Min: -10, Max: 10</span>
        <NumberStepper
          aria-label='Temperature'
          defaultValue={0}
          maxValue={10}
          minValue={-10}
        >
          <StepperContent
            decrementLabel='Decrease Temperature'
            incrementLabel='Increase Temperature'
          />
        </NumberStepper>
      </div>
    </div>
  ),
};

export const Disabled: Story = {
  render: () => (
    <NumberStepper aria-label='Quantity' isDisabled defaultValue={3}>
      <StepperContent />
    </NumberStepper>
  ),
};

export const CustomValue: Story = {
  render: () => (
    <NumberStepper aria-label='Quantity' defaultValue={3} minValue={0}>
      <NumberStepper.Group>
        <NumberStepper.DecrementButton aria-label='Decrease Quantity' />
        <NumberStepper.Value>
          {({ value }) => (
            <span
              className='number-stepper__value number-stepper__value--md'
              data-slot='number-stepper-value'
            >
              {value} {value === 1 ? 'item' : 'items'}
            </span>
          )}
        </NumberStepper.Value>
        <NumberStepper.IncrementButton aria-label='Increase Quantity' />
      </NumberStepper.Group>
    </NumberStepper>
  ),
};

export const CustomIcons: Story = {
  render: () => (
    <NumberStepper
      aria-label='Zoom level'
      defaultValue={100}
      minValue={0}
      step={10}
    >
      <NumberStepper.Group>
        <NumberStepper.DecrementButton aria-label='Decrease Zoom level'>
          <HugeiconsIcon icon={ZoomOutAreaIcon} />
        </NumberStepper.DecrementButton>
        <NumberStepper.Value />
        <NumberStepper.IncrementButton aria-label='Increase Zoom level'>
          <HugeiconsIcon icon={ZoomInAreaIcon} />
        </NumberStepper.IncrementButton>
      </NumberStepper.Group>
    </NumberStepper>
  ),
};

const buttonVariants = ['primary', 'secondary', 'tertiary', 'outline'] as const;

export const WithCustomButtons: Story = {
  render: () => (
    <div className='grid grid-cols-4 gap-5'>
      {[false, true].flatMap((withoutBackground) =>
        buttonVariants.map((variant) => {
          const suffix = withoutBackground ? ' no bg' : '';

          return (
            <div
              className='flex flex-col items-center gap-2'
              key={`${variant}-${suffix}`}
            >
              <span className='text-muted text-xs'>{variant}</span>
              <NumberStepper
                aria-label={`Quantity ${variant}${suffix}`}
                defaultValue={1}
              >
                <NumberStepper.Group
                  className={`gap-3 ${withoutBackground ? 'bg-transparent' : ''}`}
                >
                  <Button
                    isIconOnly
                    aria-label={`Decrease Quantity ${variant}${suffix}`}
                    size='sm'
                    slot='decrement'
                    variant={variant}
                  >
                    <IconMinus />
                  </Button>
                  <NumberStepper.Value />
                  <Button
                    isIconOnly
                    aria-label={`Increase Quantity ${variant}${suffix}`}
                    size='sm'
                    slot='increment'
                    variant={variant}
                  >
                    <IconPlus />
                  </Button>
                </NumberStepper.Group>
              </NumberStepper>
            </div>
          );
        }),
      )}
    </div>
  ),
};

const guestTypes = [
  { description: 'Ages 13 or above', label: 'Adults' },
  { description: 'Ages 2–12', label: 'Children' },
  { description: 'Under 2', label: 'Infants' },
  { description: 'Bringing a service animal?', label: 'Pets' },
] as const;

export const GuestPicker: Story = {
  render: () => (
    <div className='w-80 space-y-5'>
      {guestTypes.map(({ description, label }) => (
        <div className='flex items-center justify-between gap-8' key={label}>
          <div>
            <p className='text-foreground font-medium'>{label}</p>
            <p className='text-muted text-sm'>{description}</p>
          </div>
          <NumberStepper
            aria-label={label}
            defaultValue={0}
            minValue={0}
            size='sm'
          >
            <StepperContent
              decrementLabel={`Decrease ${label}`}
              incrementLabel={`Increase ${label}`}
            />
          </NumberStepper>
        </div>
      ))}
    </div>
  ),
};

export const ReversedLayout: Story = {
  render: () => (
    <NumberStepper aria-label='Quantity' defaultValue={1}>
      <NumberStepper.Group>
        <NumberStepper.IncrementButton aria-label='Increase Quantity' />
        <NumberStepper.Value />
        <NumberStepper.DecrementButton aria-label='Decrease Quantity' />
      </NumberStepper.Group>
    </NumberStepper>
  ),
};

export const WithLabel: Story = {
  render: () => (
    <NumberStepper
      className='flex-col items-start gap-1.5'
      defaultValue={1}
      maxValue={10}
      minValue={1}
    >
      <Label>Guests</Label>
      <StepperContent
        decrementLabel='Decrease Guests'
        incrementLabel='Increase Guests'
      />
      <Description>Maximum 10 guests per reservation</Description>
    </NumberStepper>
  ),
};

export const WithFormatOptions: Story = {
  render: () => (
    <div className='flex gap-8'>
      <div className='flex flex-col items-center gap-2'>
        <span className='text-muted text-sm'>Currency (USD)</span>
        <NumberStepper
          aria-label='Price'
          defaultValue={10}
          formatOptions={{ currency: 'USD', style: 'currency' }}
          minValue={0}
        >
          <StepperContent
            decrementLabel='Decrease Price'
            incrementLabel='Increase Price'
          />
        </NumberStepper>
      </div>
      <div className='flex flex-col items-center gap-2'>
        <span className='text-muted text-sm'>Percentage</span>
        <NumberStepper
          aria-label='Opacity'
          defaultValue={0.5}
          formatOptions={{ style: 'percent' }}
          maxValue={1}
          minValue={0}
          step={0.1}
        >
          <StepperContent
            decrementLabel='Decrease Opacity'
            incrementLabel='Increase Opacity'
          />
        </NumberStepper>
      </div>
    </div>
  ),
};
