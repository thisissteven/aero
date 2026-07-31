import type { Meta, StoryObj } from '@storybook/react';
import React, { useState } from 'react';

import { ToggleButton } from '@/components/buttons/toggle-button';
import type { Key } from '@/components/utilities/rac';

import { Icon } from '@/icon';

import { ToggleButtonGroup } from './';

const meta: Meta<typeof ToggleButtonGroup> = {
  argTypes: {
    fullWidth: {
      control: 'boolean',
    },
    isDetached: {
      control: 'boolean',
    },
    isDisabled: {
      control: 'boolean',
    },
    orientation: {
      control: 'select',
      options: ['horizontal', 'vertical'],
    },
    selectionMode: {
      control: 'select',
      options: ['single', 'multiple'],
    },
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg'],
    },
  },
  component: ToggleButtonGroup,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  title: 'Components/Buttons/ToggleButtonGroup',
};

export default meta;

type Story = StoryObj<typeof ToggleButtonGroup>;

export const Default: Story = {
  render: () => (
    <ToggleButtonGroup selectionMode='multiple'>
      <ToggleButton isIconOnly aria-label='Bold' id='bold'>
        <Icon icon='hugeicons:bold' />
      </ToggleButton>
      <ToggleButton isIconOnly aria-label='Italic' id='italic'>
        <ToggleButtonGroup.Separator />
        <Icon icon='hugeicons:italic' />
      </ToggleButton>
      <ToggleButton isIconOnly aria-label='Underline' id='underline'>
        <ToggleButtonGroup.Separator />
        <Icon icon='hugeicons:underline' />
      </ToggleButton>
      <ToggleButton isIconOnly aria-label='Strikethrough' id='strikethrough'>
        <ToggleButtonGroup.Separator />
        <Icon icon='hugeicons:strikethrough' />
      </ToggleButton>
    </ToggleButtonGroup>
  ),
};

export const Sizes: Story = {
  render: () => (
    <div className='flex flex-col gap-6'>
      <div className='flex flex-col gap-2'>
        <p className='text-muted text-sm'>Small</p>
        <ToggleButtonGroup selectionMode='multiple' size='sm'>
          <ToggleButton isIconOnly aria-label='Bold' id='bold'>
            <Icon icon='hugeicons:bold' />
          </ToggleButton>
          <ToggleButton isIconOnly aria-label='Italic' id='italic'>
            <ToggleButtonGroup.Separator />
            <Icon icon='hugeicons:italic' />
          </ToggleButton>
          <ToggleButton isIconOnly aria-label='Underline' id='underline'>
            <ToggleButtonGroup.Separator />
            <Icon icon='hugeicons:underline' />
          </ToggleButton>
          <ToggleButton
            isIconOnly
            aria-label='Strikethrough'
            id='strikethrough'
          >
            <ToggleButtonGroup.Separator />
            <Icon icon='hugeicons:strikethrough' />
          </ToggleButton>
        </ToggleButtonGroup>
      </div>
      <div className='flex flex-col gap-2'>
        <p className='text-muted text-sm'>Medium (default)</p>
        <ToggleButtonGroup selectionMode='multiple' size='md'>
          <ToggleButton isIconOnly aria-label='Bold' id='bold'>
            <Icon icon='hugeicons:bold' />
          </ToggleButton>
          <ToggleButton isIconOnly aria-label='Italic' id='italic'>
            <ToggleButtonGroup.Separator />
            <Icon icon='hugeicons:italic' />
          </ToggleButton>
          <ToggleButton isIconOnly aria-label='Underline' id='underline'>
            <ToggleButtonGroup.Separator />
            <Icon icon='hugeicons:underline' />
          </ToggleButton>
          <ToggleButton
            isIconOnly
            aria-label='Strikethrough'
            id='strikethrough'
          >
            <ToggleButtonGroup.Separator />
            <Icon icon='hugeicons:strikethrough' />
          </ToggleButton>
        </ToggleButtonGroup>
      </div>
      <div className='flex flex-col gap-2'>
        <p className='text-muted text-sm'>Large</p>
        <ToggleButtonGroup selectionMode='multiple' size='lg'>
          <ToggleButton isIconOnly aria-label='Bold' id='bold'>
            <Icon icon='hugeicons:bold' />
          </ToggleButton>
          <ToggleButton isIconOnly aria-label='Italic' id='italic'>
            <ToggleButtonGroup.Separator />
            <Icon icon='hugeicons:italic' />
          </ToggleButton>
          <ToggleButton isIconOnly aria-label='Underline' id='underline'>
            <ToggleButtonGroup.Separator />
            <Icon icon='hugeicons:underline' />
          </ToggleButton>
          <ToggleButton
            isIconOnly
            aria-label='Strikethrough'
            id='strikethrough'
          >
            <ToggleButtonGroup.Separator />
            <Icon icon='hugeicons:strikethrough' />
          </ToggleButton>
        </ToggleButtonGroup>
      </div>
    </div>
  ),
};

export const Orientation: Story = {
  render: () => (
    <div className='flex items-start gap-8'>
      <div className='flex flex-col gap-2'>
        <p className='text-muted text-sm'>Horizontal</p>
        <ToggleButtonGroup orientation='horizontal' selectionMode='multiple'>
          <ToggleButton isIconOnly aria-label='Bold' id='bold'>
            <Icon icon='hugeicons:bold' />
          </ToggleButton>
          <ToggleButton isIconOnly aria-label='Italic' id='italic'>
            <ToggleButtonGroup.Separator />
            <Icon icon='hugeicons:italic' />
          </ToggleButton>
          <ToggleButton isIconOnly aria-label='Underline' id='underline'>
            <ToggleButtonGroup.Separator />
            <Icon icon='hugeicons:underline' />
          </ToggleButton>
        </ToggleButtonGroup>
      </div>
      <div className='flex flex-col gap-2'>
        <p className='text-muted text-sm'>Vertical</p>
        <ToggleButtonGroup orientation='vertical' selectionMode='multiple'>
          <ToggleButton isIconOnly aria-label='Bold' id='bold'>
            <Icon icon='hugeicons:bold' />
          </ToggleButton>
          <ToggleButton isIconOnly aria-label='Italic' id='italic'>
            <ToggleButtonGroup.Separator />
            <Icon icon='hugeicons:italic' />
          </ToggleButton>
          <ToggleButton isIconOnly aria-label='Underline' id='underline'>
            <ToggleButtonGroup.Separator />
            <Icon icon='hugeicons:underline' />
          </ToggleButton>
        </ToggleButtonGroup>
      </div>
    </div>
  ),
};

export const AttachedVsDetached: Story = {
  render: () => (
    <div className='flex flex-col gap-6'>
      <div className='flex flex-col gap-2'>
        <p className='text-muted text-sm'>Attached (default)</p>
        <ToggleButtonGroup selectionMode='multiple'>
          <ToggleButton isIconOnly aria-label='Bold' id='bold'>
            <Icon icon='hugeicons:bold' />
          </ToggleButton>
          <ToggleButton isIconOnly aria-label='Italic' id='italic'>
            <ToggleButtonGroup.Separator />
            <Icon icon='hugeicons:italic' />
          </ToggleButton>
          <ToggleButton isIconOnly aria-label='Underline' id='underline'>
            <ToggleButtonGroup.Separator />
            <Icon icon='hugeicons:underline' />
          </ToggleButton>
          <ToggleButton
            isIconOnly
            aria-label='Strikethrough'
            id='strikethrough'
          >
            <ToggleButtonGroup.Separator />
            <Icon icon='hugeicons:strikethrough' />
          </ToggleButton>
        </ToggleButtonGroup>
      </div>
      <div className='flex flex-col gap-2'>
        <p className='text-muted text-sm'>Detached</p>
        <ToggleButtonGroup isDetached selectionMode='multiple'>
          <ToggleButton isIconOnly aria-label='Bold' id='bold'>
            <Icon icon='hugeicons:bold' />
          </ToggleButton>
          <ToggleButton isIconOnly aria-label='Italic' id='italic'>
            <Icon icon='hugeicons:italic' />
          </ToggleButton>
          <ToggleButton isIconOnly aria-label='Underline' id='underline'>
            <Icon icon='hugeicons:underline' />
          </ToggleButton>
          <ToggleButton
            isIconOnly
            aria-label='Strikethrough'
            id='strikethrough'
          >
            <Icon icon='hugeicons:strikethrough' />
          </ToggleButton>
        </ToggleButtonGroup>
      </div>
    </div>
  ),
};

export const FullWidth: Story = {
  render: () => (
    <div className='w-[400px] space-y-3'>
      <ToggleButtonGroup fullWidth selectionMode='multiple'>
        <ToggleButton isIconOnly aria-label='Bold' id='bold'>
          <Icon icon='hugeicons:bold' />
        </ToggleButton>
        <ToggleButton isIconOnly aria-label='Italic' id='italic'>
          <ToggleButtonGroup.Separator />
          <Icon icon='hugeicons:italic' />
        </ToggleButton>
        <ToggleButton isIconOnly aria-label='Underline' id='underline'>
          <ToggleButtonGroup.Separator />
          <Icon icon='hugeicons:underline' />
        </ToggleButton>
        <ToggleButton isIconOnly aria-label='Strikethrough' id='strikethrough'>
          <ToggleButtonGroup.Separator />
          <Icon icon='hugeicons:strikethrough' />
        </ToggleButton>
      </ToggleButtonGroup>
      <ToggleButtonGroup fullWidth selectionMode='single'>
        <ToggleButton id='left'>
          <Icon icon='hugeicons:text-align-left' />
          Left
        </ToggleButton>
        <ToggleButton id='center'>
          <ToggleButtonGroup.Separator />
          <Icon icon='hugeicons:text-align-center' />
          Center
        </ToggleButton>
        <ToggleButton id='right'>
          <ToggleButtonGroup.Separator />
          <Icon icon='hugeicons:text-align-right' />
          Right
        </ToggleButton>
      </ToggleButtonGroup>
    </div>
  ),
};

export const SelectionMode: Story = {
  render: () => (
    <div className='flex flex-col gap-6'>
      <div className='flex flex-col gap-2'>
        <p className='text-muted text-sm'>Single selection</p>
        <ToggleButtonGroup
          defaultSelectedKeys={['center']}
          selectionMode='single'
        >
          <ToggleButton id='left'>
            <Icon icon='hugeicons:text-align-left' />
            Left
          </ToggleButton>
          <ToggleButton id='center'>
            <ToggleButtonGroup.Separator />
            <Icon icon='hugeicons:text-align-center' />
            Center
          </ToggleButton>
          <ToggleButton id='right'>
            <ToggleButtonGroup.Separator />
            <Icon icon='hugeicons:text-align-right' />
            Right
          </ToggleButton>
        </ToggleButtonGroup>
      </div>
      <div className='flex flex-col gap-2'>
        <p className='text-muted text-sm'>Multiple selection</p>
        <ToggleButtonGroup
          defaultSelectedKeys={['bold', 'underline']}
          selectionMode='multiple'
        >
          <ToggleButton isIconOnly aria-label='Bold' id='bold'>
            <Icon icon='hugeicons:bold' />
          </ToggleButton>
          <ToggleButton isIconOnly aria-label='Italic' id='italic'>
            <ToggleButtonGroup.Separator />
            <Icon icon='hugeicons:italic' />
          </ToggleButton>
          <ToggleButton isIconOnly aria-label='Underline' id='underline'>
            <ToggleButtonGroup.Separator />
            <Icon icon='hugeicons:underline' />
          </ToggleButton>
          <ToggleButton
            isIconOnly
            aria-label='Strikethrough'
            id='strikethrough'
          >
            <ToggleButtonGroup.Separator />
            <Icon icon='hugeicons:strikethrough' />
          </ToggleButton>
        </ToggleButtonGroup>
      </div>
    </div>
  ),
};

export const Controlled: Story = {
  render: function ControlledStory() {
    const [selectedKeys, setSelectedKeys] = useState(new Set<Key>(['bold']));

    return (
      <div className='flex flex-col gap-4'>
        <ToggleButtonGroup
          selectedKeys={selectedKeys}
          selectionMode='multiple'
          onSelectionChange={setSelectedKeys}
        >
          <ToggleButton isIconOnly aria-label='Bold' id='bold'>
            <Icon icon='hugeicons:bold' />
          </ToggleButton>
          <ToggleButton isIconOnly aria-label='Italic' id='italic'>
            <ToggleButtonGroup.Separator />
            <Icon icon='hugeicons:italic' />
          </ToggleButton>
          <ToggleButton isIconOnly aria-label='Underline' id='underline'>
            <ToggleButtonGroup.Separator />
            <Icon icon='hugeicons:underline' />
          </ToggleButton>
          <ToggleButton
            isIconOnly
            aria-label='Strikethrough'
            id='strikethrough'
          >
            <ToggleButtonGroup.Separator />
            <Icon icon='hugeicons:strikethrough' />
          </ToggleButton>
        </ToggleButtonGroup>
        <p className='text-muted text-sm'>
          Selected:{' '}
          <span className='font-medium'>
            {selectedKeys.size > 0 ? [...selectedKeys].join(', ') : 'None'}
          </span>
        </p>
      </div>
    );
  },
};

export const Disabled: Story = {
  render: () => (
    <div className='flex flex-col gap-6'>
      <div className='flex flex-col gap-2'>
        <p className='text-muted text-sm'>All buttons disabled</p>
        <ToggleButtonGroup isDisabled selectionMode='multiple'>
          <ToggleButton isIconOnly aria-label='Bold' id='bold'>
            <Icon icon='hugeicons:bold' />
          </ToggleButton>
          <ToggleButton isIconOnly aria-label='Italic' id='italic'>
            <ToggleButtonGroup.Separator />
            <Icon icon='hugeicons:italic' />
          </ToggleButton>
          <ToggleButton isIconOnly aria-label='Underline' id='underline'>
            <ToggleButtonGroup.Separator />
            <Icon icon='hugeicons:underline' />
          </ToggleButton>
        </ToggleButtonGroup>
      </div>
      <div className='flex flex-col gap-2'>
        <p className='text-muted text-sm'>Individual button disabled</p>
        <ToggleButtonGroup selectionMode='multiple'>
          <ToggleButton isIconOnly aria-label='Bold' id='bold'>
            <Icon icon='hugeicons:bold' />
          </ToggleButton>
          <ToggleButton isDisabled isIconOnly aria-label='Italic' id='italic'>
            <ToggleButtonGroup.Separator />
            <Icon icon='hugeicons:italic' />
          </ToggleButton>
          <ToggleButton isIconOnly aria-label='Underline' id='underline'>
            <ToggleButtonGroup.Separator />
            <Icon icon='hugeicons:underline' />
          </ToggleButton>
        </ToggleButtonGroup>
      </div>
    </div>
  ),
};

export const WithoutSeparator: Story = {
  render: () => (
    <ToggleButtonGroup selectionMode='multiple'>
      <ToggleButton isIconOnly aria-label='Bold' id='bold'>
        <Icon icon='hugeicons:bold' />
      </ToggleButton>
      <ToggleButton isIconOnly aria-label='Italic' id='italic'>
        <Icon icon='hugeicons:italic' />
      </ToggleButton>
      <ToggleButton isIconOnly aria-label='Underline' id='underline'>
        <Icon icon='hugeicons:underline' />
      </ToggleButton>
      <ToggleButton isIconOnly aria-label='Strikethrough' id='strikethrough'>
        <Icon icon='hugeicons:strikethrough' />
      </ToggleButton>
    </ToggleButtonGroup>
  ),
};

export const WithLabels: Story = {
  render: () => (
    <div className='flex flex-col gap-6'>
      <ToggleButtonGroup
        defaultSelectedKeys={['italic']}
        selectionMode='multiple'
      >
        <ToggleButton id='bold'>
          <Icon icon='hugeicons:bold' />
          Bold
        </ToggleButton>
        <ToggleButton id='italic'>
          <ToggleButtonGroup.Separator />
          <Icon icon='hugeicons:italic' />
          Italic
        </ToggleButton>
        <ToggleButton id='underline'>
          <ToggleButtonGroup.Separator />
          <Icon icon='hugeicons:underline' />
          Underline
        </ToggleButton>
      </ToggleButtonGroup>
    </div>
  ),
};

export const Examples: Story = {
  render: function ExamplesStory() {
    const [alignment, setAlignment] = useState(new Set<Key>(['left']));
    const [formatting, setFormatting] = useState(
      new Set<Key>(['bold', 'underline']),
    );

    return (
      <div className='flex flex-col items-start gap-8'>
        {/* Text formatting toolbar */}
        <div className='flex flex-col gap-2'>
          <p className='text-muted text-sm'>Text formatting toolbar</p>
          <div className='flex gap-2'>
            <ToggleButtonGroup
              selectedKeys={formatting}
              selectionMode='multiple'
              onSelectionChange={setFormatting}
            >
              <ToggleButton isIconOnly aria-label='Bold' id='bold'>
                <Icon icon='hugeicons:bold' />
              </ToggleButton>
              <ToggleButton isIconOnly aria-label='Italic' id='italic'>
                <ToggleButtonGroup.Separator />
                <Icon icon='hugeicons:italic' />
              </ToggleButton>
              <ToggleButton isIconOnly aria-label='Underline' id='underline'>
                <ToggleButtonGroup.Separator />
                <Icon icon='hugeicons:underline' />
              </ToggleButton>
              <ToggleButton
                isIconOnly
                aria-label='Strikethrough'
                id='strikethrough'
              >
                <ToggleButtonGroup.Separator />
                <Icon icon='hugeicons:strikethrough' />
              </ToggleButton>
            </ToggleButtonGroup>
            <ToggleButtonGroup
              disallowEmptySelection
              selectedKeys={alignment}
              selectionMode='single'
              onSelectionChange={setAlignment}
            >
              <ToggleButton isIconOnly aria-label='Align left' id='left'>
                <Icon icon='hugeicons:text-align-left' />
              </ToggleButton>
              <ToggleButton isIconOnly aria-label='Align center' id='center'>
                <ToggleButtonGroup.Separator />
                <Icon icon='hugeicons:text-align-center' />
              </ToggleButton>
              <ToggleButton isIconOnly aria-label='Align right' id='right'>
                <ToggleButtonGroup.Separator />
                <Icon icon='hugeicons:text-align-right' />
              </ToggleButton>
            </ToggleButtonGroup>
          </div>
        </div>

        {/* View mode switcher */}
        <div className='flex flex-col gap-2'>
          <p className='text-muted text-sm'>View mode switcher</p>
          <ToggleButtonGroup
            disallowEmptySelection
            defaultSelectedKeys={['grid']}
            selectionMode='single'
            size='sm'
          >
            <ToggleButton isIconOnly aria-label='Grid view' id='grid'>
              <Icon icon='hugeicons:layout-cells-large' />
            </ToggleButton>
            <ToggleButton isIconOnly aria-label='List view' id='list'>
              <ToggleButtonGroup.Separator />
              <Icon icon='hugeicons:list-ul' />
            </ToggleButton>
            <ToggleButton isIconOnly aria-label='Columns view' id='columns'>
              <ToggleButtonGroup.Separator />
              <Icon icon='hugeicons:layout-columns-3' />
            </ToggleButton>
          </ToggleButtonGroup>
        </div>

        {/* Vertical toolbar */}
        <div className='flex flex-col gap-2'>
          <p className='text-muted text-sm'>Vertical toolbar</p>
          <ToggleButtonGroup orientation='vertical' selectionMode='multiple'>
            <ToggleButton isIconOnly aria-label='Bold' id='bold'>
              <Icon icon='hugeicons:bold' />
            </ToggleButton>
            <ToggleButton isIconOnly aria-label='Italic' id='italic'>
              <ToggleButtonGroup.Separator />
              <Icon icon='hugeicons:italic' />
            </ToggleButton>
            <ToggleButton isIconOnly aria-label='Underline' id='underline'>
              <ToggleButtonGroup.Separator />
              <Icon icon='hugeicons:underline' />
            </ToggleButton>
          </ToggleButtonGroup>
        </div>
      </div>
    );
  },
};
