import type { Meta, StoryObj } from '@storybook/react';
import emojiDataSource from 'emojibase-data/en/compact.json';
import type { Key } from 'react';
import { useMemo, useRef, useState } from 'react';
import { Size } from 'react-aria-components';
import { ListLayout, Virtualizer } from 'react-aria-components/Virtualizer';

import { Button } from '@aero/ui/button';
import { Description } from '@aero/ui/description';
import { EMOJI_SKIN_TONES, EmojiPicker } from '@aero/ui/emoji-picker';
import { EmojiReactionButton } from '@aero/ui/emoji-reaction-button';
import { EmptyState } from '@aero/ui/empty-state';
import {
  ArrowDown01Icon,
  ArrowRight01Icon,
  ArrowTurnBackwardIcon,
  ArrowTurnForwardIcon,
  Bookmark01Icon,
  Clock01Icon,
  Copy01Icon,
  Link01Icon,
  Mail01Icon,
  MoreHorizontalIcon,
  Notification01Icon,
  PinIcon,
  SmileIcon,
  Task01Icon,
  TextIcon,
} from '@aero/ui/icons';
import { HugeiconsIcon, type IconSvgElement } from '@aero/ui/icons';
import { Input } from '@aero/ui/input';
import { Label } from '@aero/ui/label';
import { ListBox } from '@aero/ui/list-box';
import { ScrollShadow } from '@aero/ui/scroll-shadow';
import { SearchField } from '@aero/ui/search-field';
import { Separator } from '@aero/ui/separator';
import { TextField } from '@aero/ui/textfield';
import { Tooltip } from '@aero/ui/tooltip';

import { Sheet } from './index';
import { occupations } from './occupations';

const meta = {
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
  title: 'Components/Overlays/Sheet',
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

function BasicDemo() {
  return (
    <Sheet>
      <Sheet.Trigger>
        <Button variant='secondary'>Open Sheet</Button>
      </Sheet.Trigger>
      <Sheet.Backdrop>
        <Sheet.Content className='mx-auto max-h-[95vh] max-w-[420px]'>
          <Sheet.Dialog>
            <Sheet.Handle />
            <Sheet.CloseTrigger />
            <Sheet.Header>
              <Sheet.Heading>Sheet Title</Sheet.Heading>
            </Sheet.Header>
            <Sheet.Body>
              <p className='text-muted text-sm'>
                This is a bottom sheet built with smooth drag-to-dismiss
                animations. Try dragging it down to close, or use the close
                button.
              </p>
            </Sheet.Body>
            <Sheet.Footer>
              <Sheet.Close>
                <Button variant='secondary'>Cancel</Button>
              </Sheet.Close>
              <Sheet.Close>
                <Button>Confirm</Button>
              </Sheet.Close>
            </Sheet.Footer>
          </Sheet.Dialog>
        </Sheet.Content>
      </Sheet.Backdrop>
    </Sheet>
  );
}

export const Basic: Story = { render: () => <BasicDemo /> };

function PlacementsDemo() {
  const placements = ['bottom', 'top', 'left', 'right'] as const;

  return (
    <div className='flex flex-wrap gap-4'>
      {placements.map((placement) => (
        <Sheet key={placement} placement={placement}>
          <Sheet.Trigger>
            <Button variant='secondary'>
              {placement.charAt(0).toUpperCase() + placement.slice(1)}
            </Button>
          </Sheet.Trigger>
          <Sheet.Backdrop variant='blur'>
            <Sheet.Content
              className={
                placement === 'left' || placement === 'right'
                  ? 'w-[400px]'
                  : undefined
              }
            >
              <Sheet.Dialog>
                <Sheet.CloseTrigger />
                {placement === 'bottom' ? <Sheet.Handle /> : null}
                <Sheet.Header>
                  <Sheet.Heading>
                    {placement.charAt(0).toUpperCase() + placement.slice(1)}{' '}
                    Sheet
                  </Sheet.Heading>
                </Sheet.Header>
                <Sheet.Body>
                  <p className='text-muted text-sm'>
                    This sheet slides in from the <strong>{placement}</strong>{' '}
                    edge of the screen with a smooth spring-like animation.
                  </p>
                </Sheet.Body>
                <Sheet.Footer>
                  <Sheet.Close>
                    <Button variant='secondary'>Cancel</Button>
                  </Sheet.Close>
                  <Sheet.Close>
                    <Button>Done</Button>
                  </Sheet.Close>
                </Sheet.Footer>
                {placement === 'top' ? <Sheet.Handle /> : null}
              </Sheet.Dialog>
            </Sheet.Content>
          </Sheet.Backdrop>
        </Sheet>
      ))}
    </div>
  );
}

export const Placements: Story = { render: () => <PlacementsDemo /> };

const snapPoints = ['148px', '355px', 1];

function SnapPointsDemo() {
  const [activeSnapPoint, setActiveSnapPoint] = useState<
    number | string | null
  >('148px');

  return (
    <Sheet
      activeSnapPoint={activeSnapPoint}
      snapPoints={snapPoints}
      onActiveSnapPointChange={setActiveSnapPoint}
    >
      <Sheet.Trigger>
        <Button variant='secondary'>Snap Points</Button>
      </Sheet.Trigger>
      <Sheet.Backdrop>
        <Sheet.Content>
          <Sheet.Dialog>
            <Sheet.Handle />
            <Sheet.Header>
              <Sheet.Heading>Snap Points</Sheet.Heading>
              <p className='text-muted text-sm'>
                Current:{' '}
                {typeof activeSnapPoint === 'number' ? '100%' : activeSnapPoint}
              </p>
            </Sheet.Header>
            <Sheet.Body>
              <div className='flex flex-col gap-4'>
                <p className='text-muted text-sm'>
                  Snap points let users drag a sheet to predefined positions.
                  This sheet snaps to 148px, 355px, and full height. The overlay
                  fades in as you reach the highest point.
                </p>
                {Array.from({ length: 6 }, (_, index) => index + 1).map(
                  (level) => (
                    <p className='text-muted text-sm' key={level}>
                      {level === 1
                        ? 'Drag the handle up to reveal more content and see the overlay fade in.'
                        : `More content at this level (${level}).`}
                    </p>
                  ),
                )}
              </div>
            </Sheet.Body>
          </Sheet.Dialog>
        </Sheet.Content>
      </Sheet.Backdrop>
    </Sheet>
  );
}

export const SnapPoints: Story = { render: () => <SnapPointsDemo /> };

const sequentialPoints = ['148px', '355px', 1];

function SnapPointsSequentialDemo() {
  const [activeSnapPoint, setActiveSnapPoint] = useState<
    number | string | null
  >('148px');

  return (
    <Sheet
      snapToSequentialPoint
      activeSnapPoint={activeSnapPoint}
      snapPoints={sequentialPoints}
      onActiveSnapPointChange={setActiveSnapPoint}
    >
      <Sheet.Trigger>
        <Button variant='secondary'>Sequential Snap Points</Button>
      </Sheet.Trigger>
      <Sheet.Backdrop>
        <Sheet.Content>
          <Sheet.Dialog>
            <Sheet.Handle />
            <Sheet.Header>
              <Sheet.Heading>Sequential</Sheet.Heading>
              <p className='text-muted text-sm'>
                Current:{' '}
                {typeof activeSnapPoint === 'number' ? '100%' : activeSnapPoint}
              </p>
            </Sheet.Header>
            <Sheet.Body>
              <p className='text-muted text-sm'>
                Velocity-based snapping is disabled with{' '}
                <code className='text-foreground'>snapToSequentialPoint</code>.
                A snap point won&apos;t be skipped even if you flick quickly.
                Useful when each level is equally important.
              </p>
            </Sheet.Body>
          </Sheet.Dialog>
        </Sheet.Content>
      </Sheet.Backdrop>
    </Sheet>
  );
}

export const SnapPointsSequential: Story = {
  name: 'Snap Points (Sequential)',
  render: () => <SnapPointsSequentialDemo />,
};

const customFadePoints = ['150px', '300px', '450px', 1];

function SnapPointsCustomFadeDemo() {
  const [activeSnapPoint, setActiveSnapPoint] = useState<
    number | string | null
  >('150px');

  return (
    <Sheet
      activeSnapPoint={activeSnapPoint}
      fadeFromIndex={1}
      snapPoints={customFadePoints}
      onActiveSnapPointChange={setActiveSnapPoint}
    >
      <Sheet.Trigger>
        <Button variant='secondary'>Custom Fade Index</Button>
      </Sheet.Trigger>
      <Sheet.Backdrop>
        <Sheet.Content>
          <Sheet.Dialog>
            <Sheet.Handle />
            <Sheet.Header>
              <Sheet.Heading>Custom Fade</Sheet.Heading>
              <p className='text-muted text-sm'>
                Current:{' '}
                {typeof activeSnapPoint === 'number' ? '100%' : activeSnapPoint}
              </p>
            </Sheet.Header>
            <Sheet.Body>
              <p className='text-muted text-sm'>
                The <code className='text-foreground'>fadeFromIndex</code> prop
                controls when the overlay starts fading in. Here it&apos;s set
                to index 1 (300px), so the overlay begins appearing at the
                second snap point instead of the last.
              </p>
            </Sheet.Body>
          </Sheet.Dialog>
        </Sheet.Content>
      </Sheet.Backdrop>
    </Sheet>
  );
}

export const SnapPointsCustomFade: Story = {
  name: 'Snap Points (Custom Fade)',
  render: () => <SnapPointsCustomFadeDemo />,
};

function BackdropVariantsDemo() {
  const variants = ['opaque', 'blur', 'transparent'] as const;

  return (
    <div className='flex flex-wrap gap-4'>
      {variants.map((variant) => (
        <Sheet key={variant}>
          <Sheet.Trigger>
            <Button variant='secondary'>
              {variant.charAt(0).toUpperCase() + variant.slice(1)}
            </Button>
          </Sheet.Trigger>
          <Sheet.Backdrop variant={variant}>
            <Sheet.Content className='mx-auto max-h-[95vh] max-w-[420px]'>
              <Sheet.Dialog>
                <Sheet.Handle />
                <Sheet.CloseTrigger />
                <Sheet.Header>
                  <Sheet.Heading>
                    Backdrop:{' '}
                    {variant.charAt(0).toUpperCase() + variant.slice(1)}
                  </Sheet.Heading>
                </Sheet.Header>
                <Sheet.Body>
                  <p className='text-muted text-sm'>
                    This sheet uses the{' '}
                    <code className='text-foreground'>{variant}</code> backdrop
                    variant.
                  </p>
                </Sheet.Body>
                <Sheet.Footer>
                  <Sheet.Close>
                    <Button className='w-full'>Close</Button>
                  </Sheet.Close>
                </Sheet.Footer>
              </Sheet.Dialog>
            </Sheet.Content>
          </Sheet.Backdrop>
        </Sheet>
      ))}
    </div>
  );
}

export const BackdropVariants: Story = {
  render: () => <BackdropVariantsDemo />,
};

function NonDismissableDemo() {
  return (
    <Sheet isDismissable={false}>
      <Sheet.Trigger>
        <Button variant='secondary'>Important Action</Button>
      </Sheet.Trigger>
      <Sheet.Backdrop>
        <Sheet.Content className='mx-auto max-w-[420px]'>
          <Sheet.Dialog>
            <Sheet.Header>
              <Sheet.Heading>Confirm Action</Sheet.Heading>
            </Sheet.Header>
            <Sheet.Body>
              <p className='text-muted text-sm'>
                This sheet cannot be dismissed by clicking outside or dragging.
                You must use one of the buttons below.
              </p>
            </Sheet.Body>
            <Sheet.Footer>
              <Sheet.Close>
                <Button variant='secondary'>Cancel</Button>
              </Sheet.Close>
              <Sheet.Close>
                <Button>Confirm</Button>
              </Sheet.Close>
            </Sheet.Footer>
          </Sheet.Dialog>
        </Sheet.Content>
      </Sheet.Backdrop>
    </Sheet>
  );
}

export const NonDismissable: Story = { render: () => <NonDismissableDemo /> };

function ScrollableContentDemo() {
  return (
    <Sheet>
      <Sheet.Trigger>
        <Button variant='secondary'>Terms &amp; Conditions</Button>
      </Sheet.Trigger>
      <Sheet.Backdrop>
        <Sheet.Content className='mx-auto max-h-[95vh] max-w-[420px]'>
          <Sheet.Dialog>
            <Sheet.Handle />
            <Sheet.CloseTrigger />
            <Sheet.Header>
              <Sheet.Heading>Terms &amp; Conditions</Sheet.Heading>
            </Sheet.Header>
            <Sheet.Body>
              {Array.from({ length: 20 }, (_, index) => index + 1).map(
                (paragraphNumber) => (
                  <p className='text-muted mb-3 text-sm' key={paragraphNumber}>
                    Paragraph {paragraphNumber}: Lorem ipsum dolor sit amet,
                    consectetur adipiscing elit. Nullam pulvinar risus non risus
                    hendrerit venenatis. Pellentesque sit amet hendrerit risus,
                    sed porttitor quam. Donec nec vestibulum libero.
                  </p>
                ),
              )}
            </Sheet.Body>
            <Sheet.Footer>
              <Sheet.Close>
                <Button variant='secondary'>Decline</Button>
              </Sheet.Close>
              <Sheet.Close>
                <Button>Accept</Button>
              </Sheet.Close>
            </Sheet.Footer>
          </Sheet.Dialog>
        </Sheet.Content>
      </Sheet.Backdrop>
    </Sheet>
  );
}

export const ScrollableContent: Story = {
  render: () => <ScrollableContentDemo />,
};

function WithFormDemo() {
  return (
    <Sheet placement='right'>
      <Sheet.Trigger>
        <Button variant='secondary'>Edit Profile</Button>
      </Sheet.Trigger>
      <Sheet.Backdrop>
        <Sheet.Content className='w-[400px]'>
          <Sheet.Dialog>
            <Sheet.CloseTrigger />
            <Sheet.Header>
              <Sheet.Heading>Edit Profile</Sheet.Heading>
            </Sheet.Header>
            <Sheet.Body>
              <form className='flex flex-col gap-4'>
                <TextField className='w-full' name='name' type='text'>
                  <Label>Name</Label>
                  <Input placeholder='Enter your name' variant='secondary' />
                </TextField>
                <TextField className='w-full' name='email' type='email'>
                  <Label>Email</Label>
                  <Input placeholder='Enter your email' variant='secondary' />
                </TextField>
                <TextField className='w-full' name='bio'>
                  <Label>Bio</Label>
                  <Input
                    placeholder='Tell us about yourself'
                    variant='secondary'
                  />
                </TextField>
              </form>
            </Sheet.Body>
            <Sheet.Footer>
              <Sheet.Close>
                <Button variant='secondary'>Cancel</Button>
              </Sheet.Close>
              <Sheet.Close>
                <Button>Save Changes</Button>
              </Sheet.Close>
            </Sheet.Footer>
          </Sheet.Dialog>
        </Sheet.Content>
      </Sheet.Backdrop>
    </Sheet>
  );
}

export const WithForm: Story = { render: () => <WithFormDemo /> };

function DetachedDemo() {
  const placements = ['bottom', 'top', 'left', 'right'] as const;

  return (
    <div className='flex flex-wrap gap-4'>
      {placements.map((placement) => (
        <Sheet isDetached key={placement} placement={placement}>
          <Sheet.Trigger>
            <Button variant='secondary'>
              {placement.charAt(0).toUpperCase() + placement.slice(1)}
            </Button>
          </Sheet.Trigger>
          <Sheet.Backdrop>
            <Sheet.Content
              className={
                placement === 'left' || placement === 'right'
                  ? 'w-[310px]'
                  : 'mx-auto max-w-[420px]'
              }
            >
              <Sheet.Dialog
                className={
                  placement === 'left' || placement === 'right'
                    ? 'h-full'
                    : undefined
                }
              >
                {placement === 'bottom' ? <Sheet.Handle /> : null}
                <Sheet.Body className='flex flex-col gap-4 py-5'>
                  <Sheet.Heading>Detached {placement}</Sheet.Heading>
                  <p className='text-muted text-sm'>
                    The sheet floats away from the viewport edge with rounded
                    corners on all sides.
                  </p>
                </Sheet.Body>
                {placement === 'top' ? <Sheet.Handle /> : null}
              </Sheet.Dialog>
            </Sheet.Content>
          </Sheet.Backdrop>
        </Sheet>
      ))}
    </div>
  );
}

export const Detached: Story = { render: () => <DetachedDemo /> };

function ControlledDemo() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className='flex flex-col items-start gap-4'>
      <div className='flex items-center gap-3'>
        <Button size='sm' variant='secondary' onPress={() => setIsOpen(true)}>
          Open Sheet
        </Button>
        <Button size='sm' variant='tertiary' onPress={() => setIsOpen(!isOpen)}>
          Toggle
        </Button>
        <p className='text-muted text-xs'>
          Status:{' '}
          <span className='text-foreground font-mono font-medium'>
            {isOpen ? 'open' : 'closed'}
          </span>
        </p>
      </div>
      <Sheet isOpen={isOpen} onOpenChange={setIsOpen}>
        <Sheet.Backdrop>
          <Sheet.Content className='mx-auto max-w-[420px]'>
            <Sheet.Dialog>
              <Sheet.Handle />
              <Sheet.CloseTrigger />
              <Sheet.Header>
                <Sheet.Heading>Controlled Sheet</Sheet.Heading>
              </Sheet.Header>
              <Sheet.Body>
                <p className='text-muted text-sm'>
                  This sheet is controlled via <code>isOpen</code> and{' '}
                  <code>onOpenChange</code> props. The parent manages the state
                  externally.
                </p>
              </Sheet.Body>
              <Sheet.Footer>
                <Sheet.Close>
                  <Button variant='secondary'>Close</Button>
                </Sheet.Close>
              </Sheet.Footer>
            </Sheet.Dialog>
          </Sheet.Content>
        </Sheet.Backdrop>
      </Sheet>
    </div>
  );
}

export const Controlled: Story = { render: () => <ControlledDemo /> };

function HandleOnlyDemo() {
  return (
    <Sheet isHandleOnly>
      <Sheet.Trigger>
        <Button variant='secondary'>Handle Only</Button>
      </Sheet.Trigger>
      <Sheet.Backdrop>
        <Sheet.Content className='mx-auto max-w-[420px]'>
          <Sheet.Dialog>
            <Sheet.Handle />
            <Sheet.CloseTrigger />
            <Sheet.Header>
              <Sheet.Heading>Handle-Only Drag</Sheet.Heading>
            </Sheet.Header>
            <Sheet.Body>
              <p className='text-muted text-sm'>
                This sheet can only be dragged via the handle at the top.
                Dragging the body content will not dismiss it — useful when the
                body has interactive elements.
              </p>
            </Sheet.Body>
            <Sheet.Footer>
              <Sheet.Close>
                <Button>Done</Button>
              </Sheet.Close>
            </Sheet.Footer>
          </Sheet.Dialog>
        </Sheet.Content>
      </Sheet.Backdrop>
    </Sheet>
  );
}

export const HandleOnly: Story = { render: () => <HandleOnlyDemo /> };

const nestedHeight = 'h-[320px]';

function NestedDemo() {
  return (
    <Sheet>
      <Sheet.Trigger>
        <Button variant='secondary'>Open Parent Sheet</Button>
      </Sheet.Trigger>
      <Sheet.Backdrop>
        <Sheet.Content className='mx-auto max-w-[420px]'>
          <Sheet.Dialog className={nestedHeight}>
            <Sheet.Handle />
            <Sheet.CloseTrigger />
            <Sheet.Header>
              <Sheet.Heading>Parent Sheet</Sheet.Heading>
            </Sheet.Header>
            <Sheet.Body className='flex flex-col justify-between pb-4'>
              <p className='text-muted mb-4 text-sm'>
                This is the parent sheet. Open a nested sheet from here — the
                parent will scale down and the child slides on top.
              </p>
              <Sheet.NestedRoot>
                <Sheet.Trigger>
                  <Button className='w-full' variant='secondary'>
                    Open Nested Sheet
                  </Button>
                </Sheet.Trigger>
                <Sheet.Backdrop>
                  <Sheet.Content className='mx-auto max-w-[420px]'>
                    <Sheet.Dialog className={nestedHeight}>
                      <Sheet.Handle />
                      <Sheet.CloseTrigger />
                      <Sheet.Header>
                        <Sheet.Heading>Nested Sheet</Sheet.Heading>
                      </Sheet.Header>
                      <Sheet.Body>
                        <p className='text-muted mb-4 text-sm'>
                          This is a nested sheet that sits on top of the parent.
                          Drag it down to dismiss and return to the parent
                          sheet.
                        </p>
                        <Sheet.NestedRoot>
                          <Sheet.Trigger>
                            <Button className='w-full' variant='secondary'>
                              Go Deeper
                            </Button>
                          </Sheet.Trigger>
                          <Sheet.Backdrop>
                            <Sheet.Content className='mx-auto max-w-[420px]'>
                              <Sheet.Dialog className={nestedHeight}>
                                <Sheet.Handle />
                                <Sheet.CloseTrigger />
                                <Sheet.Header>
                                  <Sheet.Heading>Third Level</Sheet.Heading>
                                </Sheet.Header>
                                <Sheet.Body>
                                  <p className='text-muted text-sm'>
                                    Three levels deep! Each parent sheet scales
                                    down as the next one opens, creating a
                                    stacking effect.
                                  </p>
                                </Sheet.Body>
                                <Sheet.Footer>
                                  <Sheet.Close>
                                    <Button className='w-full'>Close</Button>
                                  </Sheet.Close>
                                </Sheet.Footer>
                              </Sheet.Dialog>
                            </Sheet.Content>
                          </Sheet.Backdrop>
                        </Sheet.NestedRoot>
                      </Sheet.Body>
                      <Sheet.Footer>
                        <Sheet.Close>
                          <Button variant='secondary'>Back</Button>
                        </Sheet.Close>
                      </Sheet.Footer>
                    </Sheet.Dialog>
                  </Sheet.Content>
                </Sheet.Backdrop>
              </Sheet.NestedRoot>
            </Sheet.Body>
          </Sheet.Dialog>
        </Sheet.Content>
      </Sheet.Backdrop>
    </Sheet>
  );
}

export const Nested: Story = { render: () => <NestedDemo /> };

const sheetEmojiData = emojiDataSource.filter(
  (emoji) =>
    typeof emoji.label === 'string' &&
    !emoji.label.startsWith('regional indicator'),
);
const withEmojiUnicode = (
  emoji: (typeof sheetEmojiData)[number],
  unicode: string,
) => ({
  ...emoji,
  unicode,
});
const sheetEmojiGroups = {
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
const sheetEmojiCategories: Array<{
  icon: string;
  id: keyof typeof sheetEmojiGroups;
  label: string;
}> = [
  { icon: '😀', id: 'smileys-emotion', label: 'Smileys & Emotion' },
  { icon: '👋', id: 'people-body', label: 'People & Body' },
  { icon: '🐱', id: 'animals-nature', label: 'Animals & Nature' },
  { icon: '🍕', id: 'food-drink', label: 'Food & Drink' },
  { icon: '⚽', id: 'activities', label: 'Activities' },
  { icon: '🚗', id: 'travel-places', label: 'Travel & Places' },
  { icon: '💡', id: 'objects', label: 'Objects' },
  { icon: '🔣', id: 'symbols', label: 'Symbols' },
  { icon: '🏁', id: 'flags', label: 'Flags' },
];

function SheetEmojiPicker({
  onEmojiSelect,
}: {
  onEmojiSelect?: (emoji: string) => void;
}) {
  const [tone, setTone] = useState('default');
  const gridRef = useRef<HTMLDivElement>(null);
  const items = useMemo(() => {
    const skinIndex =
      EMOJI_SKIN_TONES.findIndex((item) => item.id === tone) - 1;
    const data = sheetEmojiData.slice(0, 200);

    if (skinIndex < 0) return data;

    return data.map((emoji) => {
      const skin = emoji.skins?.[skinIndex];

      return skin ? withEmojiUnicode(emoji, skin.unicode) : emoji;
    });
  }, [tone]);
  const groupStarts = useMemo(() => {
    const starts: Partial<Record<keyof typeof sheetEmojiGroups, number>> = {};

    for (const [id, group] of Object.entries(sheetEmojiGroups) as Array<
      [keyof typeof sheetEmojiGroups, number]
    >) {
      const index = items.findIndex((emoji) => emoji.group === group);

      if (index !== -1) starts[id] = index;
    }

    return starts;
  }, [items]);

  const scrollToGroup = (id: keyof typeof sheetEmojiGroups) => {
    const grid = gridRef.current;
    const index = groupStarts[id];

    if (!grid || index === undefined) return;

    const itemSize = 48;
    const columns = Math.floor(grid.clientWidth / itemSize);

    grid.scrollTo({
      behavior: 'smooth',
      top: Math.floor(index / columns) * itemSize,
    });
  };

  return (
    <EmojiPicker
      aria-label='Emoji sheet picker'
      className='h-full min-h-0'
      size='lg'
      onSelectionChange={(key) => {
        if (key != null) onEmojiSelect?.(String(key));
      }}
    >
      <EmojiPicker.Content className='h-full'>
        <SearchField aria-label='Search emoji' variant='secondary'>
          <SearchField.Group>
            <SearchField.SearchIcon />
            <SearchField.Input placeholder='Search' />
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
          layoutOptions={{
            maxItemSize: new Size(48, 48),
            minItemSize: new Size(48, 48),
          }}
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
              {sheetEmojiCategories.map(({ icon, id, label }) => (
                <Tooltip delay={0} key={id}>
                  <Button
                    excludeFromTabOrder
                    isIconOnly
                    aria-label={label}
                    className='hover:bg-muted/20 text-muted flex size-8 shrink-0 items-center justify-center rounded-full rounded-md'
                    variant='ghost'
                    onPress={() => scrollToGroup(id)}
                  >
                    <span aria-hidden className='text-base leading-none'>
                      {icon}
                    </span>
                  </Button>
                  <Tooltip.Content placement='top'>
                    <p>{label}</p>
                  </Tooltip.Content>
                </Tooltip>
              ))}
            </div>
          </ScrollShadow>
        </EmojiPicker.Footer>
      </EmojiPicker.Content>
    </EmojiPicker>
  );
}

function EmojiPickerSheetDemo() {
  const emojiSheetSnapPoints = ['355px', 1];
  const [activeSnapPoint, setActiveSnapPoint] = useState<
    number | string | null
  >('355px');
  const [isOpen, setIsOpen] = useState(false);
  const [emoji, setEmoji] = useState('😀');

  return (
    <Sheet
      isDetached
      activeSnapPoint={activeSnapPoint}
      isOpen={isOpen}
      snapPoints={emojiSheetSnapPoints}
      onActiveSnapPointChange={setActiveSnapPoint}
      onOpenChange={setIsOpen}
    >
      <Sheet.Trigger>
        <Button variant='secondary'>
          <span className='text-lg'>{emoji}</span> Emoji Picker
        </Button>
      </Sheet.Trigger>
      <Sheet.Backdrop>
        <Sheet.Content className='mx-auto max-h-[95vh] max-w-[420px]'>
          <Sheet.Dialog>
            <Sheet.Handle />
            <Sheet.Body className='min-h-0 overflow-hidden p-0'>
              <SheetEmojiPicker
                onEmojiSelect={(value) => {
                  setEmoji(value);
                  setIsOpen(false);
                }}
              />
            </Sheet.Body>
          </Sheet.Dialog>
        </Sheet.Content>
      </Sheet.Backdrop>
    </Sheet>
  );
}

export const EmojiPickerSheet: Story = {
  name: 'Emoji Picker Sheet',
  render: () => <EmojiPickerSheetDemo />,
};

function ActionIcon({ icon }: { icon: IconSvgElement }) {
  return (
    <HugeiconsIcon
      aria-hidden
      className='text-muted size-5 shrink-0'
      icon={icon}
      strokeWidth={2}
    />
  );
}

function SlackMessageActionsDemo() {
  const sheetSnapPoints = ['355px', 1];
  const [activeSnapPoint, setActiveSnapPoint] = useState<
    number | string | null
  >('355px');
  const [showMore, setShowMore] = useState(false);
  const [reactions, setReactions] = useState<
    Record<string, { count: number; selected: boolean }>
  >({});
  const quickReactions = ['🚀', '🙌', '👍', '🤔', '🙏'];
  const toggleReaction = (emoji: string) => {
    setReactions((current) => {
      const reaction = current[emoji];

      if (!reaction)
        return { ...current, [emoji]: { count: 1, selected: true } };

      const selected = !reaction.selected;
      const count = selected ? reaction.count + 1 : reaction.count - 1;

      if (count < 1) {
        const next = { ...current };
        delete next[emoji];
        return next;
      }

      return { ...current, [emoji]: { count, selected } };
    });
  };
  const addReaction = (key: Key | null) => {
    if (key == null) return;

    const emoji = String(key);
    setReactions((current) => ({
      ...current,
      [emoji]: {
        count: (current[emoji]?.count ?? 0) + 1,
        selected: false,
      },
    }));
  };

  return (
    <Sheet
      activeSnapPoint={activeSnapPoint}
      snapPoints={sheetSnapPoints}
      onActiveSnapPointChange={setActiveSnapPoint}
    >
      <Sheet.Trigger>
        <Button variant='secondary'>Slack message actions</Button>
      </Sheet.Trigger>
      <Sheet.Backdrop>
        <Sheet.Content className='mx-auto max-h-[95vh] max-w-[420px]'>
          <Sheet.Dialog>
            <Sheet.Handle />
            <Sheet.Body className='px-0 pt-0'>
              <div className='flex items-center justify-center gap-2 px-4 pt-1 pb-3'>
                {quickReactions.map((emoji) => {
                  const reaction = reactions[emoji];

                  return (
                    <EmojiReactionButton
                      isSelected={reaction?.selected ?? false}
                      key={emoji}
                      size='lg'
                      onChange={() => toggleReaction(emoji)}
                    >
                      <EmojiReactionButton.Emoji>
                        {emoji}
                      </EmojiReactionButton.Emoji>
                      {reaction && reaction.count > 0 ? (
                        <EmojiReactionButton.Count>
                          {reaction.count}
                        </EmojiReactionButton.Count>
                      ) : null}
                    </EmojiReactionButton>
                  );
                })}
                <EmojiPicker
                  aria-label='Add reaction'
                  size='md'
                  onSelectionChange={addReaction}
                >
                  <EmojiPicker.Trigger
                    aria-label='Add reaction'
                    className='emoji-reaction-button emoji-reaction-button--lg min-h-0 min-w-0'
                  >
                    <HugeiconsIcon aria-hidden icon={SmileIcon} size={20} />
                  </EmojiPicker.Trigger>
                  <EmojiPicker.Popover>
                    <EmojiPicker.Content>
                      <SearchField
                        autoFocus
                        aria-label='Search emoji'
                        variant='secondary'
                      >
                        <SearchField.Group>
                          <SearchField.SearchIcon />
                          <SearchField.Input placeholder='Search emoji...' />
                        </SearchField.Group>
                      </SearchField>
                      <EmojiPicker.Grid items={sheetEmojiData}>
                        {(item) => (
                          <EmojiPicker.Item
                            id={String(item.unicode)}
                            textValue={`${item.label ?? ''} ${item.tags?.join(' ') ?? ''}`}
                          >
                            {item.unicode}
                          </EmojiPicker.Item>
                        )}
                      </EmojiPicker.Grid>
                    </EmojiPicker.Content>
                  </EmojiPicker.Popover>
                </EmojiPicker>
              </div>
              <div className='grid grid-cols-3 gap-2 px-4 pb-3'>
                {[
                  ['Reply', ArrowTurnBackwardIcon],
                  ['Forward', ArrowTurnForwardIcon],
                  ['Save', Bookmark01Icon],
                ].map(([label, icon]) => (
                  <Button
                    className='flex h-auto w-full flex-col gap-1.5 rounded-xl py-3'
                    key={label as string}
                    variant='tertiary'
                  >
                    <HugeiconsIcon
                      aria-hidden
                      icon={icon as IconSvgElement}
                      size={20}
                    />
                    <span className='text-xs font-medium'>
                      {label as string}
                    </span>
                  </Button>
                ))}
              </div>
              <ListBox
                aria-label='Message actions'
                className='w-full'
                selectionMode='none'
                onAction={(key) => {
                  if (key === 'more-actions') setShowMore(!showMore);
                }}
              >
                <ListBox.Section>
                  <ListBox.Item id='mark-unread' textValue='Mark Unread'>
                    <ActionIcon icon={Mail01Icon} />
                    <Label>Mark Unread</Label>
                  </ListBox.Item>
                  <ListBox.Item id='remind-me' textValue='Remind Me'>
                    <ActionIcon icon={Clock01Icon} />
                    <Label>Remind Me</Label>
                  </ListBox.Item>
                  <ListBox.Item
                    id='get-reply-notifications'
                    textValue='Get Reply Notifications'
                  >
                    <ActionIcon icon={Notification01Icon} />
                    <Label>Get Reply Notifications</Label>
                  </ListBox.Item>
                </ListBox.Section>
                <Separator />
                <ListBox.Section>
                  <ListBox.Item id='copy-link' textValue='Copy Link to Message'>
                    <ActionIcon icon={Link01Icon} />
                    <Label>Copy Link to Message</Label>
                  </ListBox.Item>
                  <ListBox.Item id='copy-message' textValue='Copy Message'>
                    <ActionIcon icon={Copy01Icon} />
                    <Label>Copy Message</Label>
                  </ListBox.Item>
                </ListBox.Section>
                <Separator />
                <ListBox.Section>
                  <ListBox.Item id='more-actions' textValue='More Actions'>
                    <ActionIcon icon={MoreHorizontalIcon} />
                    <Label>More Actions</Label>
                    <HugeiconsIcon
                      aria-hidden
                      className='text-muted ms-auto size-4 shrink-0'
                      icon={showMore ? ArrowDown01Icon : ArrowRight01Icon}
                    />
                  </ListBox.Item>
                  {showMore ? (
                    <>
                      <ListBox.Item id='add-to-list' textValue='Add to List'>
                        <ActionIcon icon={Task01Icon} />
                        <Label>Add to List</Label>
                      </ListBox.Item>
                      <ListBox.Item
                        id='pin-to-channel'
                        textValue='Pin to Channel'
                      >
                        <ActionIcon icon={PinIcon} />
                        <Label>Pin to Channel</Label>
                      </ListBox.Item>
                      <ListBox.Item id='select-text' textValue='Select Text'>
                        <ActionIcon icon={TextIcon} />
                        <Label>Select Text</Label>
                      </ListBox.Item>
                      <ListBox.Item
                        id='link-existing'
                        textValue='Link existing...'
                      >
                        <ActionIcon icon={Link01Icon} />
                        <div className='flex flex-col'>
                          <Label>Link existing...</Label>
                          <Description>
                            Links an existing issue or project in Linear
                          </Description>
                        </div>
                      </ListBox.Item>
                      <ListBox.Item
                        id='turn-into-poll'
                        textValue='Turn question into poll'
                      >
                        <ActionIcon icon={Task01Icon} />
                        <div className='flex flex-col'>
                          <Label>Turn question into poll</Label>
                          <Description>
                            Turns a message into a Simple Poll question
                          </Description>
                        </div>
                      </ListBox.Item>
                    </>
                  ) : null}
                </ListBox.Section>
              </ListBox>
            </Sheet.Body>
          </Sheet.Dialog>
        </Sheet.Content>
      </Sheet.Backdrop>
    </Sheet>
  );
}

export const SlackMessageActions: Story = {
  name: 'Slack-like Message Actions',
  render: () => <SlackMessageActionsDemo />,
};

function ProfessionsPickerDemo() {
  const occupationSnapPoints = ['355px', 1];
  const [activeSnapPoint, setActiveSnapPoint] = useState<
    number | string | null
  >('355px');
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<string | null>(null);
  const filtered = useMemo(() => {
    const values = occupations.map((name, id) => ({ id, name }));

    if (!query) return values;

    const normalizedQuery = query.toLowerCase();

    return values.filter((occupation) =>
      occupation.name.toLowerCase().includes(normalizedQuery),
    );
  }, [query]);

  return (
    <div className='flex flex-col items-center gap-3'>
      <Sheet
        activeSnapPoint={activeSnapPoint}
        isOpen={isOpen}
        snapPoints={occupationSnapPoints}
        onActiveSnapPointChange={setActiveSnapPoint}
        onOpenChange={(open) => {
          setIsOpen(open);
          if (!open) setQuery('');
        }}
      >
        <Sheet.Trigger>
          <Button variant='secondary'>Choose Occupation</Button>
        </Sheet.Trigger>
        <Sheet.Backdrop>
          <Sheet.Content className='mx-auto max-h-[95vh] max-w-[420px]'>
            <Sheet.Dialog>
              <Sheet.Handle />
              <Sheet.Body className='flex min-h-0 flex-col gap-0 overflow-hidden p-0'>
                <div className='px-4 pt-1 pb-2'>
                  <SearchField
                    aria-label='Search occupations'
                    value={query}
                    variant='secondary'
                    onChange={setQuery}
                  >
                    <SearchField.Group>
                      <SearchField.SearchIcon />
                      <SearchField.Input placeholder='Search' />
                      <SearchField.ClearButton />
                    </SearchField.Group>
                  </SearchField>
                </div>
                {filtered.length === 0 ? (
                  <EmptyState className='flex min-h-32 flex-1 flex-col items-center justify-center gap-2'>
                    <HugeiconsIcon
                      aria-hidden
                      className='text-muted size-5'
                      icon={SmileIcon}
                    />
                    <p className='text-muted text-sm'>No occupations found.</p>
                  </EmptyState>
                ) : (
                  <Virtualizer
                    layout={ListLayout}
                    layoutOptions={{ padding: 12, rowHeight: 36 }}
                  >
                    <ListBox
                      aria-label='Occupations'
                      className='min-h-0 flex-1 overflow-y-auto p-0'
                      items={filtered}
                      selectionMode='single'
                      onAction={(key) => {
                        const occupation = occupations[Number(key)];

                        if (occupation) {
                          setSelected(occupation);
                          setIsOpen(false);
                        }
                      }}
                    >
                      {(occupation) => (
                        <ListBox.Item
                          id={occupation.id}
                          textValue={occupation.name}
                        >
                          <Label>{occupation.name}</Label>
                        </ListBox.Item>
                      )}
                    </ListBox>
                  </Virtualizer>
                )}
              </Sheet.Body>
            </Sheet.Dialog>
          </Sheet.Content>
        </Sheet.Backdrop>
      </Sheet>
      <p className='text-muted text-sm'>
        Selected:{' '}
        <span className='text-foreground font-medium'>{selected}</span>
      </p>
    </div>
  );
}

export const ProfessionsPicker: Story = {
  render: () => <ProfessionsPickerDemo />,
};
