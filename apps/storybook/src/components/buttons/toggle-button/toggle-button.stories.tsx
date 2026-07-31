import type { Meta } from '@storybook/react';
import React, { useState } from 'react';

import { Icon } from '@/icon';

import { ToggleButton } from './index';

export default {
  argTypes: {
    isDisabled: {
      control: 'boolean',
    },
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg'],
    },
    variant: {
      control: 'select',
      options: ['default', 'ghost'],
    },
  },
  component: ToggleButton,
  parameters: {
    layout: 'centered',
  },
  title: 'Components/Buttons/ToggleButton',
} as Meta<typeof ToggleButton>;

const defaultArgs: ToggleButton['RootProps'] = {
  size: 'md',
};

const Template = ({ isDisabled, size, variant }: ToggleButton['RootProps']) => (
  <div className='flex gap-3'>
    <ToggleButton isDisabled={isDisabled} size={size} variant={variant}>
      <Icon icon='hugeicons:heart' />
      Like
    </ToggleButton>
    <ToggleButton
      isDisabled={isDisabled}
      size={size}
      variant={variant ?? 'ghost'}
    >
      <Icon icon='hugeicons:heart' />
      Like
    </ToggleButton>
  </div>
);

const VariantsTemplate = ({ isDisabled, size }: ToggleButton['RootProps']) => (
  <div className='flex flex-col gap-4'>
    <div className='flex flex-col gap-2'>
      <p className='text-muted text-sm font-medium'>Default</p>
      <div className='flex gap-3'>
        <ToggleButton isDisabled={isDisabled} size={size}>
          <Icon icon='hugeicons:heart' />
          Like
        </ToggleButton>
        <ToggleButton defaultSelected isDisabled={isDisabled} size={size}>
          <Icon icon='hugeicons:heart-fill' />
          Like
        </ToggleButton>
      </div>
    </div>
    <div className='flex flex-col gap-2'>
      <p className='text-muted text-sm font-medium'>Ghost</p>
      <div className='flex gap-3'>
        <ToggleButton isDisabled={isDisabled} size={size} variant='ghost'>
          <Icon icon='hugeicons:heart' />
          Like
        </ToggleButton>
        <ToggleButton
          defaultSelected
          isDisabled={isDisabled}
          size={size}
          variant='ghost'
        >
          <Icon icon='hugeicons:heart-fill' />
          Like
        </ToggleButton>
      </div>
    </div>
  </div>
);

const SizesTemplate = () => (
  <div className='flex flex-col gap-6'>
    <div className='flex items-center gap-3'>
      <ToggleButton size='sm'>
        <Icon icon='hugeicons:heart' />
        Small
      </ToggleButton>
      <ToggleButton size='md'>
        <Icon icon='hugeicons:heart' />
        Medium
      </ToggleButton>
      <ToggleButton size='lg'>
        <Icon icon='hugeicons:heart' />
        Large
      </ToggleButton>
    </div>
    <div className='flex items-center gap-3'>
      <ToggleButton isIconOnly size='sm'>
        <Icon icon='hugeicons:heart' />
      </ToggleButton>
      <ToggleButton isIconOnly size='md'>
        <Icon icon='hugeicons:heart' />
      </ToggleButton>
      <ToggleButton isIconOnly size='lg'>
        <Icon icon='hugeicons:heart' />
      </ToggleButton>
    </div>
  </div>
);

const IconOnlyTemplate = ({
  isDisabled,
  size,
  variant,
}: ToggleButton['RootProps']) => (
  <div className='flex gap-3'>
    <ToggleButton
      isIconOnly
      isDisabled={isDisabled}
      size={size}
      variant={variant}
    >
      <Icon icon='hugeicons:heart' />
    </ToggleButton>
    <ToggleButton
      isIconOnly
      isDisabled={isDisabled}
      size={size}
      variant={variant ?? 'ghost'}
    >
      <Icon icon='hugeicons:bookmark' />
    </ToggleButton>
  </div>
);

const ControlledTemplate = () => {
  const [isSelected, setIsSelected] = useState(false);

  return (
    <div className='flex flex-col gap-4'>
      <div className='flex gap-3'>
        <ToggleButton isSelected={isSelected} onChange={setIsSelected}>
          {({ isSelected: selected }) => (
            <>
              <Icon
                icon={selected ? 'hugeicons:heart-fill' : 'hugeicons:heart'}
              />
              {selected ? 'Liked' : 'Like'}
            </>
          )}
        </ToggleButton>
      </div>
      <p className='text-muted text-sm'>
        Status:{' '}
        <span className='font-medium'>
          {isSelected ? 'Selected' : 'Not selected'}
        </span>
      </p>
    </div>
  );
};

const DisabledTemplate = () => (
  <div className='flex gap-3'>
    <ToggleButton isDisabled>
      <Icon icon='hugeicons:heart' />
      Like
    </ToggleButton>
    <ToggleButton defaultSelected isDisabled>
      <Icon icon='hugeicons:heart-fill' />
      Like
    </ToggleButton>
  </div>
);

const RealWorldTemplate = () => {
  const [bookmarked, setBookmarked] = useState(false);
  const [liked, setLiked] = useState(false);
  const [pinned, setPinned] = useState(true);

  return (
    <div className='flex items-center gap-2'>
      <ToggleButton isSelected={liked} size='sm' onChange={setLiked}>
        {({ isSelected }) => (
          <>
            <Icon
              icon={isSelected ? 'hugeicons:heart-fill' : 'hugeicons:heart'}
            />
            Like
          </>
        )}
      </ToggleButton>
      <ToggleButton
        isSelected={bookmarked}
        size='sm'
        variant='ghost'
        onChange={setBookmarked}
      >
        {({ isSelected }) => (
          <>
            <Icon
              icon={
                isSelected ? 'hugeicons:bookmark-fill' : 'hugeicons:bookmark'
              }
            />
            Save
          </>
        )}
      </ToggleButton>
      <ToggleButton
        isIconOnly
        isSelected={pinned}
        size='sm'
        variant='ghost'
        onChange={setPinned}
      >
        {({ isSelected }) => (
          <Icon icon={isSelected ? 'hugeicons:pin-fill' : 'hugeicons:pin'} />
        )}
      </ToggleButton>
    </div>
  );
};

export const Default = {
  args: defaultArgs,
  render: Template,
};

export const Variants = {
  args: defaultArgs,
  render: VariantsTemplate,
};

export const Sizes = {
  render: SizesTemplate,
};

export const IconOnly = {
  args: defaultArgs,
  render: IconOnlyTemplate,
};

export const Controlled = {
  render: ControlledTemplate,
};

export const Disabled = {
  render: DisabledTemplate,
};

export const RealWorld = {
  render: RealWorldTemplate,
};
