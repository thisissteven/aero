import type { Meta, StoryObj } from '@storybook/react';
import { type CSSProperties, useState } from 'react';

import { Button } from '@/components/buttons/button';
import { PressableFeedback } from '@/components/buttons/pressable-feedback';
import { Chip } from '@/components/data-display/chip';
import { NumberValue } from '@/components/data-display/number-value';
import { Description } from '@/components/forms/description';
import { Label } from '@/components/forms/label';
import { Link } from '@/components/navigation/link';

import { Icon } from '@/icon';

import { CheckboxButtonGroup } from './index';

const meta = {
  component: CheckboxButtonGroup,
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
  title: 'Components/Forms/CheckboxButtonGroup',
} satisfies Meta<typeof CheckboxButtonGroup>;
export default meta;
type Story = StoryObj<any>;

const features = [
  {
    description: 'Real-time threat detection and prevention',
    value: 'security',
  },
  {
    description: 'Cloud-based storage with automatic backups',
    value: 'storage',
  },
  {
    description: 'Usage reports and performance dashboards',
    value: 'analytics',
  },
];

function FeatureContent({
  description,
  value,
}: {
  description: string;
  value: string;
}) {
  return (
    <CheckboxButtonGroup.ItemContent>
      <Label className='capitalize'>{value}</Label>
      <Description>{description}</Description>
    </CheckboxButtonGroup.ItemContent>
  );
}

export const Default: Story = {
  render: () => (
    <CheckboxButtonGroup
      className='w-[360px]'
      defaultValue={['security', 'storage']}
      name='features'
      variant='secondary'
    >
      <Label>Select features</Label>
      <Description>Choose all that apply to your project</Description>
      {features.map((feature) => (
        <CheckboxButtonGroup.Item key={feature.value} value={feature.value}>
          <CheckboxButtonGroup.Indicator />
          <FeatureContent {...feature} />
        </CheckboxButtonGroup.Item>
      ))}
    </CheckboxButtonGroup>
  ),
};

const addons = [
  {
    description: 'Automated daily backups',
    price: 5,
    title: 'Backups',
    value: 'backups',
  },
  {
    description: '24/7 monitoring and alerts',
    price: 12,
    title: 'Monitoring',
    value: 'monitoring',
  },
  {
    description: 'Priority email and chat support',
    price: 8,
    title: 'Support',
    value: 'support',
  },
];

function AddonContent({ addon }: { addon: (typeof addons)[number] }) {
  return (
    <CheckboxButtonGroup.ItemContent>
      <div className='flex flex-col gap-1'>
        <Label>{addon.title}</Label>
        <Description>{addon.description}</Description>
      </div>
      <NumberValue
        className='mt-2 text-sm font-semibold'
        currency='USD'
        style='currency'
        value={addon.price}
      >
        <NumberValue.Suffix>
          <span className='text-muted text-xs font-normal'>/mo</span>
        </NumberValue.Suffix>
      </NumberValue>
    </CheckboxButtonGroup.ItemContent>
  );
}

export const GridLayout: Story = {
  render: () => (
    <CheckboxButtonGroup
      className='w-full max-w-2xl grid-cols-3'
      defaultValue={['backups', 'monitoring']}
      layout='grid'
      name='addons'
      variant='secondary'
    >
      <Label className='col-span-full'>Add-ons</Label>
      {addons.map((addon) => (
        <CheckboxButtonGroup.Item key={addon.value} value={addon.value}>
          <CheckboxButtonGroup.Indicator />
          <AddonContent addon={addon} />
        </CheckboxButtonGroup.Item>
      ))}
    </CheckboxButtonGroup>
  ),
};

export const NoIndicator: Story = {
  render: () => (
    <CheckboxButtonGroup
      className='w-[360px]'
      defaultValue={['security']}
      name='features-no-indicator'
    >
      <Label>Select features</Label>
      {features.map((feature) => (
        <CheckboxButtonGroup.Item key={feature.value} value={feature.value}>
          <FeatureContent {...feature} />
        </CheckboxButtonGroup.Item>
      ))}
    </CheckboxButtonGroup>
  ),
};

export const CustomIndicator: Story = {
  render: () => (
    <CheckboxButtonGroup
      className='w-full max-w-3xl grid-cols-3'
      defaultValue={['product-updates', 'security-alerts']}
      layout='grid'
      name='notifications'
      variant='secondary'
    >
      <Label className='col-span-full'>Notification preferences</Label>
      {[
        ['product-updates', 'Weekly product updates and tips', 4200],
        ['security-alerts', 'Security alerts and maintenance notices', 8100],
        ['marketing', 'Promotions, deals, and special offers', 2300],
      ].map(([value, description, subscribers]) => (
        <CheckboxButtonGroup.Item key={value} value={value as string}>
          <CheckboxButtonGroup.Indicator>
            <Icon icon='solar:check-circle-bold' />
          </CheckboxButtonGroup.Indicator>
          <CheckboxButtonGroup.ItemContent>
            <Label className='capitalize'>
              {(value as string).replace(/-/g, ' ')}
            </Label>
            <Description>{description}</Description>
            <NumberValue
              className='mt-3 text-sm font-semibold'
              maximumFractionDigits={0}
              value={subscribers as number}
            >
              <NumberValue.Suffix>
                <span className='text-muted text-xs font-normal'>
                  {' '}
                  subscribers
                </span>
              </NumberValue.Suffix>
            </NumberValue>
          </CheckboxButtonGroup.ItemContent>
        </CheckboxButtonGroup.Item>
      ))}
    </CheckboxButtonGroup>
  ),
};

const securityFeatures = [
  {
    badge: 'Recommended',
    description: 'Two-factor authentication for all user accounts.',
    icon: 'solar:lock-password-outline',
    title: '2FA',
    value: '2fa',
  },
  {
    description: 'Encrypt data at rest and in transit.',
    icon: 'solar:shield-keyhole-outline',
    title: 'Encryption',
    value: 'encryption',
  },
  {
    description: 'Automated daily backups to secure cloud storage.',
    icon: 'solar:cloud-outline',
    title: 'Cloud Backup',
    value: 'cloud-backup',
  },
  {
    description: 'Real-time alerts for incidents and breaches.',
    icon: 'solar:notification-unread-outline',
    title: 'Alert System',
    value: 'alerts',
  },
];

export const IconCards: Story = {
  render: () => (
    <CheckboxButtonGroup
      className='w-[520px]'
      defaultValue={['2fa', 'encryption']}
      name='security-features'
    >
      <Label>Security features</Label>
      {securityFeatures.map((feature) => (
        <CheckboxButtonGroup.Item
          className='bg-default'
          key={feature.value}
          value={feature.value}
        >
          <CheckboxButtonGroup.Indicator>
            <Icon icon='solar:check-circle-bold' />
          </CheckboxButtonGroup.Indicator>
          <CheckboxButtonGroup.ItemContent>
            <div className='flex items-center gap-3'>
              <span className='bg-surface shadow-surface flex size-8 items-center justify-center rounded-lg'>
                <Icon icon={feature.icon} />
              </span>
              <div className='flex gap-2'>
                <Label className='text-sm font-semibold'>{feature.title}</Label>
                {feature.badge ? (
                  <Chip color='success' size='sm' variant='soft'>
                    <Chip.Label>{feature.badge}</Chip.Label>
                  </Chip>
                ) : null}
              </div>
            </div>
            <Description className='mt-2'>{feature.description}</Description>
          </CheckboxButtonGroup.ItemContent>
        </CheckboxButtonGroup.Item>
      ))}
    </CheckboxButtonGroup>
  ),
};

const permissions = [
  [
    'content',
    'Content Management',
    'Create, edit, and delete content',
    'solar:cloud-outline',
  ],
  [
    'users',
    'User Administration',
    'Manage team members and roles',
    'solar:shield-keyhole-outline',
  ],
  [
    'analytics',
    'Analytics Access',
    'View and export reports',
    'solar:database-outline',
  ],
  [
    'settings',
    'Settings',
    'Configure system preferences',
    'solar:lock-outline',
  ],
];

export const WithIcons: Story = {
  render: () => (
    <CheckboxButtonGroup
      className='w-full max-w-2xl grid-cols-2'
      defaultValue={['content', 'analytics']}
      layout='grid'
      name='permissions'
      variant='secondary'
    >
      <Label className='col-span-full'>Role permissions</Label>
      {permissions.map(([value, title, description, icon]) => (
        <CheckboxButtonGroup.Item key={value} value={value}>
          <CheckboxButtonGroup.ItemContent className='flex-row items-center gap-4'>
            <CheckboxButtonGroup.ItemIcon>
              <Icon icon={icon} />
            </CheckboxButtonGroup.ItemIcon>
            <div className='flex flex-col gap-0.5'>
              <Label>{title}</Label>
              <Description>{description}</Description>
            </div>
          </CheckboxButtonGroup.ItemContent>
        </CheckboxButtonGroup.Item>
      ))}
    </CheckboxButtonGroup>
  ),
};

export const DisabledGroup: Story = {
  render: () => (
    <CheckboxButtonGroup
      isDisabled
      className='w-[360px]'
      defaultValue={['security']}
      name='features-disabled'
      variant='secondary'
    >
      <Label>Select features</Label>
      <Description>Feature selection is temporarily unavailable.</Description>
      {features.map((feature) => (
        <CheckboxButtonGroup.Item key={feature.value} value={feature.value}>
          <CheckboxButtonGroup.Indicator />
          <FeatureContent {...feature} />
        </CheckboxButtonGroup.Item>
      ))}
    </CheckboxButtonGroup>
  ),
};

export const WithRipple: Story = {
  render: () => (
    <CheckboxButtonGroup
      className='w-full max-w-2xl grid-cols-3'
      defaultValue={['github']}
      layout='grid'
      name='integrations'
      variant='secondary'
    >
      <Label className='col-span-full'>Integrations</Label>
      {['GitHub', 'Slack', 'Linear'].map((title) => (
        <CheckboxButtonGroup.Item key={title} value={title.toLowerCase()}>
          <PressableFeedback.Ripple />
          <CheckboxButtonGroup.Indicator />
          <CheckboxButtonGroup.ItemContent>
            <Label>{title}</Label>
            <Description>Connect your {title} integration</Description>
          </CheckboxButtonGroup.ItemContent>
        </CheckboxButtonGroup.Item>
      ))}
    </CheckboxButtonGroup>
  ),
};

export const RenderPropChildren: Story = {
  render: () => (
    <CheckboxButtonGroup
      className='w-[360px]'
      name='features-render'
      variant='secondary'
    >
      <Label>Select features</Label>
      {addons.map((addon) => (
        <CheckboxButtonGroup.Item key={addon.value} value={addon.value}>
          {() => (
            <>
              <CheckboxButtonGroup.Indicator />
              <CheckboxButtonGroup.ItemContent>
                <Label>{addon.title}</Label>
                <Description>{addon.description}</Description>
                <NumberValue
                  className='mt-2 text-sm font-semibold'
                  currency='USD'
                  maximumFractionDigits={0}
                  style='currency'
                  value={addon.price}
                >
                  <NumberValue.Suffix>
                    <span className='text-muted text-xs font-normal'>/mo</span>
                  </NumberValue.Suffix>
                </NumberValue>
              </CheckboxButtonGroup.ItemContent>
            </>
          )}
        </CheckboxButtonGroup.Item>
      ))}
    </CheckboxButtonGroup>
  ),
};

export const Controlled: Story = {
  render: function Demo() {
    const [value, setValue] = useState(['backups']);
    return (
      <div className='flex w-[360px] flex-col gap-4'>
        <CheckboxButtonGroup
          name='addons-controlled'
          value={value}
          variant='secondary'
          onChange={setValue}
        >
          <Label>Add-ons</Label>
          <Description>Select the add-ons you need</Description>
          {addons.map((addon) => (
            <CheckboxButtonGroup.Item key={addon.value} value={addon.value}>
              <CheckboxButtonGroup.Indicator />
              <AddonContent addon={addon} />
            </CheckboxButtonGroup.Item>
          ))}
        </CheckboxButtonGroup>
        <p className='text-muted text-sm'>
          Selected:{' '}
          <span className='text-foreground font-medium'>
            {value.join(', ') || 'None'}
          </span>
        </p>
      </div>
    );
  },
};

const plans = [
  [
    'gold',
    'Gold',
    0.4,
    12,
    'Full suite of saving, investing, and learning tools for you and your family.',
  ],
  [
    'silver',
    'Silver',
    0.2,
    6,
    'Level up your saving and investing skills with even more tools.',
  ],
  [
    'bronze',
    'Bronze',
    0.1,
    3,
    'Investing tools to get you started on your financial journey.',
  ],
] as const;

export const SubscriptionPlans: Story = {
  render: () => (
    <div className='flex w-[420px] flex-col items-center gap-6'>
      <div className='flex flex-col items-center gap-1 text-center'>
        <h2 className='text-3xl font-bold tracking-tight'>
          Choose a subscription
        </h2>
        <p className='text-muted text-sm'>
          Pick a plan. <Link href='#'>Try a month on us!</Link>
        </p>
      </div>
      <CheckboxButtonGroup
        className='w-full'
        defaultValue={['silver']}
        name='subscription-plan'
        style={{ '--accent': '#89c75a' } as CSSProperties}
      >
        {plans.map(([value, title, daily, monthly, description]) => (
          <CheckboxButtonGroup.Item
            className='data-[selected=true]:border-[--sub-green] data-[selected=true]:bg-[--sub-green]/10'
            key={value}
            style={{ '--sub-green': '#89c75a' } as CSSProperties}
            value={value}
          >
            {({ isSelected }) => (
              <>
                <CheckboxButtonGroup.Indicator>
                  <Icon icon='solar:check-circle-bold' />
                </CheckboxButtonGroup.Indicator>
                <CheckboxButtonGroup.ItemContent>
                  <Label className='text-lg font-bold'>{title}</Label>
                  <Description>{description}</Description>
                  <p className='mt-3 text-sm'>
                    <span className={isSelected ? 'text-success' : ''}>
                      <NumberValue
                        className='font-semibold'
                        currency='USD'
                        style='currency'
                        value={daily}
                      >
                        <NumberValue.Suffix>/day</NumberValue.Suffix>
                      </NumberValue>
                    </span>{' '}
                    <span className='text-muted'>
                      (
                      <NumberValue
                        currency='USD'
                        maximumFractionDigits={0}
                        style='currency'
                        value={monthly}
                      />{' '}
                      billed monthly)
                    </span>
                  </p>
                </CheckboxButtonGroup.ItemContent>
              </>
            )}
          </CheckboxButtonGroup.Item>
        ))}
      </CheckboxButtonGroup>
      <div className='flex w-full flex-col items-center gap-4'>
        <p className='text-muted px-2 text-center text-xs'>
          *APY is variable and subject to change at our discretion, without
          prior notice.
        </p>
        <Button
          fullWidth
          className='rounded-full text-white'
          size='lg'
          style={{ background: '#89c75a' }}
        >
          Try a month on us
        </Button>
        <Link href='#'>Compare plans</Link>
      </div>
    </div>
  ),
};
