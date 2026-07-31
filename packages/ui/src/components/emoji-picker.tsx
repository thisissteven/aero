'use client';

import { cn, Popover as HeroPopover } from '@heroui/react';
import type { ComponentPropsWithRef, ReactElement, ReactNode } from 'react';
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react';
import type {
  AutocompleteProps,
  GridLayoutOptions,
  ListBoxItemProps,
  ListBoxProps,
  PopoverProps,
  SelectProps,
} from 'react-aria-components';
import {
  Autocomplete,
  Button,
  GridLayout,
  ListBox,
  ListBoxItem,
  Popover,
  Select,
  SelectValue,
  Size,
  Virtualizer,
} from 'react-aria-components';

export type EmojiPickerSize = 'lg' | 'md' | 'sm';
interface EmojiContextValue {
  size: EmojiPickerSize;
}
const EmojiContext = createContext<EmojiContextValue>({ size: 'md' });
const classes = (base: string, className: unknown): string =>
  cn(base, typeof className === 'string' ? className : undefined) ?? base;
const defaultEmojiFilter = (textValue: string, inputValue: string) =>
  textValue.toLocaleLowerCase().includes(inputValue.toLocaleLowerCase());
export interface EmojiPickerRootProps<T extends object> extends SelectProps<T> {
  size?: EmojiPickerSize;
}
export function EmojiPickerRoot<T extends object>({
  children,
  size = 'md',
  ...props
}: EmojiPickerRootProps<T>): ReactElement {
  const value = useMemo(() => ({ size }), [size]);
  return (
    <EmojiContext value={value}>
      <Select data-slot='emoji-picker' {...props}>
        {children}
      </Select>
    </EmojiContext>
  );
}
export type EmojiPickerTriggerProps = ComponentPropsWithRef<typeof Button>;
export function EmojiPickerTrigger({
  className,
  ...props
}: EmojiPickerTriggerProps): ReactElement {
  return (
    <Button
      className={classes('emoji-picker__trigger', className)}
      data-slot='emoji-picker-trigger'
      {...props}
    />
  );
}
export type EmojiPickerValueProps = ComponentPropsWithRef<typeof SelectValue>;
export function EmojiPickerValue({
  className,
  ...props
}: EmojiPickerValueProps): ReactElement {
  return (
    <SelectValue
      className={classes('emoji-picker__value', className)}
      data-slot='emoji-picker-value'
      {...props}
    />
  );
}
export interface EmojiPickerPopoverProps extends PopoverProps {
  offset?: number;
}
export function EmojiPickerPopover({
  className,
  offset = 4,
  placement = 'bottom',
  ...props
}: EmojiPickerPopoverProps): ReactElement {
  const { size } = useContext(EmojiContext);
  return (
    <Popover
      className={classes(
        `emoji-picker__popover emoji-picker__popover--${size}`,
        className,
      )}
      data-slot='emoji-picker-popover'
      offset={offset}
      placement={placement}
      {...props}
    />
  );
}
export interface EmojiPickerContentProps extends ComponentPropsWithRef<'div'> {
  filter?: AutocompleteProps<object>['filter'];
}
export function EmojiPickerContent({
  children,
  className,
  filter,
  ...props
}: EmojiPickerContentProps): ReactElement {
  return (
    <div
      className={classes('emoji-picker__content', className)}
      data-slot='emoji-picker-content'
      {...props}
    >
      <Autocomplete filter={filter ?? defaultEmojiFilter}>
        {children}
      </Autocomplete>
    </div>
  );
}
export interface EmojiPickerGridProps<T extends object> extends Omit<
  ListBoxProps<T>,
  'layout'
> {
  layoutOptions?: GridLayoutOptions;
}
export function EmojiPickerGrid<T extends object>({
  className,
  layoutOptions,
  renderEmptyState,
  ...props
}: EmojiPickerGridProps<T>): ReactElement {
  const options = useMemo<GridLayoutOptions>(
    () => ({
      maxItemSize: new Size(36, 36),
      minItemSize: new Size(36, 36),
      minSpace: new Size(2, 2),
      preserveAspectRatio: true,
      ...layoutOptions,
    }),
    [layoutOptions],
  );
  return (
    <Virtualizer layout={GridLayout} layoutOptions={options}>
      <ListBox
        aria-label={props['aria-label'] ?? 'Emoji grid'}
        className={classes('emoji-picker__grid', className)}
        data-slot='emoji-picker-grid'
        layout='grid'
        {...(renderEmptyState
          ? {
              renderEmptyState: (values) => (
                <div
                  className='emoji-picker__empty'
                  data-slot='emoji-picker-empty'
                >
                  {renderEmptyState(values)}
                </div>
              ),
            }
          : {})}
        {...props}
      />
    </Virtualizer>
  );
}
export type EmojiPickerItemProps = ListBoxItemProps;
export function EmojiPickerItem({
  className,
  ...props
}: EmojiPickerItemProps): ReactElement {
  const { size } = useContext(EmojiContext);
  return (
    <ListBoxItem
      className={classes(
        `emoji-picker__item emoji-picker__item--${size}`,
        className,
      )}
      data-slot='emoji-picker-item'
      {...props}
    />
  );
}
export function EmojiPickerFooter({
  className,
  ...props
}: ComponentPropsWithRef<'div'>): ReactElement {
  return (
    <div
      className={classes('emoji-picker__footer', className)}
      data-slot='emoji-picker-footer'
      {...props}
    />
  );
}
export interface EmojiSkinToneItem {
  emoji: string;
  id: string;
  label: string;
}
export const EMOJI_SKIN_TONES: EmojiSkinToneItem[] = [
  { emoji: '✋', id: 'default', label: 'Default' },
  { emoji: '✋🏻', id: 'light', label: 'Light' },
  { emoji: '✋🏼', id: 'medium-light', label: 'Medium-Light' },
  { emoji: '✋🏽', id: 'medium', label: 'Medium' },
  { emoji: '✋🏾', id: 'medium-dark', label: 'Medium-Dark' },
  { emoji: '✋🏿', id: 'dark', label: 'Dark' },
];
interface ToneContextValue {
  close: () => void;
  setValue: (value: string) => void;
  value: string;
}
const ToneContext = createContext<ToneContextValue>({
  close: () => undefined,
  setValue: () => undefined,
  value: 'default',
});
export interface EmojiPickerSkinTonePickerProps {
  children: ReactNode;
  defaultValue?: string;
  onChange?: (value: string) => void;
  value?: string;
}
export function EmojiPickerSkinTonePicker({
  children,
  defaultValue = 'default',
  onChange,
  value,
}: EmojiPickerSkinTonePickerProps): ReactElement {
  const [open, setOpen] = useState(false);
  const [localValue, setLocalValue] = useState(defaultValue);
  const current = value ?? localValue;
  const setValue = useCallback(
    (next: string) => {
      if (value === undefined) setLocalValue(next);
      onChange?.(next);
    },
    [onChange, value],
  );
  const context = useMemo(
    () => ({ close: () => setOpen(false), setValue, value: current }),
    [current, setValue],
  );
  return (
    <ToneContext value={context}>
      <HeroPopover isOpen={open} onOpenChange={setOpen}>
        {children}
      </HeroPopover>
    </ToneContext>
  );
}
export interface EmojiPickerSkinToneTriggerProps extends Omit<
  EmojiPickerTriggerProps,
  'children'
> {
  children?: ReactNode;
  tones?: EmojiSkinToneItem[];
}
export function EmojiPickerSkinToneTrigger({
  'aria-label': ariaLabel = 'Select skin tone',
  children,
  className,
  tones = EMOJI_SKIN_TONES,
  ...props
}: EmojiPickerSkinToneTriggerProps): ReactElement {
  const { value } = useContext(ToneContext);
  const current = tones.find((tone) => tone.id === value) ?? tones[0];
  return (
    <HeroPopover.Trigger>
      <Button
        aria-label={ariaLabel}
        className={classes('emoji-picker__skin-tone-picker', className)}
        data-slot='emoji-picker-skin-tone-picker'
        {...props}
      >
        {children ?? current?.emoji}
      </Button>
    </HeroPopover.Trigger>
  );
}
export interface EmojiPickerSkinToneContentProps {
  'aria-label'?: string;
  children: ReactNode;
  className?: string;
  offset?: number;
  placement?: ComponentPropsWithRef<typeof HeroPopover.Content>['placement'];
}
export function EmojiPickerSkinToneContent({
  'aria-label': ariaLabel = 'Skin tone',
  children,
  className,
  offset = 4,
  placement = 'bottom end',
}: EmojiPickerSkinToneContentProps): ReactElement {
  return (
    <HeroPopover.Content offset={offset} placement={placement}>
      <HeroPopover.Dialog
        aria-label={ariaLabel}
        className={classes('emoji-picker__skin-tone-options', className)}
        data-slot='emoji-picker-skin-tone-options'
      >
        {children}
      </HeroPopover.Dialog>
    </HeroPopover.Content>
  );
}
export interface EmojiPickerSkinToneOptionProps extends ComponentPropsWithRef<'button'> {
  id: string;
}
export function EmojiPickerSkinToneOption({
  className,
  id,
  onClick,
  ...props
}: EmojiPickerSkinToneOptionProps): ReactElement {
  const state = useContext(ToneContext);
  return (
    <button
      type='button'
      {...props}
      className={cn('emoji-picker__skin-tone-option', className)}
      data-selected={id === state.value ? 'true' : undefined}
      data-slot='emoji-picker-skin-tone-option'
      onClick={(event) => {
        onClick?.(event);
        state.setValue(id);
        state.close();
      }}
    />
  );
}
type EmojiPickerComponent = typeof EmojiPickerRoot & {
  Content: typeof EmojiPickerContent;
  Footer: typeof EmojiPickerFooter;
  Grid: typeof EmojiPickerGrid;
  Item: typeof EmojiPickerItem;
  Popover: typeof EmojiPickerPopover;
  Root: typeof EmojiPickerRoot;
  SkinToneContent: typeof EmojiPickerSkinToneContent;
  SkinToneOption: typeof EmojiPickerSkinToneOption;
  SkinTonePicker: typeof EmojiPickerSkinTonePicker;
  SkinToneTrigger: typeof EmojiPickerSkinToneTrigger;
  Trigger: typeof EmojiPickerTrigger;
  Value: typeof EmojiPickerValue;
};
export const EmojiPicker: EmojiPickerComponent = Object.assign(
  EmojiPickerRoot,
  {
    Content: EmojiPickerContent,
    Footer: EmojiPickerFooter,
    Grid: EmojiPickerGrid,
    Item: EmojiPickerItem,
    Popover: EmojiPickerPopover,
    Root: EmojiPickerRoot,
    SkinToneContent: EmojiPickerSkinToneContent,
    SkinToneOption: EmojiPickerSkinToneOption,
    SkinTonePicker: EmojiPickerSkinTonePicker,
    SkinToneTrigger: EmojiPickerSkinToneTrigger,
    Trigger: EmojiPickerTrigger,
    Value: EmojiPickerValue,
  },
);
