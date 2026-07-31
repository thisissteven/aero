import type { Meta } from '@storybook/react';
import React from 'react';

import { Separator } from '@/components/layout/separator';

import { Icon } from '@/icon';

import type { AvatarRootProps, AvatarVariants } from './index';
import { Avatar } from './index';

export default {
  argTypes: {
    color: {
      control: 'select',
      options: ['accent', 'default', 'success', 'warning', 'danger'],
    },
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg'],
    },
  },
  component: Avatar,
  parameters: {
    layout: 'centered',
  },
  title: 'Components/Data Display/Avatar',
} as Meta<typeof Avatar>;

const defaultArgs: Avatar['RootProps'] = {};

const users = [
  {
    id: 1,
    image_url: '/assets/generated/avatar-3.jpg',
    name: 'John',
  },
  {
    id: 2,
    image_url: '/assets/generated/avatar-5.jpg',
    name: 'Kate',
  },
  {
    id: 3,
    image_url: '/assets/generated/avatar-20.jpg',
    name: 'Emily',
  },
  {
    id: 4,
    image_url: '/assets/generated/avatar-23.jpg',
    name: 'Michael',
  },
  {
    id: 5,
    image_url: '/assets/generated/avatar-16.jpg',
    name: 'Olivia',
  },
];

const circles = [
  {
    id: 1,
    image_url: '/assets/avatars/red.jpg',
    name: 'R',
  },
  {
    id: 2,
    image_url: '/assets/avatars/orange.jpg',
    name: 'O',
  },
  {
    id: 3,
    image_url: '/assets/avatars/green.jpg',
    name: 'G',
  },
  {
    id: 4,
    image_url: '/assets/avatars/white.jpg',
    name: 'W',
  },
  {
    id: 5,
    image_url: '/assets/avatars/black.jpg',
    name: 'B',
  },
];

const Template = ({ color, size }: Avatar['RootProps']) => (
  <div className='flex items-start gap-4'>
    <div className='flex flex-col gap-4'>
      <Avatar color={color} size={size}>
        <Avatar.Fallback>PG</Avatar.Fallback>
      </Avatar>
      <Avatar color={color} size={size}>
        <Avatar.Fallback>JR</Avatar.Fallback>
      </Avatar>
      <Avatar color={color} size={size}>
        <Avatar.Fallback>
          <Icon icon='hugeicons:person' />
        </Avatar.Fallback>
      </Avatar>
      <Avatar color={color} size={size}>
        <Avatar.Fallback>
          <Icon icon='hugeicons:person-gear' />
        </Avatar.Fallback>
      </Avatar>
    </div>

    <div className='flex flex-col gap-4'>
      <Avatar color={color} size={size}>
        <Avatar.Image alt='John Doe' src='/assets/generated/avatar-3.jpg' />
        <Avatar.Fallback delayMs={600}>JD</Avatar.Fallback>
      </Avatar>
      <Avatar color={color} size={size}>
        <Avatar.Image
          alt='Junior Garcia'
          src='/assets/generated/avatar-4.jpg'
        />
        <Avatar.Fallback delayMs={600}>JG</Avatar.Fallback>
      </Avatar>
      <Avatar color={color} size={size}>
        <Avatar.Image
          alt='Junior Garcia'
          src='/assets/generated/avatar-5.jpg'
        />
        <Avatar.Fallback delayMs={600}>JG</Avatar.Fallback>
      </Avatar>
      <Avatar color={color} size={size}>
        <Avatar.Image alt='Paul' src='/assets/generated/avatar-8.jpg' />
        <Avatar.Fallback delayMs={600}>PG</Avatar.Fallback>
      </Avatar>
    </div>

    <div className='flex flex-col gap-4'>
      <Avatar color={color} size={size}>
        <Avatar.Image alt='Red' src='/assets/avatars/red.jpg' />
        <Avatar.Fallback>R</Avatar.Fallback>
      </Avatar>
      <Avatar color={color} size={size}>
        <Avatar.Image alt='Orange' src='/assets/avatars/orange.jpg' />
        <Avatar.Fallback>O</Avatar.Fallback>
      </Avatar>
      <Avatar color={color} size={size}>
        <Avatar.Image alt='Green' src='/assets/avatars/green.jpg' />
        <Avatar.Fallback>G</Avatar.Fallback>
      </Avatar>
      <Avatar color={color} size={size}>
        <Avatar.Image alt='White' src='/assets/avatars/white.jpg' />
        <Avatar.Fallback>W</Avatar.Fallback>
      </Avatar>
      <Avatar color={color} size={size}>
        <Avatar.Image alt='Black' src='/assets/avatars/black.jpg' />
        <Avatar.Fallback>B</Avatar.Fallback>
      </Avatar>
    </div>
  </div>
);

const TemplateWithDelay = ({
  color,
  size,
}: {
  delay: number;
  color: AvatarVariants['color'];
  size: AvatarVariants['size'];
}) => {
  return (
    <div className='flex flex-col gap-4'>
      <Avatar color={color} size={size}>
        <Avatar.Image src='/assets/generated/avatar-3.jpg' />
      </Avatar>
    </div>
  );
};

const TemplateWithColors = () => {
  return (
    <div className='flex items-center gap-4'>
      <Avatar color='default'>
        <Avatar.Fallback>DF</Avatar.Fallback>
      </Avatar>
      <Avatar color='accent'>
        <Avatar.Fallback>AC</Avatar.Fallback>
      </Avatar>
      <Avatar color='success'>
        <Avatar.Fallback>SC</Avatar.Fallback>
      </Avatar>
      <Avatar color='warning'>
        <Avatar.Fallback>WR</Avatar.Fallback>
      </Avatar>
      <Avatar color='danger'>
        <Avatar.Fallback>DG</Avatar.Fallback>
      </Avatar>
    </div>
  );
};

const FallbackTemplate = () => {
  return (
    <div className='flex items-center gap-4'>
      {/* Text fallback */}
      <Avatar>
        <Avatar.Fallback>JD</Avatar.Fallback>
      </Avatar>
      {/* Icon fallback */}
      <Avatar>
        <Avatar.Fallback>
          <Icon icon='hugeicons:person' />
        </Avatar.Fallback>
      </Avatar>
      {/* Fallback with delay */}
      <Avatar>
        <Avatar.Image
          alt='Delayed Avatar'
          src='https://invalid-url-to-show-fallback.com/image.jpg'
        />
        <Avatar.Fallback delayMs={600}>NA</Avatar.Fallback>
      </Avatar>
      {/* Custom styled fallback */}
      <Avatar>
        <Avatar.Fallback className='border-none bg-gradient-to-br from-pink-500 to-purple-500 text-white'>
          GB
        </Avatar.Fallback>
      </Avatar>
    </div>
  );
};

const AvatarGroupTemplate = () => {
  return (
    <div className='flex flex-col gap-4'>
      <div className='flex items-center justify-center -space-x-2'>
        {users.map((user) => (
          <Avatar key={user.id} className='ring-background ring-2'>
            <Avatar.Image src={user.image_url} />
            <Avatar.Fallback>{user.name.charAt(0)}</Avatar.Fallback>
          </Avatar>
        ))}
        <Avatar className='ring-background ring-2'>
          <Avatar.Fallback className='border-none'>+5</Avatar.Fallback>
        </Avatar>
      </div>
      <div className='flex items-center justify-center -space-x-2'>
        {circles.map((circle) => (
          <Avatar key={circle.id} className='ring-background ring-2'>
            <Avatar.Image src={circle.image_url} />
            <Avatar.Fallback>{circle.name}</Avatar.Fallback>
          </Avatar>
        ))}
        <Avatar className='ring-background ring-2'>
          <Avatar.Fallback className='border-none'>+5</Avatar.Fallback>
        </Avatar>
      </div>
    </div>
  );
};

export const Default = {
  args: defaultArgs,
  render: Template,
};

export const WithDelay = {
  args: defaultArgs,
  render: TemplateWithDelay,
};

export const WithColors = {
  render: TemplateWithColors,
};

export const Fallback = {
  render: FallbackTemplate,
};

export const Group = {
  render: AvatarGroupTemplate,
};

export const Sizes = {
  render: () => (
    <div className='flex items-center gap-4'>
      <Avatar size='sm'>
        <Avatar.Image alt='Small' src='/assets/generated/avatar-3.jpg' />
        <Avatar.Fallback>SM</Avatar.Fallback>
      </Avatar>
      <Avatar size='md'>
        <Avatar.Image alt='Medium' src='/assets/generated/avatar-4.jpg' />
        <Avatar.Fallback>MD</Avatar.Fallback>
      </Avatar>
      <Avatar size='lg'>
        <Avatar.Image alt='Large' src='/assets/generated/avatar-5.jpg' />
        <Avatar.Fallback>LG</Avatar.Fallback>
      </Avatar>
    </div>
  ),
};

const VariantsTemplate = (props: AvatarRootProps) => {
  const colors = ['accent', 'default', 'success', 'warning', 'danger'] as const;
  const variants = [
    { label: 'letter', type: 'letter', content: 'AG' },
    { label: 'letter soft', type: 'letter-soft', content: 'AG' },
    { label: 'icon', type: 'icon', content: <Icon icon='hugeicons:person' /> },
    {
      label: 'icon soft',
      type: 'icon-soft',
      content: <Icon icon='hugeicons:person' />,
    },
    {
      label: 'img',
      type: 'img',
      content: [
        '/assets/avatars/blue.jpg',
        '/assets/avatars/black.jpg',
        '/assets/avatars/green.jpg',
        '/assets/avatars/orange.jpg',
        '/assets/avatars/red.jpg',
      ],
    },
  ] as const;

  return (
    <div className='flex flex-col gap-4'>
      {/* Color labels header */}
      <div className='flex items-center gap-3'>
        <div className='w-24 shrink-0' />
        {colors.map((color) => (
          <div
            key={color}
            className='flex w-20 shrink-0 items-center justify-center'
          >
            <span className='text-muted text-xs capitalize'>{color}</span>
          </div>
        ))}
      </div>

      <Separator />

      {/* Variant rows */}
      {variants.map((variant) => (
        <div key={variant.label} className='flex items-center gap-3'>
          <div className='text-muted w-24 shrink-0 text-sm'>
            {variant.label}
          </div>
          {colors.map((color, colorIndex) => (
            <div
              key={color}
              className='flex w-20 shrink-0 items-center justify-center'
            >
              <Avatar
                {...props}
                color={color}
                variant={variant.type.includes('soft') ? 'soft' : undefined}
              >
                {variant.type === 'img' ? (
                  <>
                    <Avatar.Image
                      alt={`Avatar ${color}`}
                      src={
                        Array.isArray(variant.content)
                          ? variant.content[colorIndex]
                          : ''
                      }
                    />
                    <Avatar.Fallback>
                      {color.charAt(0).toUpperCase()}
                    </Avatar.Fallback>
                  </>
                ) : (
                  <Avatar.Fallback>{variant.content}</Avatar.Fallback>
                )}
              </Avatar>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
};

export const Variants = {
  args: defaultArgs,
  render: VariantsTemplate,
};
