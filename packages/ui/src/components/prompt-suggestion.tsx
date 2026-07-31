'use client';
import { Card, cn, IconChevronRight } from '@heroui/react';
import type { ComponentPropsWithRef, ReactElement, ReactNode } from 'react';
import { createContext, createElement, useContext } from 'react';
import { Button as AriaButton } from 'react-aria-components';
export type PromptSuggestionVariant = 'card' | 'pill';
const Context = createContext<PromptSuggestionVariant>('pill');
const cls = (base: string, className: unknown): string =>
  cn(base, typeof className === 'string' ? className : undefined) ?? base;
export interface PromptSuggestionRootProps extends ComponentPropsWithRef<'div'> {
  variant?: PromptSuggestionVariant;
}
export function PromptSuggestionRoot({
  className,
  variant = 'pill',
  ...props
}: PromptSuggestionRootProps): ReactElement {
  return (
    <Context value={variant}>
      <div
        className={cls(
          `prompt-suggestion prompt-suggestion--${variant}`,
          className,
        )}
        data-slot='prompt-suggestion'
        {...props}
      />
    </Context>
  );
}
const part = <T extends 'div' | 'h2' | 'p'>(
  tag: T,
  base: string,
  slot: string,
) =>
  function Part({
    className,
    ...props
  }: ComponentPropsWithRef<T>): ReactElement {
    return createElement(tag, {
      ...props,
      className: cls(base, className),
      'data-slot': slot,
    });
  };
type DivPart = (props: ComponentPropsWithRef<'div'>) => ReactElement;
type H2Part = (props: ComponentPropsWithRef<'h2'>) => ReactElement;
type PPart = (props: ComponentPropsWithRef<'p'>) => ReactElement;
export const PromptSuggestionHeader: DivPart = part(
  'div',
  'prompt-suggestion__header',
  'prompt-suggestion-header',
);
export const PromptSuggestionTitle: H2Part = part(
  'h2',
  'prompt-suggestion__title',
  'prompt-suggestion-title',
);
export const PromptSuggestionDescription: PPart = part(
  'p',
  'prompt-suggestion__description',
  'prompt-suggestion-description',
);
export function PromptSuggestionGroup({
  children,
  className,
  description,
  label,
  ...props
}: ComponentPropsWithRef<'section'> & {
  description?: ReactNode;
  label?: ReactNode;
}): ReactElement {
  return (
    <section
      className={cls('prompt-suggestion__group', className)}
      data-slot='prompt-suggestion-group'
      {...props}
    >
      {label || description ? (
        <div className='flex flex-col gap-1'>
          {label ? (
            <h3 className='prompt-suggestion__group-label'>{label}</h3>
          ) : null}
          {description ? (
            <p className='prompt-suggestion__group-description'>
              {description}
            </p>
          ) : null}
        </div>
      ) : null}
      {children}
    </section>
  );
}
export function PromptSuggestionItems({
  className,
  ...props
}: ComponentPropsWithRef<'div'>): ReactElement {
  const variant = useContext(Context);
  return (
    <div
      className={cls(
        `prompt-suggestion__items prompt-suggestion__items--${variant}`,
        className,
      )}
      data-slot='prompt-suggestion-items'
      {...props}
    />
  );
}
export interface PromptSuggestionItemProps extends Omit<
  ComponentPropsWithRef<typeof AriaButton>,
  'children'
> {
  children: ReactNode;
  showEndIcon?: boolean;
}
export function PromptSuggestionItem({
  children,
  className,
  showEndIcon = true,
  ...props
}: PromptSuggestionItemProps): ReactElement {
  const variant = useContext(Context);
  if (variant === 'card')
    return (
      <Card
        className={cls(
          'prompt-suggestion__item prompt-suggestion__item--card',
          className,
        )}
        data-slot='prompt-suggestion-item'
        {...(props as unknown as ComponentPropsWithRef<typeof Card>)}
      >
        {children}
      </Card>
    );
  return (
    <AriaButton
      className={cls(
        'prompt-suggestion__item prompt-suggestion__item--pill',
        className,
      )}
      data-slot='prompt-suggestion-item'
      {...props}
    >
      <span className='prompt-suggestion__item-label'>{children}</span>
      {showEndIcon ? (
        <IconChevronRight className='prompt-suggestion__item-end-icon' />
      ) : null}
    </AriaButton>
  );
}
export function PromptSuggestionItemTitle({
  className,
  ...props
}: ComponentPropsWithRef<typeof Card.Title>): ReactElement {
  return (
    <Card.Title
      className={cls('', className)}
      data-slot='prompt-suggestion-item-title'
      {...props}
    />
  );
}
export function PromptSuggestionItemDescription({
  className,
  ...props
}: ComponentPropsWithRef<typeof Card.Description>): ReactElement {
  return (
    <Card.Description
      className={cls('prompt-suggestion__item-description', className)}
      {...props}
    />
  );
}
export function PromptSuggestionItemFooter({
  className,
  ...props
}: ComponentPropsWithRef<typeof Card.Footer>): ReactElement {
  return (
    <Card.Footer
      className={cls('prompt-suggestion__item-footer', className)}
      data-slot='prompt-suggestion-item-footer'
      {...props}
    />
  );
}
export const PromptSuggestionItemTags: DivPart = part(
  'div',
  'prompt-suggestion__item-tags',
  'prompt-suggestion-item-tags',
);
export function PromptSuggestionItemMeta({
  className,
  ...props
}: ComponentPropsWithRef<'span'>): ReactElement {
  return (
    <span
      className={cls('prompt-suggestion__item-meta', className)}
      data-slot='prompt-suggestion-item-meta'
      {...props}
    />
  );
}
type Component = typeof PromptSuggestionRoot & {
  Description: typeof PromptSuggestionDescription;
  Group: typeof PromptSuggestionGroup;
  Header: typeof PromptSuggestionHeader;
  Item: typeof PromptSuggestionItem;
  ItemDescription: typeof PromptSuggestionItemDescription;
  ItemFooter: typeof PromptSuggestionItemFooter;
  ItemMeta: typeof PromptSuggestionItemMeta;
  ItemTags: typeof PromptSuggestionItemTags;
  ItemTitle: typeof PromptSuggestionItemTitle;
  Items: typeof PromptSuggestionItems;
  Root: typeof PromptSuggestionRoot;
  Title: typeof PromptSuggestionTitle;
};
export const PromptSuggestion: Component = Object.assign(PromptSuggestionRoot, {
  Description: PromptSuggestionDescription,
  Group: PromptSuggestionGroup,
  Header: PromptSuggestionHeader,
  Item: PromptSuggestionItem,
  ItemDescription: PromptSuggestionItemDescription,
  ItemFooter: PromptSuggestionItemFooter,
  ItemMeta: PromptSuggestionItemMeta,
  ItemTags: PromptSuggestionItemTags,
  ItemTitle: PromptSuggestionItemTitle,
  Items: PromptSuggestionItems,
  Root: PromptSuggestionRoot,
  Title: PromptSuggestionTitle,
});
