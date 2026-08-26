'use client';

import { CloseButton, cn } from '@heroui/react';
import type { ComponentPropsWithRef, ReactElement, ReactNode } from 'react';
import React from 'react';
import { createContext, useContext, useMemo } from 'react';
import {
  Dialog,
  Header,
  Input,
  Menu,
  MenuItem,
  MenuSection,
  Modal,
  ModalOverlay,
  SearchField,
  Separator,
} from 'react-aria-components';
import { Autocomplete } from 'react-aria-components/Autocomplete';

export type CommandSize = 'lg' | 'md' | 'sm';
export type CommandBackdropVariant = 'blur' | 'opaque' | 'transparent';
type Slots = { size?: CommandSize };
const Context = createContext<Slots>({});
const defaultContextValue: Slots = {};
const defaultCommandFilter = (textValue: string, query: string) =>
  textValue.toLocaleLowerCase().includes(query.toLocaleLowerCase());

export interface CommandRootProps {
  children: ReactNode;
}
export function CommandRoot({ children }: CommandRootProps): ReactElement {
  return <Context value={defaultContextValue}>{children}</Context>;
}

export interface CommandBackdropProps extends ComponentPropsWithRef<
  typeof ModalOverlay
> {
  variant?: CommandBackdropVariant;
}
export function CommandBackdrop({
  children,
  className,
  isDismissable = true,
  variant = 'opaque',
  ...props
}: CommandBackdropProps): ReactElement {
  return (
    <ModalOverlay
      {...props}
      className={
        cn(
          'command__backdrop',
          `command__backdrop--${variant}`,
          typeof className === 'string' ? className : undefined,
        ) ?? 'command__backdrop'
      }
      data-slot='command-backdrop'
      isDismissable={isDismissable}
    >
      {children}
    </ModalOverlay>
  );
}

export interface CommandContainerProps extends ComponentPropsWithRef<
  typeof Modal
> {
  size?: CommandSize;
}
export function CommandContainer({
  children,
  className,
  size = 'md',
  ...props
}: CommandContainerProps): ReactElement {
  const value = useMemo(() => ({ size }), [size]);
  return (
    <Modal
      {...props}
      className={
        cn(
          'command__container',
          typeof className === 'string' ? className : undefined,
        ) ?? 'command__container'
      }
      data-slot='command-container'
    >
      {(renderProps) => (
        <Context value={value}>
          {typeof children === 'function' ? children(renderProps) : children}
        </Context>
      )}
    </Modal>
  );
}

export interface CommandDialogProps extends Omit<
  ComponentPropsWithRef<typeof Dialog>,
  'children'
> {
  children: ReactNode;
  defaultInputValue?: string;
  filter?: (textValue: string, inputValue: string) => boolean;
  inputValue?: string;
  onInputChange?: (value: string) => void;
  allowEscape?: boolean;
}
export function CommandDialog({
  children,
  className,
  allowEscape,
  ...props
}: CommandDialogProps): ReactElement {
  const { size = 'md' } = useContext(Context);
  return (
    <Dialog
      {...props}
      aria-label={props['aria-label'] ?? 'Command palette'}
      className={
        cn(
          'command__dialog',
          `command__dialog--${size}`,
          typeof className === 'string' ? className : undefined,
        ) ?? 'command__dialog'
      }
      data-slot='command-dialog'
    >
      {/* 1. Extract the native React Aria close function safely via render props */}
      {({ close }) => (
        <div
          role='presentation'
          style={{
            display: 'contents',
          }} /* Keeps the DOM structure visual styles seamless */

          /* 2. Catch Escape at the HTML layer before the input intercepts it */
          onKeyDownCapture={(e) => {
            if (e.key === 'Escape' && allowEscape) {
              e.preventDefault();
              e.stopPropagation(); // Stop SearchField from clearing text
              close(); // Directly close the Dialog container
            }
          }}
        >
          <Autocomplete
            {...(props.defaultInputValue === undefined
              ? {}
              : { defaultInputValue: props.defaultInputValue })}
            filter={props.filter ?? defaultCommandFilter}
            {...(props.inputValue === undefined
              ? {}
              : { inputValue: props.inputValue })}
            {...(props.onInputChange === undefined
              ? {}
              : { onInputChange: props.onInputChange })}
          >
            {children}
          </Autocomplete>
        </div>
      )}
    </Dialog>
  );
}

export type CommandHeaderProps = ComponentPropsWithRef<'div'>;
export function CommandHeader({
  className,
  ...props
}: CommandHeaderProps): ReactElement {
  return (
    <div
      {...props}
      className={cn('command__header', className)}
      data-slot='command-header'
    />
  );
}

export interface CommandInputGroupProps extends Omit<
  ComponentPropsWithRef<typeof SearchField>,
  'children'
> {
  children: ReactNode;
  autoFocus?: boolean;
}
export function CommandInputGroup({
  autoFocus = true,
  children,
  className,
  ...props
}: CommandInputGroupProps): ReactElement {
  return (
    <SearchField
      {...props}
      aria-label={props['aria-label'] ?? 'Search commands'}
      // Opening a command palette intentionally transfers focus to its search field.
      // oxlint-disable-next-line jsx-a11y/no-autofocus
      autoFocus={autoFocus}
      className={
        cn(
          'command__input-group',
          typeof className === 'string' ? className : undefined,
        ) ?? 'command__input-group'
      }
      data-slot='command-input-group'
    >
      {children}
    </SearchField>
  );
}
export type CommandInputGroupPrefixProps = ComponentPropsWithRef<'div'>;
export function CommandInputGroupPrefix({
  className,
  ...props
}: CommandInputGroupPrefixProps): ReactElement {
  return (
    <div
      {...props}
      className={cn('command__input-group-prefix', className)}
      data-slot='command-input-group-prefix'
    />
  );
}
export interface CommandInputGroupInputProps extends ComponentPropsWithRef<
  typeof Input
> {
  placeholder?: string;
}
export function CommandInputGroupInput({
  className,
  onKeyDownCapture,
  placeholder = 'Search commands...',
  ...props
}: CommandInputGroupInputProps): ReactElement {
  return (
    <Input
      {...props}
      className={
        cn(
          'command__input-group-input',
          typeof className === 'string' ? className : undefined,
        ) ?? 'command__input-group-input'
      }
      data-slot='command-input-group-input'
      placeholder={placeholder}
      onKeyDownCapture={(event) => {
        onKeyDownCapture?.(event);
        if (
          !event.defaultPrevented &&
          event.key.length === 1 &&
          !event.metaKey &&
          !event.ctrlKey &&
          !event.altKey
        )
          event.stopPropagation();
      }}
    />
  );
}
export type CommandInputGroupSuffixProps = ComponentPropsWithRef<'div'>;
export function CommandInputGroupSuffix({
  className,
  ...props
}: CommandInputGroupSuffixProps): ReactElement {
  return (
    <div
      {...props}
      className={cn('command__input-group-suffix', className)}
      data-slot='command-input-group-suffix'
    />
  );
}
export type CommandInputGroupClearButtonProps = ComponentPropsWithRef<
  typeof CloseButton
>;
export function CommandInputGroupClearButton({
  className,
  ...props
}: CommandInputGroupClearButtonProps): ReactElement {
  return (
    <CloseButton
      {...props}
      className={
        cn(
          'command__input-group-clear-button',
          typeof className === 'string' ? className : undefined,
        ) ?? 'command__input-group-clear-button'
      }
      data-slot='command-input-group-clear-button'
      slot='clear'
    />
  );
}

export type CommandListProps<T extends object = object> = ComponentPropsWithRef<
  typeof Menu<T>
>;

export const CommandList = React.forwardRef(function CommandList<
  T extends object = object,
>(
  { className, renderEmptyState, ...props }: CommandListProps<T>,
  ref: React.ForwardedRef<HTMLDivElement>,
) {
  return (
    <Menu
      {...props}
      ref={ref}
      className={
        cn(
          'command__list',
          typeof className === 'string' ? className : undefined,
        ) ?? 'command__list'
      }
      data-slot='command-list'
      {...(renderEmptyState
        ? {
            renderEmptyState: () => (
              <div className='command__empty' data-slot='command-empty'>
                {renderEmptyState()}
              </div>
            ),
          }
        : {})}
    />
  );
});

export type CommandItemProps = ComponentPropsWithRef<typeof MenuItem>;
export const CommandItem = React.forwardRef(function CommandItem(
  { className, ...props }: CommandItemProps,
  ref: React.ForwardedRef<HTMLDivElement>,
) {
  return (
    <MenuItem
      {...props}
      ref={ref}
      className={
        cn(
          'command__item',
          typeof className === 'string' ? className : undefined,
        ) ?? 'command__item'
      }
      data-slot='command-item'
    />
  );
});
export interface CommandGroupProps<
  T extends object = object,
> extends ComponentPropsWithRef<typeof MenuSection<T>> {
  heading?: ReactNode;
  headingClassName?: string;
}
export function CommandGroup<T extends object = object>({
  children,
  className,
  heading,
  headingClassName,
  ...props
}: CommandGroupProps<T>): ReactElement {
  return (
    <MenuSection
      {...props}
      className={
        cn(
          'command__group',
          typeof className === 'string' ? className : undefined,
        ) ?? 'command__group'
      }
      data-slot='command-group'
    >
      {heading ? (
        <Header
          className={cn('command__group-heading', headingClassName)}
          data-slot='command-group-heading'
        >
          {heading}
        </Header>
      ) : null}
      {children as ReactNode}
    </MenuSection>
  );
}
export type CommandSeparatorProps = ComponentPropsWithRef<typeof Separator>;
export function CommandSeparator({
  className,
  ...props
}: CommandSeparatorProps): ReactElement {
  return (
    <Separator
      {...props}
      className={
        cn(
          'command__separator',
          typeof className === 'string' ? className : undefined,
        ) ?? 'command__separator'
      }
      data-slot='command-separator'
    />
  );
}
export type CommandFooterProps = ComponentPropsWithRef<'div'>;
export function CommandFooter({
  className,
  ...props
}: CommandFooterProps): ReactElement {
  return (
    <div
      {...props}
      className={cn('command__footer', className)}
      data-slot='command-footer'
    />
  );
}

type CommandInputGroupComponent = typeof CommandInputGroup & {
  ClearButton: typeof CommandInputGroupClearButton;
  Input: typeof CommandInputGroupInput;
  Prefix: typeof CommandInputGroupPrefix;
  Suffix: typeof CommandInputGroupSuffix;
};
const CommandInputGroupCompound: CommandInputGroupComponent = Object.assign(
  CommandInputGroup,
  {
    ClearButton: CommandInputGroupClearButton,
    Input: CommandInputGroupInput,
    Prefix: CommandInputGroupPrefix,
    Suffix: CommandInputGroupSuffix,
  },
);
type CommandComponent = typeof CommandRoot & {
  Backdrop: typeof CommandBackdrop;
  Container: typeof CommandContainer;
  Dialog: typeof CommandDialog;
  Footer: typeof CommandFooter;
  Group: typeof CommandGroup;
  Header: typeof CommandHeader;
  InputGroup: CommandInputGroupComponent;
  Item: typeof CommandItem;
  List: typeof CommandList;
  Root: typeof CommandRoot;
  Separator: typeof CommandSeparator;
};
export const Command: CommandComponent = Object.assign(CommandRoot, {
  Backdrop: CommandBackdrop,
  Container: CommandContainer,
  Dialog: CommandDialog,
  Footer: CommandFooter,
  Group: CommandGroup,
  Header: CommandHeader,
  InputGroup: CommandInputGroupCompound,
  Item: CommandItem,
  List: CommandList,
  Root: CommandRoot,
  Separator: CommandSeparator,
});
