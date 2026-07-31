import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';

import { Button } from '@aero/ui/button';
import { Chip } from '@aero/ui/chip';
import { Dropdown } from '@aero/ui/dropdown';
import { InlineSelect } from '@aero/ui/inline-select';
import { ListBox } from '@aero/ui/list-box';
import { PressableFeedback } from '@aero/ui/pressable-feedback';
import { Separator } from '@aero/ui/separator';
import { Switch } from '@aero/ui/switch';
import { Tooltip } from '@aero/ui/tooltip';

import { Icon } from '@/icon';

import { ItemCard } from './index';

const meta = {
  component: ItemCard,
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
  title: 'Components/Data Display/ItemCard',
} satisfies Meta<typeof ItemCard>;
export default meta;
type Story = StoryObj<typeof meta>;
const Glyph = ({ icon }: { icon: string }) => <Icon icon={icon} />;
const Arrow = () => (
  <Icon className='text-muted size-4' icon='solar:alt-arrow-right-linear' />
);
const defaultCardAction = <Arrow />;
function Card({
  action = defaultCardAction,
  description,
  icon = 'solar:global-linear',
  title,
  variant = 'default',
}: {
  action?: React.ReactNode;
  description?: string;
  icon?: string;
  title: React.ReactNode;
  variant?: 'default' | 'outline' | 'secondary' | 'tertiary' | 'transparent';
}) {
  return (
    <ItemCard variant={variant}>
      <ItemCard.Icon>
        <Glyph icon={icon} />
      </ItemCard.Icon>
      <ItemCard.Content>
        <ItemCard.Title>{title}</ItemCard.Title>
        {description && (
          <ItemCard.Description>{description}</ItemCard.Description>
        )}
      </ItemCard.Content>
      <ItemCard.Action>{action}</ItemCard.Action>
    </ItemCard>
  );
}

export const Default: Story = {
  render: () => (
    <div className='w-[500px] rounded-2xl p-6'>
      <Card
        action={
          <Button size='sm' variant='outline'>
            English <Arrow />
          </Button>
        }
        description='Choose your preferred language'
        title='Language'
      />
    </div>
  ),
};
export const Variants: Story = {
  render: () => (
    <div className='w-[500px] space-y-3 p-6'>
      {(
        ['default', 'secondary', 'tertiary', 'outline', 'transparent'] as const
      ).map((variant) => (
        <Card
          description={
            {
              default: 'Surface background with shadow',
              secondary: 'Secondary surface, no shadow',
              tertiary: 'Tertiary surface, no shadow',
              outline: 'Transparent with border, no shadow',
              transparent: 'No background, no border, no shadow',
            }[variant]
          }
          icon={
            {
              default: 'solar:global-linear',
              secondary: 'solar:palette-linear',
              tertiary: 'solar:moon-linear',
              outline: 'solar:key-linear',
              transparent: 'solar:bell-linear',
            }[variant]
          }
          key={variant}
          title={variant[0].toUpperCase() + variant.slice(1)}
          variant={variant}
        />
      ))}
    </div>
  ),
};
export const WithoutIcon: Story = {
  render: () => (
    <div className='w-[500px] rounded-2xl p-6'>
      <ItemCard>
        <ItemCard.Content>
          <ItemCard.Title>Delete account</ItemCard.Title>
          <ItemCard.Description>
            Permanently remove your account and all data
          </ItemCard.Description>
        </ItemCard.Content>
        <ItemCard.Action>
          <Button size='sm' variant='danger-soft'>
            Delete
          </Button>
        </ItemCard.Action>
      </ItemCard>
    </div>
  ),
};
function SwitchCard() {
  const [selected, setSelected] = useState(false);
  return (
    <div className='w-[500px] rounded-2xl p-6'>
      <Card
        action={
          <Switch
            aria-label='Switch Dark mode'
            isSelected={selected}
            onChange={setSelected}
          >
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
    </div>
  );
}
export const WithSwitch: Story = { render: () => <SwitchCard /> };
export const VerticalStack: Story = {
  render: () => (
    <div className='w-[500px] space-y-2 rounded-2xl p-6'>
      {[
        ['Profile', 'Update your personal information', 'solar:user-linear'],
        ['Security', 'Manage passwords and 2FA', 'solar:key-linear'],
        ['Cloud sync', 'Sync data across your devices', 'solar:cloud-linear'],
      ].map(([title, description, icon]) => (
        <Card description={description} icon={icon} key={title} title={title} />
      ))}
    </div>
  ),
};
export const TitleOnly: Story = {
  render: () => (
    <div className='w-[500px] rounded-2xl p-6'>
      <Card icon='solar:palette-linear' title='Appearance' />
    </div>
  ),
};
export const EmailSetting: Story = {
  render: () => (
    <div className='w-[600px] rounded-2xl p-6'>
      <ItemCard>
        <ItemCard.Content>
          <ItemCard.Title>
            junior@namespace.ninja{' '}
            <Chip className='ml-2 align-middle' size='sm' variant='soft'>
              Primary
            </Chip>
          </ItemCard.Title>
          <ItemCard.Description>
            Notifications and account updates will be sent to this address.
          </ItemCard.Description>
        </ItemCard.Content>
        <ItemCard.Action>
          <Dropdown>
            <Tooltip delay={0}>
              <Tooltip.Trigger>
                <Button
                  aria-label='Actions'
                  isIconOnly
                  size='sm'
                  variant='outline'
                >
                  <Glyph icon='solar:menu-dots-bold' />
                </Button>
              </Tooltip.Trigger>
              <Tooltip.Content>Actions</Tooltip.Content>
            </Tooltip>
            <Dropdown.Popover className='min-w-[180px]' placement='bottom end'>
              <Dropdown.Menu>
                <Dropdown.Item textValue='Change Email'>
                  <Glyph icon='solar:pen-linear' />
                  <span>Change Email</span>
                </Dropdown.Item>
                <Dropdown.Item textValue='Set as Primary'>
                  <Glyph icon='solar:star-linear' />
                  <span>Set as Primary</span>
                </Dropdown.Item>
                <Separator />
                <Dropdown.Item textValue='Remove Email'>
                  <Glyph icon='solar:trash-bin-trash-linear' />
                  <span className='text-danger'>Remove Email</span>
                </Dropdown.Item>
              </Dropdown.Menu>
            </Dropdown.Popover>
          </Dropdown>
        </ItemCard.Action>
      </ItemCard>
    </div>
  ),
};
export const DeviceList: Story = {
  render: () => (
    <div className='w-[500px] space-y-2 rounded-2xl p-6'>
      {[
        [
          'MacBook Pro',
          'Last active: 2 minutes ago',
          'solar:smartphone-linear',
        ],
        ['iMac', 'Last active: 3 days ago', 'solar:monitor-linear'],
        [
          'iPhone 15 Pro',
          'Last active: 1 hour ago',
          'solar:shield-check-linear',
        ],
      ].map(([title, description, icon], index) => (
        <Card
          action={
            index === 0 ? (
              <Chip color='success' size='sm' variant='soft'>
                Active
              </Chip>
            ) : (
              <Button size='sm' variant='outline'>
                Revoke
              </Button>
            )
          }
          description={description}
          icon={icon}
          key={title}
          title={title}
        />
      ))}
    </div>
  ),
};
export const Pressable: Story = {
  render: () => (
    <div className='w-[500px] space-y-4 rounded-2xl p-6'>
      <ItemCard
        className='relative w-full cursor-pointer overflow-hidden'
        render={(props) => <button type='button' {...props} />}
      >
        <PressableFeedback.Highlight />
        <ItemCard.Icon>
          <Glyph icon='solar:user-linear' />
        </ItemCard.Icon>
        <ItemCard.Content>
          <ItemCard.Title>Account settings</ItemCard.Title>
          <ItemCard.Description>
            Manage your account preferences
          </ItemCard.Description>
        </ItemCard.Content>
        <ItemCard.Action>
          <Arrow />
        </ItemCard.Action>
      </ItemCard>
      <ItemCard
        className='relative w-full cursor-pointer overflow-hidden'
        render={(props) => <button type='button' {...props} />}
      >
        <PressableFeedback.Ripple />
        <ItemCard.Icon>
          <Glyph icon='solar:key-linear' />
        </ItemCard.Icon>
        <ItemCard.Content className='w-full flex-1'>
          <ItemCard.Title>Security</ItemCard.Title>
          <ItemCard.Description>
            Passwords and two-factor authentication
          </ItemCard.Description>
        </ItemCard.Content>
        <ItemCard.Action>
          <Arrow />
        </ItemCard.Action>
      </ItemCard>
    </div>
  ),
};
function SelectCard({ multiple = false }: { multiple?: boolean }) {
  const [value, setValue] = useState<string | string[]>(
    multiple ? ['email', 'push'] : 'en',
  );
  const options = multiple
    ? [
        ['email', 'Email'],
        ['whatsapp', 'WhatsApp'],
        ['push', 'Push Notification'],
      ]
    : [
        ['en', 'English'],
        ['es', 'Spanish'],
        ['fr', 'French'],
        ['ja', 'Japanese'],
      ];
  return (
    <div className='w-[500px] rounded-2xl p-6'>
      <Card
        action={
          <InlineSelect
            aria-label={multiple ? 'Event Invites channels' : 'Language'}
            selectionMode={multiple ? 'multiple' : 'single'}
            style={
              multiple
                ? { '--inline-select-value-max-width': '8rem' }
                : undefined
            }
            value={value}
            onChange={setValue}
          >
            <InlineSelect.Trigger>
              <InlineSelect.Value />
              <InlineSelect.Indicator />
            </InlineSelect.Trigger>
            <InlineSelect.Popover>
              <ListBox selectionMode={multiple ? 'multiple' : 'single'}>
                {options.map(([id, label]) => (
                  <ListBox.Item id={id} key={id} textValue={label}>
                    {label}
                    <ListBox.ItemIndicator />
                  </ListBox.Item>
                ))}
              </ListBox>
            </InlineSelect.Popover>
          </InlineSelect>
        }
        description={
          multiple
            ? 'Choose how you receive invitations'
            : 'Choose your preferred language'
        }
        icon={multiple ? 'solar:bell-linear' : 'solar:global-linear'}
        title={multiple ? 'Event Invites' : 'Language'}
      />
    </div>
  );
}
export const WithSelect: Story = { render: () => <SelectCard /> };
export const WalletCard: Story = {
  render: () => (
    <div className='w-[500px] rounded-2xl p-6'>
      <ItemCard>
        <ItemCard.Icon className='size-10 rounded-full bg-green-500 text-lg'>
          <Icon icon='hugeicons:globe' width={20} />
        </ItemCard.Icon>
        <ItemCard.Content>
          <ItemCard.Title>SLMobbin&apos;s</ItemCard.Title>
          <ItemCard.Description>0x9DC5...621a</ItemCard.Description>
        </ItemCard.Content>
        <ItemCard.Action>
          <div className='flex items-center gap-2'>
            <div className='text-right'>
              <p className='text-foreground text-sm font-semibold'>$34.99</p>
              <p className='text-muted text-xs'>0.021 ETH</p>
            </div>
            <Button
              aria-label='Wallet actions'
              isIconOnly
              size='sm'
              variant='ghost'
            >
              <Glyph icon='solar:menu-dots-bold' />
            </Button>
          </div>
        </ItemCard.Action>
      </ItemCard>
    </div>
  ),
};
export const WithMultiSelect: Story = { render: () => <SelectCard multiple /> };
