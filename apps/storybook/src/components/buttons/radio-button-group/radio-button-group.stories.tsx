import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';

import { CheckmarkCircle02Icon } from '@aero/ui/icons';
import { HugeiconsIcon } from '@aero/ui/icons';

import { PressableFeedback } from '@/components/buttons/pressable-feedback';
import { Chip } from '@/components/data-display/chip';
import { NumberValue } from '@/components/data-display/number-value';
import { Description } from '@/components/forms/description';
import { Label } from '@/components/forms/label';

import { Icon } from '@/icon';

import { RadioButtonGroup } from './index';

const meta = {
  component: RadioButtonGroup,
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
  title: 'Components/Buttons/RadioButtonGroup',
} satisfies Meta<typeof RadioButtonGroup>;
export default meta;
type Story = StoryObj<any>;

const plans = [
  {
    description: 'For individuals and small projects',
    price: 5,
    value: 'starter',
  },
  {
    description: 'For growing teams and businesses',
    price: 15,
    value: 'pro',
  },
  {
    description: 'For large organizations at scale',
    price: 45,
    value: 'enterprise',
  },
];

function PlanContent({ plan }: { plan: (typeof plans)[number] }) {
  return (
    <RadioButtonGroup.ItemContent>
      <Label className='capitalize'>{plan.value}</Label>
      <Description>{plan.description}</Description>
      <NumberValue
        className='mt-2 text-sm font-semibold'
        currency='USD'
        maximumFractionDigits={0}
        style='currency'
        value={plan.price}
      >
        <NumberValue.Suffix>
          <span className='text-muted text-xs font-normal'>/mo</span>
        </NumberValue.Suffix>
      </NumberValue>
    </RadioButtonGroup.ItemContent>
  );
}

function PlanGroup({
  defaultValue = 'pro',
  description = true,
  indicator = true,
  variant = 'secondary',
}: {
  defaultValue?: string;
  description?: boolean;
  indicator?: boolean;
  variant?: 'primary' | 'secondary';
}) {
  return (
    <RadioButtonGroup
      className='w-[min(360px,calc(100vw-2rem))]'
      defaultValue={defaultValue}
      name='plan'
      variant={variant}
    >
      <Label>Select a plan</Label>
      {description ? (
        <Description>Choose the plan that suits your needs</Description>
      ) : null}
      {plans.map((plan) => (
        <RadioButtonGroup.Item key={plan.value} value={plan.value}>
          {indicator ? <RadioButtonGroup.Indicator /> : null}
          <PlanContent plan={plan} />
        </RadioButtonGroup.Item>
      ))}
    </RadioButtonGroup>
  );
}

export const Default: Story = { render: () => <PlanGroup /> };

const delivery = [
  {
    description: '4-10 business days',
    price: 5,
    title: 'Standard',
    value: 'standard',
  },
  {
    description: '2-5 business days',
    price: 16,
    title: 'Express',
    value: 'express',
  },
  {
    description: '1 business day',
    price: 25,
    title: 'Super Fast',
    value: 'super-fast',
  },
];

function DeliveryGroup({
  className = 'w-full max-w-2xl grid-cols-1 sm:grid-cols-3',
  name = 'delivery',
}: {
  className?: string;
  name?: string;
}) {
  return (
    <RadioButtonGroup
      className={className}
      defaultValue='express'
      layout='grid'
      name={name}
      variant='secondary'
    >
      <Label className='col-span-full'>Delivery method</Label>
      {delivery.map((item) => (
        <RadioButtonGroup.Item key={item.value} value={item.value}>
          <RadioButtonGroup.Indicator />
          <RadioButtonGroup.ItemContent>
            <div className='flex flex-col gap-1'>
              <Label>{item.title}</Label>
              <Description>{item.description}</Description>
            </div>
            <NumberValue
              className='mt-2 text-sm font-semibold'
              currency='USD'
              style='currency'
              value={item.price}
            />
          </RadioButtonGroup.ItemContent>
        </RadioButtonGroup.Item>
      ))}
    </RadioButtonGroup>
  );
}

export const GridLayout: Story = { render: () => <DeliveryGroup /> };

export const NoIndicator: Story = {
  render: () => (
    <PlanGroup description={false} indicator={false} variant='primary' />
  ),
};

export const CustomIndicator: Story = {
  render: () => (
    <RadioButtonGroup
      className='w-full max-w-2xl grid-cols-1 sm:grid-cols-3'
      defaultValue='newsletter'
      layout='grid'
      name='mailing-list'
      variant='secondary'
    >
      <Label className='col-span-full'>Select a mailing list</Label>
      {[
        ['newsletter', 'Last message sent an hour ago', 621],
        ['existing-customers', 'Last message sent 2 weeks ago', 1200],
        ['trial-users', 'Last message sent 4 days ago', 2740],
      ].map(([value, description, users]) => (
        <RadioButtonGroup.Item key={value} value={value as string}>
          <RadioButtonGroup.Indicator>
            <HugeiconsIcon
              aria-hidden
              icon={CheckmarkCircle02Icon}
              size={20}
              strokeWidth={2}
            />
          </RadioButtonGroup.Indicator>
          <RadioButtonGroup.ItemContent>
            <Label className='capitalize'>
              {(value as string).replace(/-/g, ' ')}
            </Label>
            <Description>{description}</Description>
            <NumberValue
              className='mt-3 text-sm font-semibold'
              maximumFractionDigits={0}
              value={users as number}
            >
              <NumberValue.Suffix>
                <span className='text-muted text-xs font-normal'> users</span>
              </NumberValue.Suffix>
            </NumberValue>
          </RadioButtonGroup.ItemContent>
        </RadioButtonGroup.Item>
      ))}
    </RadioButtonGroup>
  ),
};

const workspacePlans = [
  [
    'starter',
    'Starter',
    12,
    'For freelancers and solo makers shipping fast.',
    'solar:rocket-outline',
  ],
  [
    'growth',
    'Growth',
    29,
    'For small teams scaling their product.',
    'solar:graph-up-outline',
  ],
  [
    'business',
    'Business',
    59,
    'For companies with advanced compliance needs.',
    'solar:buildings-outline',
  ],
  [
    'scale',
    'Scale',
    149,
    'Dedicated infra, SLA, and custom integrations.',
    'solar:server-outline',
  ],
  [
    'enterprise',
    'Enterprise',
    299,
    'White-glove onboarding, custom contracts.',
    'solar:crown-outline',
  ],
] as const;

export const IconCards: Story = {
  render: () => (
    <RadioButtonGroup
      className='w-[min(520px,calc(100vw-2rem))]'
      defaultValue='starter'
      name='icon-card'
    >
      <Label>Choose your workspace plan</Label>
      {workspacePlans.map(([value, title, price, description, icon], index) => (
        <RadioButtonGroup.Item className='bg-default' key={value} value={value}>
          <RadioButtonGroup.Indicator>
            <Icon icon='solar:check-circle-bold' />
          </RadioButtonGroup.Indicator>
          <RadioButtonGroup.ItemContent>
            <div className='flex items-center gap-3'>
              <span className='bg-surface shadow-surface flex size-8 items-center justify-center rounded-lg'>
                <Icon icon={icon} />
              </span>
              <div className='flex gap-2'>
                <Label className='text-sm font-semibold'>{title}</Label>
                {index === 0 ? (
                  <Chip color='success' size='sm' variant='soft'>
                    <Chip.Label>Most popular</Chip.Label>
                  </Chip>
                ) : null}
              </div>
            </div>
            <NumberValue
              className='text-2xl font-bold'
              currency='USD'
              maximumFractionDigits={0}
              style='currency'
              value={price}
            >
              <NumberValue.Suffix>
                <span className='text-muted text-sm font-normal'>
                  {' '}
                  per month
                </span>
              </NumberValue.Suffix>
            </NumberValue>
            <Description className='mt-1'>{description}</Description>
          </RadioButtonGroup.ItemContent>
        </RadioButtonGroup.Item>
      ))}
    </RadioButtonGroup>
  ),
};

const payment = [
  ['visa', '**** 0123', 'Exp. on 01/2026', 'logos:visa'],
  ['mastercard', '**** 8304', 'Exp. on 06/2028', 'logos:mastercard'],
  ['paypal', 'PayPal', 'Pay with PayPal', 'logos:paypal'],
] as const;

function PaymentGroup({
  align = 'center',
  className = 'w-full max-w-2xl grid-cols-1 sm:grid-cols-2',
}: {
  align?: 'center' | 'start';
  className?: string;
}) {
  return (
    <RadioButtonGroup
      className={className}
      defaultValue='visa'
      layout='grid'
      name='payment'
      variant='secondary'
    >
      <Label className='col-span-full'>Payment method</Label>
      {payment.map(([value, title, description, icon]) => (
        <RadioButtonGroup.Item key={value} value={value}>
          <RadioButtonGroup.ItemContent
            className={`flex-row gap-4 ${align === 'start' ? 'items-start' : 'items-center'}`}
          >
            <RadioButtonGroup.ItemIcon>
              <Icon icon={icon} />
            </RadioButtonGroup.ItemIcon>
            <div className='flex flex-col gap-0.5'>
              <Label>{title}</Label>
              <Description>{description}</Description>
            </div>
          </RadioButtonGroup.ItemContent>
        </RadioButtonGroup.Item>
      ))}
    </RadioButtonGroup>
  );
}

export const WithIcons: Story = { render: () => <PaymentGroup /> };

export const DisabledGroup: Story = {
  render: () => (
    <RadioButtonGroup
      isDisabled
      className='w-[min(360px,calc(100vw-2rem))]'
      defaultValue='pro'
      name='plan-disabled'
      variant='secondary'
    >
      <Label>Select a plan</Label>
      <Description>Plan changes are temporarily unavailable.</Description>
      {plans.map((plan) => (
        <RadioButtonGroup.Item key={plan.value} value={plan.value}>
          <RadioButtonGroup.Indicator />
          <PlanContent plan={plan} />
        </RadioButtonGroup.Item>
      ))}
    </RadioButtonGroup>
  ),
};

export const DeliveryAndPayment: Story = {
  render: () => (
    <div className='flex w-full max-w-lg flex-col items-center gap-10'>
      <section className='flex w-full flex-col gap-4'>
        <DeliveryGroup
          className='grid-cols-1 sm:grid-cols-3'
          name='delivery-full'
        />
      </section>
      <section className='flex w-full flex-col gap-4'>
        <PaymentGroup align='start' className='grid-cols-1 sm:grid-cols-2' />
      </section>
    </div>
  ),
};

export const WithRipple: Story = {
  render: () => (
    <RadioButtonGroup
      className='w-full max-w-2xl grid-cols-1 sm:grid-cols-3'
      defaultValue='us-east-1'
      layout='grid'
      name='region'
      variant='secondary'
    >
      <Label className='col-span-full'>Deploy region</Label>
      {[
        ['us-east-1', 'US East', 'Lowest latency for US-based users'],
        ['eu-west-1', 'EU West', 'Covers Western Europe and UK'],
        ['ap-south-1', 'Asia Pacific', 'Optimized for Asia-Pacific traffic'],
      ].map(([region, title, description]) => (
        <RadioButtonGroup.Item key={region} value={region}>
          <PressableFeedback.Ripple className='text-muted/50' />
          <RadioButtonGroup.Indicator />
          <RadioButtonGroup.ItemContent>
            <Label>{title}</Label>
            <Description>{description}</Description>
            <span className='text-muted mt-2 font-mono text-xs'>{region}</span>
          </RadioButtonGroup.ItemContent>
        </RadioButtonGroup.Item>
      ))}
    </RadioButtonGroup>
  ),
};

export const RenderPropChildren: Story = {
  render: () => (
    <RadioButtonGroup
      className='w-[min(360px,calc(100vw-2rem))]'
      defaultValue='pro'
      name='plan-render'
      variant='secondary'
    >
      <Label>Select a plan</Label>
      {plans.map((plan) => (
        <RadioButtonGroup.Item key={plan.value} value={plan.value}>
          {({ isSelected }) => (
            <>
              <RadioButtonGroup.Indicator />
              <RadioButtonGroup.ItemContent>
                <Label className='capitalize'>{plan.value}</Label>
                <Description>{plan.description}</Description>
                <NumberValue
                  className={`mt-2 text-sm font-semibold ${isSelected ? 'text-accent' : ''}`}
                  currency='USD'
                  maximumFractionDigits={0}
                  style='currency'
                  value={plan.price}
                >
                  <NumberValue.Suffix>
                    <span className='text-muted text-xs font-normal'>/mo</span>
                  </NumberValue.Suffix>
                </NumberValue>
              </RadioButtonGroup.ItemContent>
            </>
          )}
        </RadioButtonGroup.Item>
      ))}
    </RadioButtonGroup>
  ),
};

export const Controlled: Story = {
  render: function Demo() {
    const [value, setValue] = useState('pro');
    return (
      <div className='flex w-[min(360px,calc(100vw-2rem))] flex-col gap-4'>
        <RadioButtonGroup
          name='plan-controlled'
          value={value}
          variant='secondary'
          onChange={setValue}
        >
          <Label>Select a plan</Label>
          <Description>Choose the plan that suits your needs</Description>
          {plans.map((plan) => (
            <RadioButtonGroup.Item key={plan.value} value={plan.value}>
              <RadioButtonGroup.Indicator />
              <PlanContent plan={plan} />
            </RadioButtonGroup.Item>
          ))}
        </RadioButtonGroup>
        <p className='text-muted text-sm'>
          Selected: <span className='text-foreground font-medium'>{value}</span>
        </p>
      </div>
    );
  },
};

export const SubscriptionPlans: Story = {
  render: () => (
    <RadioButtonGroup
      className='w-[min(400px,calc(100vw-2rem))]'
      defaultValue='annual'
      name='subscription'
    >
      {[
        ['annual', 'Annual', 'Billed at USD 99.99/year (US$ 8.33/month)'],
        [
          'annual-toolkit',
          'Annual + Toolkit',
          'Billed at USD 149.99/year (US$ 12.50/month)',
        ],
      ].map(([value, title, billing], index) => (
        <RadioButtonGroup.Item
          key={value}
          className='data-[selected=true]:bg-foreground border-none ring-transparent transition-colors duration-150'
          value={value}
        >
          {({ isSelected }) => (
            <>
              <PressableFeedback.Ripple />
              <RadioButtonGroup.Indicator className='top-1/2 -translate-y-1/2'>
                <HugeiconsIcon
                  aria-hidden
                  className='text-[#e95f2a]'
                  icon={CheckmarkCircle02Icon}
                  size={24}
                  strokeWidth={2}
                />
              </RadioButtonGroup.Indicator>
              <RadioButtonGroup.ItemContent>
                {index ? (
                  <Chip
                    className='absolute -top-1.5 -left-1 w-fit bg-[#e95f2a] text-black'
                    size='sm'
                  >
                    <Chip.Label>Save up to 50%</Chip.Label>
                  </Chip>
                ) : null}
                <Label
                  className={`text-xl font-bold ${isSelected ? 'text-background' : ''}`}
                >
                  {title}
                </Label>
                <Description
                  className={`mt-1 ${isSelected ? 'text-background/70' : ''}`}
                >
                  {billing}
                </Description>
              </RadioButtonGroup.ItemContent>
            </>
          )}
        </RadioButtonGroup.Item>
      ))}
    </RadioButtonGroup>
  ),
};
