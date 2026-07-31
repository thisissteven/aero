import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import { cx } from 'tailwind-variants';

import { Add01Icon, FavouriteIcon, MinusSignIcon } from '@aero/ui/icons';
import { HugeiconsIcon } from '@aero/ui/icons';

import { CheckboxGroup } from '@/components/forms/checkbox-group';
import { Description } from '@/components/forms/description';
import { FieldError } from '@/components/forms/field-error';
import { Label } from '@/components/forms/label';

import { Icon } from '@/icon';

import { Checkbox } from './index';

export default {
  argTypes: {},
  component: Checkbox,
  parameters: {
    layout: 'centered',
  },
  title: 'Components/Forms/Checkbox',
} as Meta<typeof Checkbox>;

type Story = StoryObj<typeof Checkbox>;

export const Default: Story = {
  render: () => (
    <Checkbox name='terms'>
      <Checkbox.Content>
        <Checkbox.Control>
          <Checkbox.Indicator />
        </Checkbox.Control>
        Accept terms and conditions
      </Checkbox.Content>
    </Checkbox>
  ),
};

export const Variants: Story = {
  render: () => (
    <div className='flex flex-col gap-4 px-4'>
      <div className='flex flex-col gap-2'>
        <p className='text-muted text-sm font-medium'>Primary variant</p>
        <Checkbox name='primary' variant='primary'>
          <Checkbox.Content>
            <Checkbox.Control>
              <Checkbox.Indicator />
            </Checkbox.Control>
            Primary checkbox
          </Checkbox.Content>
          <Description>Standard styling with default background</Description>
        </Checkbox>
      </div>
      <div className='flex flex-col gap-2'>
        <p className='text-muted text-sm font-medium'>Secondary variant</p>
        <Checkbox name='secondary' variant='secondary'>
          <Checkbox.Content>
            <Checkbox.Control>
              <Checkbox.Indicator />
            </Checkbox.Control>
            Secondary checkbox
          </Checkbox.Content>
          <Description>Lower emphasis variant for use in surfaces</Description>
        </Checkbox>
      </div>
    </div>
  ),
};

export const WithDescription: Story = {
  render: () => (
    <Checkbox name='terms'>
      <Checkbox.Content>
        <Checkbox.Control>
          <Checkbox.Indicator />
        </Checkbox.Control>
        Accept terms and conditions
      </Checkbox.Content>
      <Description>I agree to the terms and privacy policy</Description>
    </Checkbox>
  ),
};

export const WithCustomIndicator: Story = {
  render: () => (
    <div className='flex gap-4 px-4'>
      <Checkbox defaultSelected id='heart'>
        <Checkbox.Content>
          <Checkbox.Control>
            <Checkbox.Indicator>
              {({ isSelected }) =>
                isSelected ? <HugeiconsIcon icon={FavouriteIcon} /> : null
              }
            </Checkbox.Indicator>
          </Checkbox.Control>
          Heart
        </Checkbox.Content>
      </Checkbox>
      <Checkbox defaultSelected id='plus'>
        <Checkbox.Content>
          <Checkbox.Control>
            <Checkbox.Indicator>
              {({ isSelected }) =>
                isSelected ? <HugeiconsIcon icon={Add01Icon} /> : null
              }
            </Checkbox.Indicator>
          </Checkbox.Control>
          Plus
        </Checkbox.Content>
      </Checkbox>
      <Checkbox isIndeterminate id='indeterminate'>
        <Checkbox.Content>
          <Checkbox.Control>
            <Checkbox.Indicator>
              {({ isIndeterminate }) =>
                isIndeterminate ? <HugeiconsIcon icon={MinusSignIcon} /> : null
              }
            </Checkbox.Indicator>
          </Checkbox.Control>
          Indeterminate
        </Checkbox.Content>
      </Checkbox>
    </div>
  ),
};

export const Indeterminate: Story = {
  render: function Story() {
    return (
      <Checkbox isIndeterminate id='select-all'>
        <Checkbox.Content>
          <Checkbox.Control>
            <Checkbox.Indicator />
          </Checkbox.Control>
          Select all
        </Checkbox.Content>
        <Description>Shows indeterminate state</Description>
      </Checkbox>
    );
  },
};

export const ControlOnly: Story = {
  render: () => (
    <Checkbox aria-label='Accept' name='control-only'>
      <Checkbox.Content>
        <Checkbox.Control>
          <Checkbox.Indicator />
        </Checkbox.Control>
      </Checkbox.Content>
    </Checkbox>
  ),
};

export const Disabled: Story = {
  render: () => (
    <Checkbox isDisabled id='feature'>
      <Checkbox.Content>
        <Checkbox.Control>
          <Checkbox.Indicator />
        </Checkbox.Control>
        Feature
      </Checkbox.Content>
      <Description>This feature is coming soon</Description>
    </Checkbox>
  ),
};

export const Controlled: Story = {
  render: function Story() {
    const [isSelected, setIsSelected] = React.useState(true);

    return (
      <div className='flex flex-col gap-3 px-4'>
        <Checkbox
          id='notifications'
          isSelected={isSelected}
          onChange={setIsSelected}
        >
          <Checkbox.Content>
            <Checkbox.Control>
              <Checkbox.Indicator />
            </Checkbox.Control>
            Email notifications
          </Checkbox.Content>
        </Checkbox>
        <p className='text-muted mt-2 text-sm'>
          Status:{' '}
          <span className='font-medium'>
            {isSelected ? 'Enabled' : 'Disabled'}
          </span>
        </p>
      </div>
    );
  },
};

export const RenderProps: Story = {
  render: () => (
    <Checkbox id='terms'>
      {({ isSelected }) => (
        <>
          <Checkbox.Content>
            <Checkbox.Control>
              <Checkbox.Indicator />
            </Checkbox.Control>
            {isSelected ? 'Terms accepted' : 'Accept terms'}
          </Checkbox.Content>
          <Description>
            {isSelected
              ? 'Thank you for accepting'
              : 'Please read and accept the terms'}
          </Description>
        </>
      )}
    </Checkbox>
  ),
};

export const Invalid: Story = {
  render: () => (
    <Checkbox isInvalid isRequired name='agreement'>
      <Checkbox.Content>
        <Checkbox.Control>
          <Checkbox.Indicator />
        </Checkbox.Control>
        I agree to the terms
      </Checkbox.Content>
      <FieldError>You must accept the terms to continue</FieldError>
    </Checkbox>
  ),
};

export const Validation: Story = {
  render: () => (
    <Checkbox
      isRequired
      name='newsletter'
      validate={(isSelected) =>
        isSelected ? true : 'Please subscribe to continue'
      }
    >
      <Checkbox.Content>
        <Checkbox.Control>
          <Checkbox.Indicator />
        </Checkbox.Control>
        Subscribe to newsletter
      </Checkbox.Content>
      <FieldError />
    </Checkbox>
  ),
};

export const FullRounded: Story = {
  render: () => (
    <div className='flex flex-col gap-6 px-4'>
      <div className='flex flex-col gap-3'>
        <Label className='text-muted'>Rounded checkboxes</Label>
        <Checkbox
          className="[&_[data-slot='checkbox-default-indicator--checkmark']]:size-2"
          id='small-rounded'
        >
          <Checkbox.Content>
            <Checkbox.Control className='size-3 rounded-full before:rounded-full'>
              <Checkbox.Indicator />
            </Checkbox.Control>
            Small size
          </Checkbox.Content>
        </Checkbox>
      </div>
      <div className='flex flex-col gap-3'>
        <Checkbox id='default-rounded'>
          <Checkbox.Content>
            <Checkbox.Control className='size-4 rounded-full before:rounded-full'>
              <Checkbox.Indicator />
            </Checkbox.Control>
            Default size
          </Checkbox.Content>
        </Checkbox>
      </div>
      <div className='flex flex-col gap-3'>
        <Checkbox id='large-rounded'>
          <Checkbox.Content>
            <Checkbox.Control className='size-5 rounded-full before:rounded-full'>
              <Checkbox.Indicator />
            </Checkbox.Control>
            Large size
          </Checkbox.Content>
        </Checkbox>
      </div>
      <div className='flex flex-col gap-3'>
        <Checkbox
          className="[&_[data-slot='checkbox-default-indicator--checkmark']]:size-4"
          id='xl-rounded'
        >
          <Checkbox.Content>
            <Checkbox.Control className='size-6 rounded-full before:rounded-full'>
              <Checkbox.Indicator />
            </Checkbox.Control>
            Extra large size
          </Checkbox.Content>
        </Checkbox>
      </div>
    </div>
  ),
};

export const FeaturesAndAddOnsExample: Story = {
  render: function Story() {
    const addOns = [
      {
        title: 'Email Notifications',
        value: 'email',
        description: 'Receive updates via email',
        icon: 'hugeicons:envelope',
      },
      {
        title: 'SMS Alerts',
        value: 'sms',
        description: 'Get instant SMS notifications',
        icon: 'hugeicons:comment',
      },
      {
        title: 'Push Notifications',
        value: 'push',
        description: 'Browser and mobile push alerts',
        icon: 'hugeicons:bell',
      },
    ];

    return (
      <div className='flex w-full flex-col items-center gap-10 px-4 py-8'>
        <section className='flex w-full min-w-[320px] flex-col gap-4'>
          <CheckboxGroup name='notification-preferences'>
            <Label>Notification preferences</Label>
            <Description>Choose how you want to receive updates</Description>
            <div className='flex flex-col gap-2'>
              {addOns.map((addon) => (
                <Checkbox
                  key={addon.value}
                  id={addon.value}
                  value={addon.value}
                >
                  <Checkbox.Content
                    className={cx(
                      'group bg-surface-tertiary relative flex w-full flex-row items-start justify-start gap-4 rounded-3xl px-5 py-4 transition-all',
                      'data-[selected=true]:bg-accent/10',
                    )}
                  >
                    <Checkbox.Control className='absolute top-3 right-4 size-5 rounded-full before:rounded-full'>
                      <Checkbox.Indicator />
                    </Checkbox.Control>
                    <Icon className='text-accent size-5' icon={addon.icon} />
                    <div className='flex flex-col gap-1'>
                      <span>{addon.title}</span>
                      <Description>{addon.description}</Description>
                    </div>
                  </Checkbox.Content>
                </Checkbox>
              ))}
            </div>
          </CheckboxGroup>
        </section>
      </div>
    );
  },
};
