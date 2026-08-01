import type { Meta, StoryObj } from '@storybook/react';
import emojiDataSource from 'emojibase-data/en/compact.json';
import { useMemo, useRef, useState } from 'react';

import { Button } from '@aero/ui/button';
import { EmptyState } from '@aero/ui/empty-state';
import {
  Basketball01Icon,
  Car01Icon,
  Clock01Icon,
  CurrencyIcon,
  Flag01Icon,
  FlowerIcon,
  HandPointingRight01Icon,
  Idea01Icon,
  SmileIcon,
  SpoonAndForkIcon,
} from '@aero/ui/icons';
import { HugeiconsIcon, type IconSvgElement } from '@aero/ui/icons';
import { ScrollShadow } from '@aero/ui/scroll-shadow';
import { SearchField } from '@aero/ui/search-field';
import { Tooltip } from '@aero/ui/tooltip';

import { EMOJI_SKIN_TONES, EmojiPicker } from './index';

const emojiData = emojiDataSource.filter(
  (emoji) =>
    typeof emoji.label === 'string' &&
    !emoji.label.startsWith('regional indicator'),
);

const groupIds = {
  activities: 6,
  'animals-nature': 3,
  flags: 9,
  'food-drink': 4,
  objects: 7,
  'people-body': 1,
  'smileys-emotion': 0,
  symbols: 8,
  'travel-places': 5,
} as const;

const categories: Array<{
  icon: IconSvgElement;
  id: 'frequently-used' | keyof typeof groupIds;
  label: string;
}> = [
  { icon: Clock01Icon, id: 'frequently-used', label: 'Frequently Used' },
  { icon: SmileIcon, id: 'smileys-emotion', label: 'Smileys & Emotion' },
  { icon: HandPointingRight01Icon, id: 'people-body', label: 'People & Body' },
  { icon: FlowerIcon, id: 'animals-nature', label: 'Animals & Nature' },
  { icon: SpoonAndForkIcon, id: 'food-drink', label: 'Food & Drink' },
  { icon: Basketball01Icon, id: 'activities', label: 'Activities' },
  { icon: Car01Icon, id: 'travel-places', label: 'Travel & Places' },
  { icon: Idea01Icon, id: 'objects', label: 'Objects' },
  { icon: CurrencyIcon, id: 'symbols', label: 'Symbols' },
  { icon: Flag01Icon, id: 'flags', label: 'Flags' },
];

interface PickerContentsProps {
  autoFocus?: boolean;
}

function PickerContents({ autoFocus = false }: PickerContentsProps) {
  const [tone, setTone] = useState('default');
  const gridRef = useRef<HTMLDivElement>(null);
  const items = useMemo(() => {
    const skinIndex =
      EMOJI_SKIN_TONES.findIndex((item) => item.id === tone) - 1;

    if (skinIndex < 0) return emojiData;

    return emojiData.map((emoji) => {
      const skin = emoji.skins?.[skinIndex];

      return skin ? { ...emoji, unicode: skin.unicode } : emoji;
    });
  }, [tone]);
  const groupStartIndices = useMemo(() => {
    const indices: Partial<Record<keyof typeof groupIds, number>> = {};

    for (const [id, group] of Object.entries(groupIds) as Array<
      [keyof typeof groupIds, number]
    >) {
      const index = items.findIndex((emoji) => emoji.group === group);

      if (index !== -1) indices[id] = index;
    }

    return indices;
  }, [items]);

  const scrollToGroup = (id: 'frequently-used' | keyof typeof groupIds) => {
    const grid = gridRef.current;

    if (id === 'frequently-used') {
      grid?.scrollTo({ behavior: 'smooth', top: 0 });
      return;
    }

    const index = groupStartIndices[id];

    if (!grid || index === undefined) return;

    const itemSize = 38;
    const columns = Math.floor(grid.clientWidth / itemSize);
    const top = Math.floor(index / columns) * itemSize;

    grid.scrollTo({ behavior: 'smooth', top });
  };

  return (
    <>
      <SearchField
        autoFocus={autoFocus}
        aria-label='Search emoji'
        variant='secondary'
      >
        <SearchField.Group>
          <SearchField.SearchIcon />
          <SearchField.Input placeholder='Search emoji...' />
          <EmojiPicker.SkinTonePicker value={tone} onChange={setTone}>
            <EmojiPicker.SkinToneTrigger className='mr-1' />
            <EmojiPicker.SkinToneContent>
              {EMOJI_SKIN_TONES.map((item) => (
                <EmojiPicker.SkinToneOption
                  aria-label={item.label}
                  id={item.id}
                  key={item.id}
                >
                  {item.emoji}
                </EmojiPicker.SkinToneOption>
              ))}
            </EmojiPicker.SkinToneContent>
          </EmojiPicker.SkinTonePicker>
        </SearchField.Group>
      </SearchField>
      <EmojiPicker.Grid
        ref={gridRef}
        items={items}
        renderEmptyState={() => (
          <EmptyState className='flex h-full min-h-20 flex-1 flex-col items-center justify-center gap-2'>
            <HugeiconsIcon
              aria-hidden
              className='text-muted size-5'
              icon={SmileIcon}
            />
            No emoji found.
          </EmptyState>
        )}
      >
        {(item) => (
          <EmojiPicker.Item
            id={String(item.unicode)}
            textValue={`${item.label ?? ''} ${Array.isArray(item.tags) ? item.tags.join(' ') : ''}`}
          >
            {item.unicode}
          </EmojiPicker.Item>
        )}
      </EmojiPicker.Grid>
      <EmojiPicker.Footer>
        <ScrollShadow hideScrollBar orientation='horizontal'>
          <div className='flex items-center gap-1 overflow-visible px-2 py-0.5 pr-3'>
            {categories.map(({ icon, id, label }) => (
              <Tooltip delay={0} key={id}>
                <Button
                  excludeFromTabOrder
                  isIconOnly
                  aria-label={label}
                  className='hover:bg-muted/20 flex size-6 shrink-0 items-center justify-center rounded-full rounded-md'
                  variant='ghost'
                  onPress={() => scrollToGroup(id)}
                >
                  <HugeiconsIcon
                    aria-hidden
                    icon={icon}
                    size={16}
                    strokeWidth={2}
                  />
                </Button>
                <Tooltip.Content placement='top'>
                  <p>{label}</p>
                </Tooltip.Content>
              </Tooltip>
            ))}
          </div>
        </ScrollShadow>
      </EmojiPicker.Footer>
    </>
  );
}

function DefaultDemo() {
  return (
    <EmojiPicker aria-label='Emoji' defaultValue='😀'>
      <EmojiPicker.Trigger className='text-xl'>
        <EmojiPicker.Value />
      </EmojiPicker.Trigger>
      <EmojiPicker.Popover>
        <EmojiPicker.Content>
          <PickerContents autoFocus />
        </EmojiPicker.Content>
      </EmojiPicker.Popover>
    </EmojiPicker>
  );
}

function SizesDemo() {
  return (
    <div className='flex items-end gap-4'>
      {(['sm', 'md', 'lg'] as const).map((size) => (
        <div className='flex flex-col items-center gap-2' key={size}>
          <span className='text-muted text-xs font-medium'>{size}</span>
          <EmojiPicker
            aria-label={`Emoji ${size}`}
            defaultValue='😎'
            size={size}
          >
            <EmojiPicker.Trigger className='text-xl'>
              <EmojiPicker.Value />
            </EmojiPicker.Trigger>
            <EmojiPicker.Popover>
              <EmojiPicker.Content>
                <PickerContents autoFocus />
              </EmojiPicker.Content>
            </EmojiPicker.Popover>
          </EmojiPicker>
        </div>
      ))}
    </div>
  );
}

function InlineDemo() {
  return (
    <EmojiPicker aria-label='Inline Emoji' size='md'>
      <div className='emoji-picker__popover emoji-picker__popover--md relative'>
        <EmojiPicker.Content>
          <PickerContents />
        </EmojiPicker.Content>
      </div>
    </EmojiPicker>
  );
}

function CustomCategoriesDemo() {
  return (
    <EmojiPicker aria-label='Emoji' defaultValue='😀'>
      <EmojiPicker.Trigger className='text-xl'>
        <EmojiPicker.Value />
      </EmojiPicker.Trigger>
      <EmojiPicker.Popover>
        <EmojiPicker.Content>
          <PickerContents autoFocus />
        </EmojiPicker.Content>
      </EmojiPicker.Popover>
    </EmojiPicker>
  );
}

const meta = {
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
  title: 'Components/Overlays/EmojiPicker',
} satisfies Meta;

export default meta;
type Story = StoryObj<any>;

export const Default: Story = { render: () => <DefaultDemo /> };
export const Sizes: Story = { render: () => <SizesDemo /> };
export const Inline: Story = { render: () => <InlineDemo /> };
export const CustomCategories: Story = {
  name: 'Custom Categories',
  render: () => <CustomCategoriesDemo />,
};
