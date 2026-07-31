'use client';

import { cn, Radio, RadioGroup } from '@heroui/react';
import type {
  ComponentProps,
  ComponentPropsWithRef,
  ReactElement,
  ReactNode,
} from 'react';

export type RadioButtonGroupLayout = 'flex' | 'grid';

export interface RadioButtonGroupRootProps extends Omit<
  ComponentProps<typeof RadioGroup>,
  'layout'
> {
  layout?: RadioButtonGroupLayout;
}

function RadioButtonGroupRoot({
  children,
  className,
  layout = 'flex',
  ...props
}: RadioButtonGroupRootProps): ReactElement {
  return (
    <RadioGroup
      {...props}
      className={(renderProps) =>
        cn(
          'radio-button-group',
          layout === 'grid' && 'radio-button-group--grid',
          typeof className === 'function' ? className(renderProps) : className,
        ) ?? 'radio-button-group'
      }
      data-slot='radio-button-group'
    >
      {children}
    </RadioGroup>
  );
}

export type RadioButtonGroupItemProps = ComponentProps<typeof Radio>;

function RadioButtonGroupItem({
  children,
  className,
  ...props
}: RadioButtonGroupItemProps): ReactElement {
  return (
    <Radio {...props} data-slot='radio-button-group-item'>
      <Radio.Content
        className={(renderProps) =>
          cn(
            'radio-button-group__item',
            typeof className === 'function'
              ? className(renderProps)
              : className,
          ) ?? 'radio-button-group__item'
        }
      >
        {(renderProps) =>
          typeof children === 'function' ? children(renderProps) : children
        }
      </Radio.Content>
    </Radio>
  );
}

export type RadioButtonGroupIndicatorProps = ComponentPropsWithRef<'span'>;

function RadioButtonGroupIndicator({
  children,
  className,
  ...props
}: RadioButtonGroupIndicatorProps): ReactElement {
  if (children == null) {
    return (
      <Radio.Control
        {...props}
        className={
          cn('radio-button-group__indicator', className) ??
          'radio-button-group__indicator'
        }
        data-slot='radio-button-group-indicator'
      >
        <Radio.Indicator />
      </Radio.Control>
    );
  }
  return (
    <span
      {...props}
      className={cn('radio-button-group__indicator', className)}
      data-custom='true'
      data-slot='radio-button-group-indicator'
    >
      {children}
    </span>
  );
}

export interface RadioButtonGroupItemContentProps extends ComponentPropsWithRef<'div'> {
  children: ReactNode;
}

function RadioButtonGroupItemContent({
  children,
  className,
  ...props
}: RadioButtonGroupItemContentProps): ReactElement {
  return (
    <div
      {...props}
      className={cn('radio-button-group__item-content', className)}
      data-slot='radio-button-group-item-content'
    >
      {children}
    </div>
  );
}

export interface RadioButtonGroupItemIconProps extends ComponentPropsWithRef<'div'> {
  children: ReactNode;
}

function RadioButtonGroupItemIcon({
  children,
  className,
  ...props
}: RadioButtonGroupItemIconProps): ReactElement {
  return (
    <div
      {...props}
      className={cn('radio-button-group__item-icon', className)}
      data-slot='radio-button-group-item-icon'
    >
      {children}
    </div>
  );
}

type RadioButtonGroupComponent = typeof RadioButtonGroupRoot & {
  Indicator: typeof RadioButtonGroupIndicator;
  Item: typeof RadioButtonGroupItem;
  ItemContent: typeof RadioButtonGroupItemContent;
  ItemIcon: typeof RadioButtonGroupItemIcon;
  Root: typeof RadioButtonGroupRoot;
};

export const RadioButtonGroup: RadioButtonGroupComponent = Object.assign(
  RadioButtonGroupRoot,
  {
    Indicator: RadioButtonGroupIndicator,
    Item: RadioButtonGroupItem,
    ItemContent: RadioButtonGroupItemContent,
    ItemIcon: RadioButtonGroupItemIcon,
    Root: RadioButtonGroupRoot,
  },
);
