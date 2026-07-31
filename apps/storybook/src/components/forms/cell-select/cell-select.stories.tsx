import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';

import { Globe02Icon, PaintBoardIcon, SmileIcon } from '@aero/ui/icons';
import { HugeiconsIcon, type IconSvgElement } from '@aero/ui/icons';

import { ListBox } from '@/components/collections/list-box';

import { CellSelect } from './index';

const meta = {
  component: CellSelect,
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
  title: 'Components/Forms/CellSelect',
} satisfies Meta<typeof CellSelect>;
export default meta;
type Story = StoryObj<typeof meta>;

const themes = [
  { id: 'default', name: 'Default' },
  { id: 'dark', name: 'Dark' },
  { id: 'system', name: 'System' },
];

function ThemeItems() {
  return themes.map((item) => (
    <ListBox.Item id={item.id} key={item.id} textValue={item.name}>
      {item.name}
      <ListBox.ItemIndicator />
    </ListBox.Item>
  ));
}

function ThemeSelect({
  variant = 'default',
}: {
  variant?: 'default' | 'secondary';
}) {
  const [value, setValue] = useState('default');
  return (
    <CellSelect
      aria-label='Theme'
      value={value}
      variant={variant}
      onChange={setValue}
    >
      <CellSelect.Trigger>
        <CellSelect.Label>Theme</CellSelect.Label>
        <CellSelect.Value />
        <CellSelect.Indicator />
      </CellSelect.Trigger>
      <CellSelect.Popover>
        <ListBox>
          <ThemeItems />
        </ListBox>
      </CellSelect.Popover>
    </CellSelect>
  );
}

export const Default: Story = {
  render: () => (
    <div className='w-[252px]'>
      <ThemeSelect />
    </div>
  ),
};

export const Variants: Story = {
  render: () => (
    <div className='flex w-[252px] flex-col gap-3'>
      {(['default', 'secondary'] as const).map((variant) => (
        <div className='flex flex-col gap-1' key={variant}>
          <span className='text-muted text-xs'>{variant}</span>
          <ThemeSelect variant={variant} />
        </div>
      ))}
    </div>
  ),
};

export const Controlled: Story = {
  render: function Demo() {
    const [value, setValue] = useState('default');
    const selected = themes.find((item) => item.id === value);
    return (
      <div className='flex w-[252px] flex-col gap-2'>
        <CellSelect aria-label='Theme' value={value} onChange={setValue}>
          <CellSelect.Trigger>
            <CellSelect.Label>Theme</CellSelect.Label>
            <CellSelect.Value />
            <CellSelect.Indicator />
          </CellSelect.Trigger>
          <CellSelect.Popover>
            <ListBox>
              <ThemeItems />
            </ListBox>
          </CellSelect.Popover>
        </CellSelect>
        <p className='text-muted px-1 text-sm'>
          Selected: {selected?.name ?? 'None'}
        </p>
      </div>
    );
  },
};

const settings = [
  { label: 'Theme', options: themes, value: 'default' },
  {
    label: 'Language',
    options: [
      { id: 'en', name: 'English' },
      { id: 'es', name: 'Spanish' },
      { id: 'fr', name: 'French' },
    ],
    value: 'en',
  },
  {
    label: 'Font size',
    options: [
      { id: 'sm', name: 'Small' },
      { id: 'md', name: 'Medium' },
      { id: 'lg', name: 'Large' },
    ],
    value: 'md',
  },
];

function SettingSelect({ setting }: { setting: (typeof settings)[number] }) {
  const [value, setValue] = useState(setting.value);
  return (
    <CellSelect aria-label={setting.label} value={value} onChange={setValue}>
      <CellSelect.Trigger>
        <CellSelect.Label>{setting.label}</CellSelect.Label>
        <CellSelect.Value />
        <CellSelect.Indicator />
      </CellSelect.Trigger>
      <CellSelect.Popover>
        <ListBox>
          {setting.options.map((item) => (
            <ListBox.Item id={item.id} key={item.id} textValue={item.name}>
              {item.name}
              <ListBox.ItemIndicator />
            </ListBox.Item>
          ))}
        </ListBox>
      </CellSelect.Popover>
    </CellSelect>
  );
}

export const SettingsGroup: Story = {
  render: () => (
    <div className='flex w-[252px] flex-col gap-2'>
      {settings.map((setting) => (
        <SettingSelect key={setting.label} setting={setting} />
      ))}
    </div>
  ),
};

const iconSets = [
  { icon: SmileIcon, id: 'gravity', name: 'Gravity' },
  { icon: PaintBoardIcon, id: 'heroicons', name: 'Heroicons' },
  { icon: Globe02Icon, id: 'lucide', name: 'Lucide' },
];

function IconSetGlyph({ icon }: { icon: IconSvgElement }) {
  return <HugeiconsIcon aria-hidden icon={icon} size={16} strokeWidth={2} />;
}

export const CustomValue: Story = {
  render: function Demo() {
    const [value, setValue] = useState('gravity');
    return (
      <div className='w-[252px]'>
        <CellSelect aria-label='Icon set' value={value} onChange={setValue}>
          <CellSelect.Trigger>
            <CellSelect.Label>Icons</CellSelect.Label>
            <CellSelect.Value>
              {({ defaultChildren, isPlaceholder, state }) => {
                if (isPlaceholder || state.selectedItems.length === 0)
                  return defaultChildren;
                const item = iconSets.find(
                  (option) => option.id === state.selectedItems[0]?.key,
                );
                return item ? (
                  <span className='flex items-center justify-end gap-1.5 text-end'>
                    {item.name}
                    <span className='text-muted'>
                      <IconSetGlyph icon={item.icon} />
                    </span>
                  </span>
                ) : (
                  defaultChildren
                );
              }}
            </CellSelect.Value>
          </CellSelect.Trigger>
          <CellSelect.Popover>
            <ListBox>
              {iconSets.map((item) => (
                <ListBox.Item id={item.id} key={item.id} textValue={item.name}>
                  <IconSetGlyph icon={item.icon} />
                  {item.name}
                  <ListBox.ItemIndicator />
                </ListBox.Item>
              ))}
            </ListBox>
          </CellSelect.Popover>
        </CellSelect>
      </div>
    );
  },
};

const fonts = [
  { id: 'inter', name: 'Inter' },
  { id: 'roboto', name: 'Roboto' },
  { id: 'system', name: 'System' },
  { id: 'georgia', name: 'Georgia' },
];

function FontSelect({
  label,
  variant = 'default',
}: {
  label: string;
  variant?: 'default' | 'secondary';
}) {
  const [value, setValue] = useState('inter');
  return (
    <CellSelect
      aria-label={`${label} font`}
      value={value}
      variant={variant}
      onChange={setValue}
    >
      <CellSelect.Trigger>
        <CellSelect.Label>{label}</CellSelect.Label>
        <CellSelect.Value>
          {({ defaultChildren, isPlaceholder, state }) => {
            if (isPlaceholder || state.selectedItems.length === 0)
              return defaultChildren;
            const item = fonts.find(
              (option) => option.id === state.selectedItems[0]?.key,
            );
            return item ? (
              <span className='flex items-center justify-end gap-1.5 text-end'>
                {item.name}
                <span className='text-foreground text-sm font-medium'>Ag</span>
              </span>
            ) : (
              defaultChildren
            );
          }}
        </CellSelect.Value>
      </CellSelect.Trigger>
      <CellSelect.Popover>
        <ListBox>
          {fonts.map((item) => (
            <ListBox.Item id={item.id} key={item.id} textValue={item.name}>
              {item.name}
              <ListBox.ItemIndicator />
            </ListBox.Item>
          ))}
        </ListBox>
      </CellSelect.Popover>
    </CellSelect>
  );
}

export const FontFamily: Story = {
  render: () => (
    <div className='flex w-[252px] flex-col gap-2'>
      <span className='text-muted text-sm'>Font Family</span>
      <FontSelect label='Heading' />
      <FontSelect label='Body' variant='secondary' />
    </div>
  ),
};

export const Disabled: Story = {
  render: () => (
    <div className='w-[252px]'>
      <CellSelect isDisabled aria-label='Theme' value='default'>
        <CellSelect.Trigger>
          <CellSelect.Label>Theme</CellSelect.Label>
          <CellSelect.Value />
          <CellSelect.Indicator />
        </CellSelect.Trigger>
        <CellSelect.Popover>
          <ListBox>
            <ThemeItems />
          </ListBox>
        </CellSelect.Popover>
      </CellSelect>
    </div>
  ),
};
