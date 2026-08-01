import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';

import { Avatar } from '@aero/ui/avatar';
import { Button } from '@aero/ui/button';
import { Link } from '@aero/ui/link';

import { getRandomUserImage } from '@/seed';

import { HoverCard } from './index';

const meta = {
  component: HoverCard,
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
  title: 'Components/Overlays/HoverCard',
} satisfies Meta<typeof HoverCard>;
export default meta;
type Story = StoryObj<any>;

function Profile() {
  const src = getRandomUserImage();
  return (
    <>
      <div className='flex items-center gap-3'>
        <Avatar size='sm'>
          <Avatar.Image alt='Aero' src={src} />
          <Avatar.Fallback>H</Avatar.Fallback>
        </Avatar>
        <div className='flex flex-col items-start justify-center'>
          <span className='text-sm leading-4 font-semibold'>Aero</span>
          <span className='text-muted text-sm tracking-tight'>@aero</span>
        </div>
      </div>
      <p className='mt-3 pl-px text-sm font-medium'>
        Building the future of UI for web &amp; mobile.&nbsp;
        <br />
        <span aria-label='confetti' role='img'>
          🚀
        </span>
        &nbsp;(YC S24)&nbsp;
      </p>
      <div className='mt-3 flex gap-2'>
        <div className='flex gap-1'>
          <p className='text-sm font-semibold'>4</p>
          <p className='text-muted text-sm'>Following</p>
        </div>
        <div className='flex gap-1'>
          <p className='text-sm font-semibold'>97.1K</p>
          <p className='text-muted text-sm'>Followers</p>
        </div>
      </div>
    </>
  );
}

function TriggerLink() {
  return (
    <Link className='underline' href='https://x.com/theaero' target='_blank'>
      @theaero
    </Link>
  );
}

export const Default: Story = {
  render: () => (
    <div className='px-10 py-24'>
      <p className='text-sm leading-8'>
        Check out{' '}
        <HoverCard>
          <HoverCard.Trigger>
            <TriggerLink />
          </HoverCard.Trigger>
          <HoverCard.Content>
            <Profile />
          </HoverCard.Content>
        </HoverCard>{' '}
        for beautiful React components.
      </p>
    </div>
  ),
};
export const WithArrow: Story = {
  render: () => (
    <div className='px-10 py-24'>
      <p className='text-sm leading-8'>
        Hover over{' '}
        <HoverCard>
          <HoverCard.Trigger>
            <TriggerLink />
          </HoverCard.Trigger>
          <HoverCard.Content>
            <HoverCard.Arrow />
            <Profile />
          </HoverCard.Content>
        </HoverCard>{' '}
        to see a preview with an arrow.
      </p>
    </div>
  ),
};

function ControlledDemo() {
  const [open, setOpen] = useState(false);
  return (
    <div className='px-10 py-24'>
      <div className='mb-4 flex items-center gap-2'>
        <Button
          onPress={() => setOpen((value) => !value)}
          size='sm'
          variant='outline'
        >
          {open ? 'Close' : 'Open'} HoverCard
        </Button>
        <span className='text-[13px] opacity-60'>
          State: <strong>{open ? 'open' : 'closed'}</strong>
        </span>
      </div>
      <p className='text-sm leading-8'>
        This card is controlled:{' '}
        <HoverCard onOpenChange={setOpen} open={open}>
          <HoverCard.Trigger>
            <TriggerLink />
          </HoverCard.Trigger>
          <HoverCard.Content>
            <HoverCard.Arrow />
            <Profile />
          </HoverCard.Content>
        </HoverCard>
      </p>
    </div>
  );
}
export const Controlled: Story = { render: () => <ControlledDemo /> };

function PlacementsDemo() {
  return (
    <div className='grid gap-4'>
      <div className='text-muted my-2 text-sm'>Hover buttons</div>
      {(['top', 'left', 'right', 'bottom'] as const).map((placement) => (
        <HoverCard key={placement}>
          <HoverCard.Trigger>
            <Button className='w-full' variant='outline'>
              {placement[0].toUpperCase() + placement.slice(1)}
            </Button>
          </HoverCard.Trigger>
          <HoverCard.Content placement={placement}>
            <HoverCard.Arrow />
            <Profile />
          </HoverCard.Content>
        </HoverCard>
      ))}
    </div>
  );
}
export const Placements: Story = { render: () => <PlacementsDemo /> };

function ImageCard() {
  return (
    <>
      <img
        alt='Neo Brutalism design'
        className='h-36 w-full rounded-t-2xl object-cover'
        src='https://api.dicebear.com/10.x/bottts-neutral/svg'
      />
      <div className='p-4'>
        <p className='text-sm font-semibold'>Neo Brutalism</p>
        <p className='text-muted mt-1 text-sm leading-relaxed'>
          Raw aesthetics, bold colors, and playful typography.
        </p>
      </div>
    </>
  );
}
export const WithImage: Story = {
  render: () => (
    <div className='px-10 py-24'>
      <p className='text-sm leading-8'>
        Learn more about the{' '}
        <HoverCard openDelay={0}>
          <HoverCard.Trigger>
            <Link className='underline' href='https://aero.ui' target='_blank'>
              Neo Brutalism
            </Link>
          </HoverCard.Trigger>
          <HoverCard.Content className='w-72 p-0'>
            <HoverCard.Arrow />
            <ImageCard />
          </HoverCard.Content>
        </HoverCard>{' '}
        design trend.
      </p>
    </div>
  ),
};

export const CustomDelays: Story = {
  render: () => (
    <div className='flex items-center gap-6 px-10 py-24'>
      {[
        { closeDelay: 0, label: 'Instant', openDelay: 0 },
        { closeDelay: 300, label: 'Default (700 / 300)', openDelay: 700 },
        { closeDelay: 500, label: 'Slow (1s / 500)', openDelay: 1000 },
      ].map((config) => (
        <HoverCard
          closeDelay={config.closeDelay}
          key={config.label}
          openDelay={config.openDelay}
        >
          <HoverCard.Trigger>
            <Button variant='outline'>{config.label}</Button>
          </HoverCard.Trigger>
          <HoverCard.Content className='w-72 p-0'>
            <HoverCard.Arrow />
            <ImageCard />
          </HoverCard.Content>
        </HoverCard>
      ))}
    </div>
  ),
};
