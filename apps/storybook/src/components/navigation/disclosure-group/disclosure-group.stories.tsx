import type { Meta } from '@storybook/react';
import React from 'react';
import { cn } from 'tailwind-variants';

import type { ButtonProps } from '@aero/ui';
import { AddCircleIcon, ArrowDown01Icon, ArrowUp01Icon } from '@aero/ui/icons';
import { HugeiconsIcon } from '@aero/ui/icons';

import { Button } from '@/components/buttons/button';
import { Separator } from '@/components/layout/separator';
import { Disclosure } from '@/components/navigation/disclosure';

import { Icon } from '@/icon';

import type { DisclosureGroupProps } from './index';
import { DisclosureGroup, useDisclosureGroupNavigation } from './index';

export default {
  argTypes: {
    isDisabled: {
      control: {
        type: 'boolean',
      },
    },
    allowsMultipleExpanded: {
      control: {
        type: 'boolean',
      },
    },
  },
  component: DisclosureGroup,
  parameters: {
    layout: 'centered',
  },
  title: 'Components/Navigation/DisclosureGroup',
} as Meta<typeof DisclosureGroup>;

const defaultArgs: DisclosureGroupProps = {
  isDisabled: false,
  allowsMultipleExpanded: false,
};

const Template = (props: DisclosureGroupProps) => {
  const [expandedKeys, setExpandedKeys] = React.useState(
    new Set<string | number>(['preview']),
  );

  return (
    <div className='w-full max-w-md'>
      <div className='bg-surface shadow-surface flex flex-col gap-4 rounded-3xl p-4'>
        <DisclosureGroup
          {...props}
          expandedKeys={expandedKeys}
          onExpandedChange={setExpandedKeys}
        >
          <Disclosure aria-label='Preview Aero Native' id='preview'>
            <Disclosure.Heading>
              <Button
                slot='trigger'
                variant={expandedKeys.has('preview') ? 'secondary' : 'tertiary'}
                className={cn('w-full border-none', {
                  'bg-transparent': !expandedKeys.has('preview'),
                })}
              >
                <div className='flex w-full items-center justify-start gap-2'>
                  <Icon icon='hugeicons:qr-code' />
                  Preview Aero Native
                </div>
                <Disclosure.Indicator className='text-muted' />
              </Button>
            </Disclosure.Heading>
            <Disclosure.Content>
              <Disclosure.Body className='mx-2 flex flex-col items-center gap-2 p-4 text-center'>
                <p className='text-muted text-sm'>
                  Scan this QR code with your camera app to preview the Aero
                  native components.
                </p>
                <img
                  alt='Expo Go QR Code'
                  className='aspect-square w-full max-w-54 object-cover'
                  src='https://api.dicebear.com/10.x/disco/svg'
                />
                <p className='text-muted text-sm'>
                  Expo must be installed on your device.
                </p>
                <Button className='mt-4' variant='primary'>
                  <Icon
                    className='[&_path]:fill-accent-foreground'
                    icon='logos:expo-icon'
                  />
                  Preview on Expo Go
                </Button>
              </Disclosure.Body>
            </Disclosure.Content>
          </Disclosure>
          <Separator className='my-2' />
          <Disclosure id='download'>
            <Disclosure.Heading aria-label='Download Aero Native'>
              <Button
                slot='trigger'
                variant={
                  expandedKeys.has('download') ? 'secondary' : 'tertiary'
                }
                className={cn('w-full border-none', {
                  'bg-transparent': !expandedKeys.has('download'),
                })}
              >
                <div className='flex w-full items-center justify-start gap-2'>
                  <Icon icon='tabler:brand-apple-filled' />
                  Download Aero Native
                </div>
                <Disclosure.Indicator className='text-muted' />
              </Button>
            </Disclosure.Heading>
            <Disclosure.Content>
              <Disclosure.Body className='mx-2 flex flex-col items-center gap-2 p-4 text-center'>
                <p className='text-muted text-sm'>
                  Scan this QR code with your camera app to preview the Aero
                  native components.
                </p>
                <img
                  alt='Expo Go QR Code'
                  className='aspect-square w-full max-w-54 object-cover'
                  src='https://api.dicebear.com/10.x/disco/svg'
                />
                <p className='text-muted text-sm'>
                  Expo must be installed on your device.
                </p>
                <Button className='mt-4' variant='primary'>
                  <Icon icon='tabler:brand-apple-filled' />
                  Download on App Store
                </Button>
              </Disclosure.Body>
            </Disclosure.Content>
          </Disclosure>
        </DisclosureGroup>
      </div>
    </div>
  );
};

const ControlledTemplate = (props: DisclosureGroupProps) => {
  const [expandedKeys, setExpandedKeys] = React.useState(
    new Set<string | number>(['preview']),
  );
  const itemIds = ['preview', 'download']; // Track our disclosure items

  const { isNextDisabled, isPrevDisabled, onNext, onPrevious } =
    useDisclosureGroupNavigation({
      expandedKeys,
      itemIds,
      onExpandedChange: setExpandedKeys,
    });

  return (
    <div className='w-full max-w-md'>
      <div className='bg-surface shadow-surface flex flex-col gap-4 rounded-3xl p-4'>
        <div className='mb-2 flex items-center justify-between'>
          <h3 className='text-lg font-semibold'>Aero Native</h3>
          <div className='flex gap-2'>
            <Button
              aria-label='Previous disclosure'
              isDisabled={isPrevDisabled}
              size='sm'
              variant='secondary'
              onPress={onPrevious}
            >
              <Icon className='size-4' icon='lucide:chevron-up' />
            </Button>
            <Button
              aria-label='Next disclosure'
              isDisabled={isNextDisabled}
              size='sm'
              variant='secondary'
              onPress={onNext}
            >
              <Icon className='size-4' icon='lucide:chevron-down' />
            </Button>
          </div>
        </div>
        <DisclosureGroup
          {...props}
          expandedKeys={expandedKeys}
          onExpandedChange={setExpandedKeys}
        >
          <Disclosure aria-label='Preview Aero Native' id='preview'>
            <Disclosure.Heading>
              <Button
                slot='trigger'
                variant={expandedKeys.has('preview') ? 'secondary' : 'tertiary'}
                className={cn('w-full border-none', {
                  'bg-transparent': !expandedKeys.has('preview'),
                })}
              >
                <div className='flex w-full items-center justify-start gap-2'>
                  <Icon icon='hugeicons:qr-code' />
                  Preview Aero Native
                </div>
                <Disclosure.Indicator className='text-muted' />
              </Button>
            </Disclosure.Heading>
            <Disclosure.Content>
              <Disclosure.Body className='mx-2 flex flex-col items-center gap-2 p-4 text-center'>
                <p className='text-muted text-sm'>
                  Scan this QR code with your camera app to preview the Aero
                  native components.
                </p>
                <img
                  alt='Expo Go QR Code'
                  className='aspect-square w-full max-w-54 object-cover'
                  src='https://api.dicebear.com/10.x/disco/svg'
                />
                <p className='text-muted text-sm'>
                  Expo must be installed on your device.
                </p>
                <Button className='mt-4' variant='primary'>
                  <Icon
                    className='[&_path]:fill-accent-foreground'
                    icon='logos:expo-icon'
                  />
                  Preview on Expo Go
                </Button>
              </Disclosure.Body>
            </Disclosure.Content>
          </Disclosure>
          <Separator className='my-2' />
          <Disclosure id='download'>
            <Disclosure.Heading aria-label='Download Aero Native'>
              <Button
                slot='trigger'
                variant={
                  expandedKeys.has('download') ? 'secondary' : 'tertiary'
                }
                className={cn('w-full border-none', {
                  'bg-transparent': !expandedKeys.has('download'),
                })}
              >
                <div className='flex w-full items-center justify-start gap-2'>
                  <Icon icon='tabler:brand-apple-filled' />
                  Download Aero Native
                </div>
                <Disclosure.Indicator className='text-muted' />
              </Button>
            </Disclosure.Heading>
            <Disclosure.Content>
              <Disclosure.Body className='mx-2 flex flex-col items-center gap-2 p-4 text-center'>
                <p className='text-muted text-sm'>
                  Scan this QR code with your camera app to preview the Aero
                  native components.
                </p>
                <img
                  alt='Expo Go QR Code'
                  className='aspect-square w-full max-w-54 object-cover'
                  src='https://api.dicebear.com/10.x/disco/svg'
                />
                <p className='text-muted text-sm'>
                  Expo must be installed on your device.
                </p>
                <Button className='mt-4' variant='primary'>
                  <Icon icon='tabler:brand-apple-filled' />
                  Download on App Store
                </Button>
              </Disclosure.Body>
            </Disclosure.Content>
          </Disclosure>
        </DisclosureGroup>
      </div>
    </div>
  );
};

function AppleShowcaseButton({
  children,
  className,
  isSelected,
  ...props
}: ButtonProps & { isSelected: boolean }) {
  return (
    <Button
      className={cn(
        'ease-in-out-quad h-14 rounded-full bg-[#1e1e20] text-[17px] text-[#f5f5f7] duration-[400ms] hover:bg-[#272729]',
        isSelected && 'bg-[#272729]',
        className,
      )}
      {...props}
    >
      {children}
    </Button>
  );
}

function SelectedIphoneColorSwatch({
  color,
  name,
}: {
  color: string;
  name: string;
}) {
  return (
    <span
      className='group relative size-6 rounded-lg shadow-[inset_0px_-1px_0px_0px_rgba(255,255,255,.5)]'
      style={{
        backgroundColor: `${color}`,
      }}
    >
      <span className='sr-only'>Copy {name} color</span>
    </span>
  );
}

const showcase1Items = [
  {
    id: 'colors',
    label: 'Colors',
    content:
      'Choose from three bold finishes. iPhone 17 Pro shown in Cosmic Orange.',
    imgSrc: 'https://api.dicebear.com/10.x/glass/svg',
  },
  {
    id: 'aluminum',
    label: 'Aluminum unibody',
    content:
      'Optimized for performance and battery. Aluminum alloy is remarkably light and has exceptional thermal conductivity.',
    imgSrc: 'https://api.dicebear.com/10.x/glass/svg',
  },
  {
    id: 'vapor-chamber',
    label: 'Vapor chamber',
    content:
      'Deionized water sealed inside moves heat away from the A19 Pro chip, allowing for even higher sustained performance.',
    imgSrc: 'https://api.dicebear.com/10.x/glass/svg',
  },
  {
    id: 'ceramic-shield',
    label: 'Ceramic shield',
    content:
      'Protects the back of iPhone 17 Pro, making it 4x more resistant to cracks. New Ceramic Shield 2 on the front has 3x better scratch resistance.',
    imgSrc: 'https://api.dicebear.com/10.x/glass/svg',
  },
  {
    id: 'immersive-pro-display',
    label: 'Immersive pro display',
    content:
      'Our best‑ever 6.3‑inch and 6.9‑inch Super Retina XDR displays.5 Brighter. Better anti‑reflection. ProMotion up to 120Hz.',
    imgSrc: 'https://api.dicebear.com/10.x/glass/svg',
  },
  {
    id: 'camera-control',
    label: 'Camera control',
    content:
      'Instantly take a photo, record video, adjust settings, and more. So you never miss a moment.',
    imgSrc: 'https://api.dicebear.com/10.x/glass/svg',
  },
  {
    id: 'action-button',
    label: 'Action button',
    content:
      ' A customizable fast track to your favorite feature. Long press to launch the action you want — Silent mode, Translation, Shortcuts, and more.',
    imgSrc: 'https://api.dicebear.com/10.x/glass/svg',
  },
];

const Showcase1Template = (props: DisclosureGroupProps) => {
  const [expandedKeys, setExpandedKeys] = React.useState(
    new Set<string | number>(['colors']),
  );
  const itemIds = showcase1Items.map((item) => item.id);
  const isAnyItemExpanded = expandedKeys.size > 0;

  const { isNextDisabled, isPrevDisabled, onNext, onPrevious } =
    useDisclosureGroupNavigation({
      expandedKeys,
      itemIds,
      onExpandedChange: setExpandedKeys,
    });

  return (
    <section className='bg-surface w-full overflow-hidden'>
      {/* Left content */}
      <div className='flex w-full items-center gap-8 px-8 py-8'>
        {/* Controls */}
        <div
          data-expanded={isAnyItemExpanded}
          className={cn(
            'z-[1] hidden flex-col gap-5 opacity-0 sm:flex',
            // Animation
            'ease-out-quad transition-all duration-300 data-[expanded=true]:duration-400',
            'translate-y-[120px] data-[expanded=true]:translate-y-0 data-[expanded=true]:opacity-100',
            'scale-50 data-[expanded=true]:scale-100',
          )}
        >
          <Button
            isIconOnly
            aria-label='Previous disclosure'
            className='ease-smooth rounded-full transition-all duration-250'
            isDisabled={isPrevDisabled}
            variant='secondary'
            onPress={onPrevious}
          >
            <HugeiconsIcon icon={ArrowUp01Icon} size={32} />
          </Button>
          <Button
            isIconOnly
            aria-label='Next disclosure'
            className='ease-smooth rounded-full transition-all duration-250'
            isDisabled={isNextDisabled}
            variant='secondary'
            onPress={onNext}
          >
            <HugeiconsIcon icon={ArrowDown01Icon} size={32} />
          </Button>
        </div>
        <div className='z-[1] w-full max-w-md'>
          <DisclosureGroup
            {...props}
            className='flex flex-col gap-y-3'
            expandedKeys={expandedKeys}
            onExpandedChange={setExpandedKeys}
          >
            {showcase1Items.map((item) => (
              <Disclosure key={item.id} aria-label={item.label} id={item.id}>
                <Disclosure.Heading>
                  <AppleShowcaseButton
                    isSelected={expandedKeys.has(item.id)}
                    slot='trigger'
                  >
                    <div className='flex w-full items-center justify-start gap-3'>
                      {item.id === 'colors' ? (
                        <SelectedIphoneColorSwatch
                          color='#f77314'
                          name='Cosmic Orange'
                        />
                      ) : (
                        <HugeiconsIcon
                          className='size-6 flex-none'
                          icon={AddCircleIcon}
                        />
                      )}
                      {item.label}
                    </div>
                  </AppleShowcaseButton>
                </Disclosure.Heading>
                <Disclosure.Content className='ease-out-quad duration-[420ms] ease-[cubic-bezier(0.95,0.05,0.795,0.035)]'>
                  <Disclosure.Body
                    data-expanded={expandedKeys.has(item.id)}
                    className={cn(
                      'mt-3 flex max-w-sm flex-col items-center gap-2 rounded-2xl bg-[rgba(42,42,45,0.72)] p-7 text-left backdrop-blur-[20px]',
                    )}
                  >
                    <p
                      data-expanded={expandedKeys.has(item.id)}
                      className={cn(
                        'text-[17px] font-light text-[#F5F5F7]',
                        'translate-y-[20px] opacity-0',
                        'data-[expanded=true]:translate-y-0 data-[expanded=true]:opacity-100',
                      )}
                      style={{
                        transition: expandedKeys.has(item.id)
                          ? 'opacity 1200ms ease-out, translate 800ms cubic-bezier(0.18,0.89,0.32,1.27)'
                          : ' ',
                        willChange: 'opacity, translate',
                      }}
                    >
                      <strong className='font-medium'>{item.label}</strong>
                      .&nbsp;{item.content}
                    </p>
                  </Disclosure.Body>
                </Disclosure.Content>
              </Disclosure>
            ))}
          </DisclosureGroup>
        </div>
      </div>
      {/* Right image */}
      {showcase1Items.map((item) => (
        <img
          key={item.id}
          alt={item.label}
          data-selected={expandedKeys.has(item.id)}
          src={item.imgSrc}
          className={cn(
            'pointer-events-none absolute top-1/2 right-[10%] z-[0] hidden w-full max-w-6xl -translate-y-1/2 scale-[1.5] opacity-0 lg:block',
            'translate-x-[10%] data-[selected=true]:translate-x-0 data-[selected=true]:opacity-100',
          )}
          style={{
            transition: expandedKeys.has(item.id)
              ? 'opacity 1000ms ease-out, translate 900ms var(--ease-out-quad)'
              : ' ',
            willChange: 'opacity, translate',
          }}
        />
      ))}
    </section>
  );
};

export const Default = {
  args: {
    ...defaultArgs,
  },
  render: Template,
};

export const Controlled = {
  args: {
    ...defaultArgs,
  },
  render: ControlledTemplate,
};

export const Showcase1 = {
  args: {
    children: null,
  },
  render: Showcase1Template,
  name: 'Showcases/Apple iPhone 17 Pro Disclosure Group',
};
