import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';

import { EmojiReactionButton } from './index';

const meta = {
  component: EmojiReactionButton,
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
  title: 'Components/Buttons/EmojiReactionButton',
} satisfies Meta<typeof EmojiReactionButton>;
export default meta;
type Story = StoryObj<any>;

const initial = {
  '❤️': { count: 12, selected: true },
  '🎉': { count: 1, selected: false },
  '👍': { count: 5, selected: false },
  '😂': { count: 3, selected: false },
  '🚀': { count: 1, selected: false },
};

export const Default: Story = {
  render: function Demo() {
    const [reactions, setReactions] = useState(initial);
    const toggle = (emoji: keyof typeof initial) =>
      setReactions((current) => {
        const item = current[emoji];
        const selected = !item.selected;
        const count = selected ? item.count + 1 : item.count - 1;
        if (count < 1) {
          const next = { ...current };
          delete next[emoji];
          return next;
        }
        return { ...current, [emoji]: { count, selected } };
      });
    return (
      <div className='flex flex-wrap items-center gap-2'>
        {Object.entries(reactions).map(([emoji, item]) => (
          <EmojiReactionButton
            isSelected={item.selected}
            key={emoji}
            onChange={() => toggle(emoji as keyof typeof initial)}
          >
            <EmojiReactionButton.Emoji>{emoji}</EmojiReactionButton.Emoji>
            {item.count > 0 ? (
              <EmojiReactionButton.Count>
                {item.count}
              </EmojiReactionButton.Count>
            ) : null}
          </EmojiReactionButton>
        ))}
      </div>
    );
  },
};

export const Sizes: Story = {
  render: () => (
    <div className='flex flex-col items-start gap-4'>
      {(['sm', 'md', 'lg'] as const).map((size) => (
        <div className='flex items-center gap-3' key={size}>
          <span className='text-muted w-8 text-xs font-medium'>{size}</span>
          <div className='flex items-center gap-2'>
            <EmojiReactionButton isSelected size={size}>
              <EmojiReactionButton.Emoji>👍</EmojiReactionButton.Emoji>
              <EmojiReactionButton.Count>5</EmojiReactionButton.Count>
            </EmojiReactionButton>
            <EmojiReactionButton size={size}>
              <EmojiReactionButton.Emoji>😂</EmojiReactionButton.Emoji>
              <EmojiReactionButton.Count>2</EmojiReactionButton.Count>
            </EmojiReactionButton>
            <EmojiReactionButton size={size}>
              <EmojiReactionButton.Emoji>🎉</EmojiReactionButton.Emoji>
              <EmojiReactionButton.Count>1</EmojiReactionButton.Count>
            </EmojiReactionButton>
          </div>
        </div>
      ))}
    </div>
  ),
};

export const Disabled: Story = {
  render: () => (
    <div className='flex items-center gap-2'>
      <EmojiReactionButton isDisabled isSelected>
        <EmojiReactionButton.Emoji>❤️</EmojiReactionButton.Emoji>
        <EmojiReactionButton.Count>12</EmojiReactionButton.Count>
      </EmojiReactionButton>
      <EmojiReactionButton isDisabled>
        <EmojiReactionButton.Emoji>👍</EmojiReactionButton.Emoji>
        <EmojiReactionButton.Count>3</EmojiReactionButton.Count>
      </EmojiReactionButton>
    </div>
  ),
};

export const ReadOnly: Story = {
  render: () => (
    <div className='flex items-center gap-2'>
      <EmojiReactionButton isReadOnly isSelected>
        <EmojiReactionButton.Emoji>❤️</EmojiReactionButton.Emoji>
        <EmojiReactionButton.Count>12</EmojiReactionButton.Count>
      </EmojiReactionButton>
      <EmojiReactionButton isReadOnly>
        <EmojiReactionButton.Emoji>👍</EmojiReactionButton.Emoji>
        <EmojiReactionButton.Count>3</EmojiReactionButton.Count>
      </EmojiReactionButton>
    </div>
  ),
};
