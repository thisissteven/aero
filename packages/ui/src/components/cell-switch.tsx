'use client';

import { cn, Switch } from '@heroui/react';
import type {
  ComponentProps,
  ComponentPropsWithRef,
  ReactElement,
  ReactNode,
} from 'react';
import { createContext, useContext } from 'react';

export type CellSwitchVariant = 'default' | 'secondary';

const CellSwitchVariantContext = createContext<CellSwitchVariant>('default');

export interface CellSwitchRootProps extends Omit<
  ComponentProps<typeof Switch>,
  'children' | 'variant'
> {
  children: ReactNode;
  variant?: CellSwitchVariant;
}

function CellSwitchRoot({
  children,
  className,
  variant = 'default',
  ...props
}: CellSwitchRootProps): ReactElement {
  return (
    <CellSwitchVariantContext value={variant}>
      <Switch
        {...props}
        className={(renderProps) =>
          cn(
            'cell-switch',
            variant === 'secondary' && 'cell-switch--secondary',
            typeof className === 'function'
              ? className(renderProps)
              : className,
          ) ?? 'cell-switch'
        }
        data-slot='cell-switch'
      >
        {children}
      </Switch>
    </CellSwitchVariantContext>
  );
}

export interface CellSwitchTriggerProps extends ComponentProps<
  typeof Switch.Content
> {
  children: ReactNode;
}

function CellSwitchTrigger({
  children,
  className,
  ...props
}: CellSwitchTriggerProps): ReactElement {
  const variant = useContext(CellSwitchVariantContext);
  return (
    <Switch.Content
      {...props}
      className={(renderProps) =>
        cn(
          'cell-switch__trigger',
          `cell-switch__trigger--${variant}`,
          typeof className === 'function' ? className(renderProps) : className,
        ) ?? 'cell-switch__trigger'
      }
      data-slot='cell-switch-trigger'
    >
      {children}
    </Switch.Content>
  );
}

export type CellSwitchLabelProps = ComponentPropsWithRef<'span'>;

function CellSwitchLabel({
  children,
  className,
  ...props
}: CellSwitchLabelProps): ReactElement {
  return (
    <span
      {...props}
      className={cn('cell-switch__label', className)}
      data-slot='cell-switch-label'
    >
      {children}
    </span>
  );
}

export type CellSwitchControlProps = ComponentProps<typeof Switch.Control>;

function CellSwitchControl({
  children,
  className,
  ...props
}: CellSwitchControlProps): ReactElement {
  const variant = useContext(CellSwitchVariantContext);
  return (
    <Switch.Control
      {...props}
      className={
        cn(
          'cell-switch__control',
          variant === 'secondary' && 'cell-switch__control--secondary',
          className,
        ) ?? 'cell-switch__control'
      }
      data-slot='cell-switch-control'
    >
      {children === undefined ? <Switch.Thumb /> : children}
    </Switch.Control>
  );
}

type CellSwitchComponent = typeof CellSwitchRoot & {
  Control: typeof CellSwitchControl;
  Label: typeof CellSwitchLabel;
  Root: typeof CellSwitchRoot;
  Trigger: typeof CellSwitchTrigger;
};

export const CellSwitch: CellSwitchComponent = Object.assign(CellSwitchRoot, {
  Control: CellSwitchControl,
  Label: CellSwitchLabel,
  Root: CellSwitchRoot,
  Trigger: CellSwitchTrigger,
});
