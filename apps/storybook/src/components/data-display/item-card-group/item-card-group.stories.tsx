import type { Meta, StoryObj } from '@storybook/react';
import { Fragment, useState } from 'react';

import { Button } from '@aero/ui/button';
import { Dropdown } from '@aero/ui/dropdown';
import { InlineSelect } from '@aero/ui/inline-select';
import { ItemCard } from '@aero/ui/item-card';
import { ListBox } from '@aero/ui/list-box';
import { PressableFeedback } from '@aero/ui/pressable-feedback';
import { Separator } from '@aero/ui/separator';
import { Switch } from '@aero/ui/switch';
import { Tooltip } from '@aero/ui/tooltip';

import { Icon } from '@/icon';

import { ItemCardGroup } from './index';

const meta = {
  component: ItemCardGroup,
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
  title: 'Components/Data Display/ItemCardGroup',
} satisfies Meta<typeof ItemCardGroup>;
export default meta;
type Story = StoryObj<typeof meta>;
type Item = {
  action?: React.ReactNode;
  description?: string;
  descriptionClassName?: string;
  icon: string;
  iconClassName?: string;
  title: string;
};
const Chevron = () => (
  <Icon className='text-muted size-4' icon='solar:alt-arrow-right-linear' />
);
const defaultRowAction = <Chevron />;
function Row({
  action = defaultRowAction,
  description,
  descriptionClassName,
  icon,
  iconClassName,
  pressable = false,
  title,
}: Item & { pressable?: boolean }) {
  return (
    <ItemCard
      className={
        pressable
          ? 'hover:bg-default/20 active:bg-default-hover/50 relative w-full cursor-pointer overflow-hidden transition-colors'
          : undefined
      }
      {...(pressable
        ? {
            render: (props: React.JSX.IntrinsicElements['div']) => (
              <button type='button' {...props} />
            ),
          }
        : {})}
    >
      {pressable && <PressableFeedback.Ripple />}
      <ItemCard.Icon className={iconClassName}>
        <Icon icon={icon} />
      </ItemCard.Icon>
      <ItemCard.Content>
        <ItemCard.Title>{title}</ItemCard.Title>
        {description && (
          <ItemCard.Description className={descriptionClassName}>
            {description}
          </ItemCard.Description>
        )}
      </ItemCard.Content>
      {action !== null && <ItemCard.Action>{action}</ItemCard.Action>}
    </ItemCard>
  );
}
function Rows({
  items,
  pressable = false,
}: {
  items: Item[];
  pressable?: boolean;
}) {
  return (
    <>
      {items.map((item, index) => (
        <Fragment key={item.title}>
          {index > 0 && <Separator />}
          <Row {...item} pressable={pressable} />
        </Fragment>
      ))}
    </>
  );
}
const settings: Item[] = [
  {
    title: 'Profile',
    description: 'Update your personal information',
    icon: 'solar:user-linear',
    action: (
      <Button size='sm' variant='outline'>
        Update
      </Button>
    ),
  },
  {
    title: 'Security',
    description: 'Manage passwords and 2FA',
    icon: 'solar:key-linear',
    action: (
      <Button size='sm' variant='outline'>
        Manage
      </Button>
    ),
  },
  {
    title: 'Language',
    description: 'Choose your preferred language',
    icon: 'solar:global-linear',
    action: (
      <Button size='sm' variant='outline'>
        English
      </Button>
    ),
  },
];

export const List: Story = {
  render: () => (
    <ItemCardGroup className='w-[500px]'>
      <Rows items={settings} />
    </ItemCardGroup>
  ),
};
export const Variants: Story = {
  render: () => (
    <div className='flex w-[500px] flex-col gap-6 p-6'>
      {(
        ['default', 'secondary', 'tertiary', 'outline', 'transparent'] as const
      ).map((variant) => (
        <ItemCardGroup
          className='overflow-hidden'
          key={variant}
          variant={variant}
        >
          <ItemCardGroup.Header>
            <ItemCardGroup.Title>
              {variant[0].toUpperCase() + variant.slice(1)}
            </ItemCardGroup.Title>
            <ItemCardGroup.Description>
              {
                {
                  default: 'Surface background with shadow',
                  secondary: 'Secondary surface, no shadow',
                  tertiary: 'Tertiary surface, no shadow',
                  outline: 'Transparent with border, no shadow',
                  transparent: 'No background, no border, no shadow',
                }[variant]
              }
            </ItemCardGroup.Description>
          </ItemCardGroup.Header>
          <Rows
            items={settings.slice(0, 2).map((item) => ({
              action: <Chevron />,
              description: item.description,
              icon: item.icon,
              title: item.title,
            }))}
            pressable
          />
        </ItemCardGroup>
      ))}
    </div>
  ),
};
function HeaderDemo() {
  const [dark, setDark] = useState(false);
  return (
    <div className='w-[500px] rounded-2xl p-6'>
      <ItemCardGroup>
        <ItemCardGroup.Header>
          <ItemCardGroup.Title>General</ItemCardGroup.Title>
          <ItemCardGroup.Description>
            Manage your basic account settings
          </ItemCardGroup.Description>
        </ItemCardGroup.Header>
        <Row {...settings[2]} />
        <Row
          action={
            <Button size='sm' variant='outline'>
              System
            </Button>
          }
          description='Choose light or dark mode'
          icon='solar:palette-linear'
          title='Theme'
        />
        <Row
          action={
            <Switch
              aria-label='Switch Dark mode'
              isSelected={dark}
              onChange={setDark}
            >
              <Switch.Content>
                <Switch.Control>
                  <Switch.Thumb />
                </Switch.Control>
              </Switch.Content>
            </Switch>
          }
          description='Override system theme'
          icon='solar:moon-linear'
          title='Dark mode'
        />
      </ItemCardGroup>
    </div>
  );
}
export const WithHeader: Story = { render: () => <HeaderDemo /> };
export const Grid: Story = {
  render: () => (
    <div className='w-[600px] rounded-2xl p-6'>
      <ItemCardGroup layout='grid'>
        <Row
          action={null}
          description='Personal info'
          icon='solar:user-linear'
          title='Profile'
        />
        <Row
          action={null}
          description='2FA & passwords'
          icon='solar:key-linear'
          title='Security'
        />
        <Row
          action={null}
          description='English (US)'
          icon='solar:global-linear'
          title='Language'
        />
        <Row
          action={null}
          description='Theme & colors'
          icon='solar:palette-linear'
          title='Appearance'
        />
      </ItemCardGroup>
    </div>
  ),
};
export const GridThreeColumns: Story = {
  render: () => (
    <div className='w-[720px] rounded-2xl p-6'>
      <ItemCardGroup columns={3} layout='grid'>
        <ItemCardGroup.Header>
          <ItemCardGroup.Title>Devices</ItemCardGroup.Title>
          <ItemCardGroup.Description>
            Manage your connected devices
          </ItemCardGroup.Description>
        </ItemCardGroup.Header>
        {[
          ['MacBook Pro', 'Active now', 'solar:laptop-linear'],
          ['iMac', '3 days ago', 'solar:monitor-linear'],
          ['iPhone 15', '1 hour ago', 'solar:smartphone-linear'],
        ].map(([title, description, icon]) => (
          <Row
            action={null}
            description={description}
            icon={icon}
            key={title}
            title={title}
          />
        ))}
      </ItemCardGroup>
    </div>
  ),
};

const accounts = [
  {
    connected: true,
    description: 'junior@namespace.ninja',
    icon: 'logos:google-icon',
    name: 'Google',
  },
  {
    connected: false,
    description: 'Not Linked',
    icon: 'logos:apple',
    name: 'Apple',
  },
  {
    connected: false,
    description: 'Not Linked',
    icon: 'logos:github-icon',
    name: 'Github',
  },
  {
    connected: true,
    description: 'Account Linked',
    icon: 'logos:linkedin-icon',
    name: 'LinkedIn',
  },
  {
    connected: false,
    description: 'Not Linked',
    icon: 'simple-icons:notion',
    name: 'Notion',
  },
];
export const LinkedAccounts: Story = {
  render: () => (
    <ItemCardGroup columns={3} layout='grid'>
      {accounts.map((account) => (
        <Row
          action={
            account.connected ? (
              <Icon
                className='text-success size-5'
                icon='solar:check-circle-bold'
              />
            ) : (
              <Tooltip delay={0}>
                <Tooltip.Trigger>
                  <Button
                    aria-label={`Link ${account.name}`}
                    isIconOnly
                    size='sm'
                    variant='secondary'
                  >
                    <Icon icon='solar:add-circle-linear' />
                  </Button>
                </Tooltip.Trigger>
                <Tooltip.Content>Link {account.name}</Tooltip.Content>
              </Tooltip>
            )
          }
          description={account.description}
          icon={account.icon}
          iconClassName='bg-default text-foreground'
          key={account.name}
          title={account.name}
        />
      ))}
    </ItemCardGroup>
  ),
};
export const MultipleSections: Story = {
  render: () => (
    <div className='flex w-[500px] flex-col gap-6 rounded-2xl p-6'>
      <ItemCardGroup>
        <ItemCardGroup.Header>
          <ItemCardGroup.Title>Account</ItemCardGroup.Title>
        </ItemCardGroup.Header>
        <Row {...settings[0]} action={<Chevron />} />
        <Separator />
        <Row {...settings[1]} action={<Chevron />} />
      </ItemCardGroup>
      <ItemCardGroup>
        <ItemCardGroup.Header>
          <ItemCardGroup.Title>Preferences</ItemCardGroup.Title>
        </ItemCardGroup.Header>
        <Row {...settings[2]} />
        <Separator />
        <Row
          action={
            <Switch aria-label='Switch Dark mode'>
              <Switch.Content>
                <Switch.Control>
                  <Switch.Thumb />
                </Switch.Control>
              </Switch.Content>
            </Switch>
          }
          description='Use dark theme across the app'
          icon='solar:moon-linear'
          title='Dark mode'
        />
      </ItemCardGroup>
    </div>
  ),
};
export const Pressable: Story = {
  render: () => (
    <div className='w-[500px] rounded-2xl p-6'>
      <ItemCardGroup className='overflow-hidden'>
        <ItemCardGroup.Header>
          <ItemCardGroup.Title>Account</ItemCardGroup.Title>
          <ItemCardGroup.Description>
            Manage your account settings and preferences
          </ItemCardGroup.Description>
        </ItemCardGroup.Header>
        <Rows
          items={[
            ...settings.slice(0, 2).map((item) => ({
              action: <Chevron />,
              description: item.description,
              icon: item.icon,
              title: item.title,
            })),
            {
              title: 'Cloud sync',
              description: 'Sync data across your devices',
              icon: 'solar:cloud-linear',
            },
          ]}
          pressable
        />
      </ItemCardGroup>
    </div>
  ),
};

function SelectAction({
  label,
  multiple = false,
  options: optionsProp,
  value: valueProp,
}: {
  label: string;
  multiple?: boolean;
  options?: string[][];
  value?: string[];
}) {
  const [value, setValue] = useState<string | string[]>(
    valueProp ?? (multiple ? ['email', 'push'] : 'view'),
  );
  const options =
    optionsProp ??
    (multiple
      ? [
          ['email', 'Email'],
          ['whatsapp', 'WhatsApp'],
          ['push', 'Push Notification'],
        ]
      : [
          ['none', 'None'],
          ['view', 'View'],
          ['edit', 'Edit'],
          ['manage', 'Manage'],
        ]);
  return (
    <InlineSelect
      aria-label={label}
      selectionMode={multiple ? 'multiple' : 'single'}
      value={value}
      onChange={setValue}
    >
      <InlineSelect.Trigger>
        <InlineSelect.Value />
        <InlineSelect.Indicator />
      </InlineSelect.Trigger>
      <InlineSelect.Popover>
        <ListBox selectionMode={multiple ? 'multiple' : 'single'}>
          {options.map(([id, text]) => (
            <ListBox.Item id={id} key={id} textValue={text}>
              {text}
              <ListBox.ItemIndicator />
            </ListBox.Item>
          ))}
        </ListBox>
      </InlineSelect.Popover>
    </InlineSelect>
  );
}
export const NotificationPreferences: Story = {
  render: () => (
    <div className='w-[550px] rounded-2xl p-6'>
      <ItemCardGroup>
        <ItemCardGroup.Header>
          <ItemCardGroup.Title>Notification Preferences</ItemCardGroup.Title>
          <ItemCardGroup.Description>
            Choose how you receive notifications for each event type
          </ItemCardGroup.Description>
        </ItemCardGroup.Header>
        <Row
          action={<SelectAction label='Event Invites' multiple />}
          icon='solar:letter-linear'
          title='Event Invites'
        />
        <Separator />
        <Row
          action={
            <SelectAction
              label='Event Reminders'
              multiple
              options={[
                ['email', 'Email'],
                ['push', 'Push Notification'],
              ]}
              value={['email']}
            />
          }
          icon='solar:bell-linear'
          title='Event Reminders'
        />
        <Separator />
        <Row
          action={
            <SelectAction
              label='Event Blasts'
              multiple
              options={[
                ['email', 'Email'],
                ['push', 'Push Notification'],
              ]}
            />
          }
          icon='solar:megaphone-linear'
          title='Event Blasts'
        />
      </ItemCardGroup>
    </div>
  ),
};
export const PermissionLevels: Story = {
  render: () => (
    <div className='w-[500px] rounded-2xl p-6'>
      <ItemCardGroup variant='transparent'>
        <ItemCardGroup.Header>
          <ItemCardGroup.Title>Permissions</ItemCardGroup.Title>
          <ItemCardGroup.Description>
            Control access levels for your team
          </ItemCardGroup.Description>
        </ItemCardGroup.Header>
        {[
          ['Documents', 'Access to shared files', 'solar:folder-open-linear'],
          ['Billing', 'Payment and invoices', 'solar:bill-list-linear'],
          ['Members', 'Team member management', 'solar:user-linear'],
        ].map(([title, description, icon]) => (
          <Row
            action={<SelectAction label={`${title} permission`} />}
            description={description}
            icon={icon}
            key={title}
            title={title}
          />
        ))}
      </ItemCardGroup>
    </div>
  ),
};

const wallets = [
  {
    address: '0x34E6...6255',
    icon: 'hugeicons:wallet',
    bg: 'bg-neutral-800',
    eth: '0.0 ETH',
    name: 'Funds',
    usd: '$0.00',
  },
  {
    address: '0xD9EA...f40e',
    icon: 'hugeicons:globe',
    bg: 'bg-blue-500',
    eth: '0.0 ETH',
    name: '0xD9EA...f40e',
    usd: '$0.00',
  },
  {
    address: '0x9DC5...621a',
    icon: 'hugeicons:planet-earth',
    bg: 'bg-green-500',
    eth: '0.021 ETH',
    name: "SLMobbin's",
    usd: '$37.09',
  },
  {
    address: '0xa98b...4daa',
    icon: 'hugeicons:person',
    bg: 'bg-orange-400',
    eth: '0.0 ETH',
    name: "Sam Lee's Wallet",
    usd: '$0.00',
  },
];
export const WalletList: Story = {
  render: () => (
    <ItemCardGroup className='w-[500px]'>
      {wallets.map((wallet, index) => (
        <Fragment key={wallet.address}>
          {index > 0 && <Separator />}
          <ItemCard>
            <ItemCard.Icon
              className={`size-10 rounded-full ${wallet.bg} text-lg`}
            >
              <Icon icon={wallet.icon} width={20} />
            </ItemCard.Icon>
            <ItemCard.Content>
              <ItemCard.Title>{wallet.name}</ItemCard.Title>
              <ItemCard.Description>{wallet.address}</ItemCard.Description>
            </ItemCard.Content>
            <ItemCard.Action>
              <div className='flex items-center gap-2'>
                <div className='text-right'>
                  <p className='text-foreground text-sm font-semibold'>
                    {wallet.usd}
                  </p>
                  <p className='text-muted text-xs'>{wallet.eth}</p>
                </div>
                <Button
                  aria-label='Wallet actions'
                  isIconOnly
                  size='sm'
                  variant='ghost'
                >
                  <Icon icon='solar:menu-dots-bold' />
                </Button>
              </div>
            </ItemCard.Action>
          </ItemCard>
        </Fragment>
      ))}
    </ItemCardGroup>
  ),
};
export const DeveloperSettings: Story = {
  render: () => (
    <div className='flex w-[600px] flex-col gap-6 p-6'>
      <ItemCardGroup variant='transparent'>
        <ItemCardGroup.Header className='mb-1 flex items-center justify-between px-1.5'>
          <ItemCardGroup.Title>Source Control</ItemCardGroup.Title>
          <Dropdown>
            <Button size='sm' variant='outline'>
              Add Provider
              <Icon className='size-3' icon='solar:alt-arrow-down-linear' />
            </Button>
            <Dropdown.Popover className='min-w-[180px]' placement='bottom end'>
              <Dropdown.Menu>
                <Dropdown.Item textValue='GitHub Enterprise'>
                  <Icon className='size-4' icon='logos:github-icon' />
                  <span>GitHub Enterprise</span>
                </Dropdown.Item>
                <Dropdown.Item textValue='GitLab Self Hosted'>
                  <Icon className='size-4' icon='logos:gitlab' />
                  <span>GitLab Self Hosted</span>
                </Dropdown.Item>
              </Dropdown.Menu>
            </Dropdown.Popover>
          </Dropdown>
        </ItemCardGroup.Header>
        <ItemCardGroup className='overflow-hidden'>
          <Rows
            items={[
              {
                title: 'GitHub',
                description:
                  'Connected as @jrgarciadev to repositories in organizations: heroui-inc',
                descriptionClassName: 'max-w-xs',
                icon: 'logos:github-icon',
                action: (
                  <Button size='sm' variant='outline'>
                    Manage
                    <Icon
                      className='size-3'
                      icon='solar:alt-arrow-down-linear'
                    />
                  </Button>
                ),
              },
              {
                title: 'GitLab',
                description:
                  'Connect GitLab for Cloud Agents, Bugbot and enhanced codebase context',
                descriptionClassName: 'max-w-xs',
                icon: 'logos:gitlab',
                action: (
                  <Button size='sm' variant='outline'>
                    Connect
                    <Icon
                      className='size-3'
                      icon='solar:alt-arrow-right-linear'
                    />
                  </Button>
                ),
              },
            ]}
          />
          <Separator />
          <Row
            description='Register a GitHub Enterprise App via Manifest'
            icon='logos:github-icon'
            pressable
            title='GitHub Enterprise'
          />
          <Separator />
          <Row
            description='Register a self-hosted GitLab instance'
            icon='logos:gitlab'
            pressable
            title='GitLab Self Hosted'
          />
        </ItemCardGroup>
      </ItemCardGroup>
      <ItemCardGroup variant='transparent'>
        <ItemCardGroup.Header className='mb-1 px-1.5'>
          <ItemCardGroup.Title>Integrations</ItemCardGroup.Title>
        </ItemCardGroup.Header>
        <ItemCardGroup className='overflow-hidden'>
          <Rows
            items={[
              {
                title: 'Slack',
                description: 'Work with Cloud Agents from Slack',
                icon: 'logos:slack-icon',
                action: (
                  <Button size='sm' variant='outline'>
                    Connect
                    <Icon
                      className='size-3'
                      icon='solar:alt-arrow-right-linear'
                    />
                  </Button>
                ),
              },
              {
                title: 'Linear',
                description:
                  'Connect a Linear workspace to delegate issues to Cloud Agents',
                icon: 'simple-icons:linear',
                action: (
                  <Button size='sm' variant='outline'>
                    Connect
                    <Icon
                      className='size-3'
                      icon='solar:alt-arrow-right-linear'
                    />
                  </Button>
                ),
              },
            ]}
          />
        </ItemCardGroup>
      </ItemCardGroup>
    </div>
  ),
};
