import type { Meta } from '@storybook/react';
import React from 'react';

import { InformationCircleIcon } from '@aero/ui/icons';
import { HugeiconsIcon } from '@aero/ui/icons';

import { buttonVariants } from '@/components/buttons/button/index';
import { ExternalLinkIcon } from '@/components/utilities/icons';

import type { LinkProps } from './index';
import { Link } from './index';

export default {
  argTypes: {},
  component: Link,
  parameters: {
    layout: 'centered',
  },
  title: 'Components/Navigation/Link',
} as Meta<typeof Link>;

const DefaultTemplate = (_props: Link['RootProps']) => (
  <div className='flex items-center gap-4'>
    <Link href='#'>
      Call to action
      <Link.Icon />
    </Link>
    <Link isDisabled href='#'>
      Call to action
      <Link.Icon />
    </Link>
    <Link
      href='https://namespace.ninja'
      rel='noopener noreferrer'
      target='_blank'
      className={buttonVariants({
        className: 'gap-0 px-3 py-0.5 no-underline',
        size: 'md',
        variant: 'tertiary',
      })}
    >
      Namespace
      <Link.Icon className='h-2 w-2' />
    </Link>
  </div>
);

const CustomIconTemplate = (_props: Link['RootProps']) => (
  <div className='flex items-center gap-4'>
    <Link href='#'>
      External Link
      <Link.Icon>
        <ExternalLinkIcon className='h-3 w-3' />
      </Link.Icon>
    </Link>
    <Link href='#'>
      <Link.Icon>
        <HugeiconsIcon icon={InformationCircleIcon} size={16} />
      </Link.Icon>
      Info Link
    </Link>
  </div>
);

const IconPlacementTemplate = (_props: Link['RootProps']) => (
  <div className='flex flex-col gap-4'>
    <Link href='#'>
      Icon at end (default)
      <Link.Icon />
    </Link>
    <Link href='#'>
      <Link.Icon />
      Icon at start
    </Link>
  </div>
);

const UnderlineVariantsTemplate = (_props: LinkProps) => (
  <div className='flex flex-col gap-6'>
    <div className='flex flex-col gap-2'>
      <p className='text-muted text-sm'>Default hover underline</p>
      <Link href='#'>
        Hover to see the underline
        <Link.Icon />
      </Link>
    </div>

    <div className='flex flex-col gap-2'>
      <p className='text-muted text-sm'>Always visible underline</p>
      <Link className='underline' href='#'>
        Underline always visible
        <Link.Icon />
      </Link>
    </div>

    <div className='flex flex-col gap-2'>
      <p className='text-muted text-sm'>No underline</p>
      <Link className='no-underline' href='#'>
        Link without any underline
        <Link.Icon />
      </Link>
    </div>

    <div className='flex flex-col gap-2'>
      <p className='text-muted text-sm'>Changing the underline offset</p>
      <div className='flex flex-col gap-3'>
        <Link className='underline-offset-1' href='#'>
          Offset 1 (1px space)
          <Link.Icon />
        </Link>
        <Link className='underline-offset-2' href='#'>
          Offset 2 (2px space)
          <Link.Icon />
        </Link>
        <Link className='underline-offset-3' href='#'>
          Offset 3 (3px space)
          <Link.Icon />
        </Link>
        <Link className='underline-offset-4' href='#'>
          Offset 4 (4px space)
          <Link.Icon />
        </Link>
      </div>
    </div>
  </div>
);

export const Default = {
  args: {},
  render: DefaultTemplate,
};

export const CustomIcon = {
  args: {},
  render: CustomIconTemplate,
};

export const IconPlacement = {
  args: {},
  render: IconPlacementTemplate,
};

export const UnderlineVariants = {
  args: {},
  render: UnderlineVariantsTemplate,
};
