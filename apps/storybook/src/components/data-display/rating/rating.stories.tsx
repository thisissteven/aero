import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';

import { Label } from '@/components/forms/label';

import { Icon } from '@/icon';

import { Rating, StarIcon } from './index';

const meta = {
  component: Rating,
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
  title: 'Components/Data Display/Rating',
} satisfies Meta<typeof Rating>;
export default meta;
type Story = StoryObj<any>;

const Items = () => (
  <>
    {[1, 2, 3, 4, 5].map((value) => (
      <Rating.Item key={value} value={value} />
    ))}
  </>
);

export const Default: Story = {
  render: () => (
    <Rating aria-label='Rating' defaultValue={3}>
      <Items />
    </Rating>
  ),
};

export const Sizes: Story = {
  render: () => (
    <div className='flex items-center gap-8'>
      {(['sm', 'md', 'lg'] as const).map((size) => (
        <div className='flex flex-col items-center gap-2' key={size}>
          <span className='text-muted text-xs'>{size}</span>
          <Rating aria-label={`Rating ${size}`} defaultValue={3} size={size}>
            <Items />
          </Rating>
        </div>
      ))}
    </div>
  ),
};

export const Controlled: Story = {
  render: function Demo() {
    const [value, setValue] = useState(3);
    return (
      <div className='flex flex-col items-center gap-3'>
        <Rating aria-label='Rating' value={value} onValueChange={setValue}>
          <Items />
        </Rating>
        <span className='text-muted text-sm'>
          {value} {value === 1 ? 'star' : 'stars'}
        </span>
      </div>
    );
  },
};

const fractionalValues = [1.5, 2.3, 3.7, 4.2, 4.8];
function FractionalRatings() {
  return (
    <div className='flex flex-col gap-4'>
      {fractionalValues.map((value) => (
        <div className='flex items-center gap-3' key={value}>
          <Rating
            isReadOnly
            aria-label={`${value} out of 5 stars`}
            value={value}
          >
            <Items />
          </Rating>
          <span className='text-muted text-sm'>{value}</span>
        </div>
      ))}
    </div>
  );
}
export const ReadOnly: Story = { render: () => <FractionalRatings /> };
export const ReadOnlyFractional: Story = {
  render: () => <FractionalRatings />,
};

const Heart = () => <Icon icon='solar:heart-bold' />;
export const CustomIconHeart: Story = {
  render: () => (
    <Rating aria-label='Favorites' defaultValue={3} icon={<Heart />}>
      <Items />
    </Rating>
  ),
};
export const CustomIconPerItem: Story = {
  render: () => (
    <Rating
      aria-label='Favorites'
      defaultValue={3}
      style={
        {
          '--rating-active-color': 'var(--color-danger)',
        } as React.CSSProperties
      }
    >
      {[1, 2, 3, 4, 5].map((value) => (
        <Rating.Item key={value} value={value}>
          <Heart />
        </Rating.Item>
      ))}
    </Rating>
  ),
};

export const RenderFunction: Story = {
  render: function Demo() {
    const [value, setValue] = useState(0);
    return (
      <div className='flex flex-col items-center gap-3'>
        <Rating aria-label='Rating' value={value} onValueChange={setValue}>
          {[1, 2, 3, 4, 5].map((item) => (
            <Rating.Item key={item} value={item}>
              {({ isActive }) => (
                <span
                  className='flex size-5'
                  style={{
                    color: isActive
                      ? 'var(--color-warning)'
                      : 'var(--color-muted)',
                  }}
                >
                  {isActive ? <StarIcon /> : <Icon icon='solar:star-linear' />}
                </span>
              )}
            </Rating.Item>
          ))}
        </Rating>
        <span className='text-muted text-sm'>
          {value === 0
            ? 'No rating'
            : `${value} ${value === 1 ? 'star' : 'stars'}`}
        </span>
      </div>
    );
  },
};

export const Disabled: Story = {
  render: () => (
    <Rating isDisabled aria-label='Rating' defaultValue={3}>
      <Items />
    </Rating>
  ),
};

export const CustomColor: Story = {
  render: () => (
    <div className='flex flex-col gap-4'>
      {[
        { label: 'Accent', color: 'var(--color-accent)' },
        { label: 'Danger', color: 'var(--color-danger)' },
        { label: 'Success', color: 'var(--color-success)' },
      ].map((item) => (
        <div className='flex flex-col gap-1' key={item.label}>
          <span className='text-muted text-xs'>{item.label}</span>
          <Rating
            aria-label={`Rating ${item.label.toLowerCase()}`}
            defaultValue={4}
            style={
              { '--rating-active-color': item.color } as React.CSSProperties
            }
          >
            <Items />
          </Rating>
        </div>
      ))}
    </div>
  ),
};

export const WithLabel: Story = {
  render: function Demo() {
    const [value, setValue] = useState(0);
    return (
      <div className='flex flex-col gap-1.5'>
        <Label>How would you rate this product?</Label>
        <Rating
          aria-label='Product rating'
          value={value}
          onValueChange={setValue}
        >
          <Items />
        </Rating>
        {value > 0 ? (
          <span className='text-muted text-xs'>
            You selected {value} {value === 1 ? 'star' : 'stars'}
          </span>
        ) : null}
      </div>
    );
  },
};

export const ProductReview: Story = {
  render: () => (
    <div className='flex w-[300px] flex-col gap-4'>
      {[
        { name: 'Quality', rating: 4.5 },
        { name: 'Value for money', rating: 3.7 },
        { name: 'Design', rating: 5 },
        { name: 'Durability', rating: 2.3 },
      ].map((item) => (
        <div className='flex items-center justify-between' key={item.name}>
          <span className='text-foreground text-sm'>{item.name}</span>
          <div className='flex items-center gap-2'>
            <Rating
              isReadOnly
              aria-label={`${item.name}: ${item.rating} stars`}
              size='sm'
              value={item.rating}
            >
              <Items />
            </Rating>
            <span className='text-muted w-7 text-right text-xs'>
              {item.rating}
            </span>
          </div>
        </div>
      ))}
    </div>
  ),
};
