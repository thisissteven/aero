'use client';

import { Checkbox, CheckboxGroup, cn } from '@heroui/react';
import type {
  ComponentProps,
  ComponentPropsWithRef,
  ReactElement,
  ReactNode,
} from 'react';

export type CheckboxButtonGroupLayout = 'flex' | 'grid';

export interface CheckboxButtonGroupRootProps extends Omit<
  ComponentProps<typeof CheckboxGroup>,
  'layout'
> {
  layout?: CheckboxButtonGroupLayout;
}

function CheckboxButtonGroupRoot({
  children,
  className,
  layout = 'flex',
  ...props
}: CheckboxButtonGroupRootProps): ReactElement {
  return (
    <CheckboxGroup
      {...props}
      className={(renderProps) =>
        cn(
          'checkbox-button-group',
          layout === 'grid' && 'checkbox-button-group--grid',
          typeof className === 'function' ? className(renderProps) : className,
        ) ?? 'checkbox-button-group'
      }
      data-slot='checkbox-button-group'
    >
      {children}
    </CheckboxGroup>
  );
}

export type CheckboxButtonGroupItemProps = ComponentProps<typeof Checkbox>;

function CheckboxButtonGroupItem({
  children,
  className,
  ...props
}: CheckboxButtonGroupItemProps): ReactElement {
  return (
    <Checkbox {...props} data-slot='checkbox-button-group-item'>
      <Checkbox.Content
        className={(renderProps) =>
          cn(
            'checkbox-button-group__item',
            typeof className === 'function'
              ? className(renderProps)
              : className,
          ) ?? 'checkbox-button-group__item'
        }
      >
        {(renderProps) =>
          typeof children === 'function' ? children(renderProps) : children
        }
      </Checkbox.Content>
    </Checkbox>
  );
}

export type CheckboxButtonGroupIndicatorProps = ComponentPropsWithRef<'span'>;

function CheckboxButtonGroupIndicator({
  children,
  className,
  ...props
}: CheckboxButtonGroupIndicatorProps): ReactElement {
  if (children == null) {
    return (
      <Checkbox.Control
        {...props}
        className={
          cn('checkbox-button-group__indicator', className) ??
          'checkbox-button-group__indicator'
        }
        data-slot='checkbox-button-group-indicator'
      >
        <Checkbox.Indicator />
      </Checkbox.Control>
    );
  }
  return (
    <span
      {...props}
      className={cn('checkbox-button-group__indicator', className)}
      data-custom='true'
      data-slot='checkbox-button-group-indicator'
    >
      {children}
    </span>
  );
}

export interface CheckboxButtonGroupItemContentProps extends ComponentPropsWithRef<'div'> {
  children: ReactNode;
}

function CheckboxButtonGroupItemContent({
  children,
  className,
  ...props
}: CheckboxButtonGroupItemContentProps): ReactElement {
  return (
    <div
      {...props}
      className={cn('checkbox-button-group__item-content', className)}
      data-slot='checkbox-button-group-item-content'
    >
      {children}
    </div>
  );
}

export interface CheckboxButtonGroupItemIconProps extends ComponentPropsWithRef<'div'> {
  children: ReactNode;
}

function CheckboxButtonGroupItemIcon({
  children,
  className,
  ...props
}: CheckboxButtonGroupItemIconProps): ReactElement {
  return (
    <div
      {...props}
      className={cn('checkbox-button-group__item-icon', className)}
      data-slot='checkbox-button-group-item-icon'
    >
      {children}
    </div>
  );
}

type CheckboxButtonGroupComponent = typeof CheckboxButtonGroupRoot & {
  Indicator: typeof CheckboxButtonGroupIndicator;
  Item: typeof CheckboxButtonGroupItem;
  ItemContent: typeof CheckboxButtonGroupItemContent;
  ItemIcon: typeof CheckboxButtonGroupItemIcon;
  Root: typeof CheckboxButtonGroupRoot;
};

export const CheckboxButtonGroup: CheckboxButtonGroupComponent = Object.assign(
  CheckboxButtonGroupRoot,
  {
    Indicator: CheckboxButtonGroupIndicator,
    Item: CheckboxButtonGroupItem,
    ItemContent: CheckboxButtonGroupItemContent,
    ItemIcon: CheckboxButtonGroupItemIcon,
    Root: CheckboxButtonGroupRoot,
  },
);
