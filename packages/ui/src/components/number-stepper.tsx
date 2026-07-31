'use client';

import { cn } from '@heroui/react';
import NumberFlow, {
  type Format,
  type NumberFlowProps,
} from '@number-flow/react';
import {
  type ComponentPropsWithRef,
  createContext,
  type ReactElement,
  type ReactNode,
  useContext,
  useMemo,
} from 'react';
import {
  Button as ButtonPrimitive,
  composeRenderProps,
  Group as GroupPrimitive,
  Input as InputPrimitive,
  NumberField as NumberFieldPrimitive,
  NumberFieldStateContext,
} from 'react-aria-components';

import { IconMinus, IconPlus } from '../heroui-icons';

export type NumberStepperSize = 'sm' | 'md' | 'lg';

interface NumberStepperContextValue {
  formatOptions: Format | undefined;
  size: NumberStepperSize;
}

const NumberStepperContext = createContext<NumberStepperContextValue>({
  formatOptions: undefined,
  size: 'md',
});

export interface NumberStepperRootProps extends ComponentPropsWithRef<
  typeof NumberFieldPrimitive
> {
  formatOptions?: Format;
  size?: NumberStepperSize;
}

function NumberStepperRoot({
  className,
  formatOptions,
  size = 'md',
  ...props
}: NumberStepperRootProps): ReactElement {
  const contextValue = useMemo(
    () => ({ formatOptions, size }),
    [formatOptions, size],
  );

  return (
    <NumberStepperContext.Provider value={contextValue}>
      <NumberFieldPrimitive
        {...props}
        className={composeRenderProps(
          className,
          (resolvedClassName) => cn('number-stepper', resolvedClassName) ?? '',
        )}
        data-slot='number-stepper'
        {...(formatOptions ? { formatOptions } : {})}
      />
    </NumberStepperContext.Provider>
  );
}

export type NumberStepperGroupProps = ComponentPropsWithRef<
  typeof GroupPrimitive
>;

function NumberStepperGroup({
  children,
  className,
  ...props
}: NumberStepperGroupProps): ReactElement {
  const { size } = useContext(NumberStepperContext);

  return (
    <GroupPrimitive
      {...props}
      className={composeRenderProps(
        className,
        (resolvedClassName) =>
          cn(
            'number-stepper__group',
            `number-stepper__group--${size}`,
            resolvedClassName,
          ) ?? '',
      )}
      data-slot='number-stepper-group'
    >
      {composeRenderProps(children, (resolvedChildren) => (
        <>
          {resolvedChildren}
          <InputPrimitive
            className='number-stepper__input'
            data-slot='number-stepper-input'
          />
        </>
      ))}
    </GroupPrimitive>
  );
}

export interface NumberStepperValueProps extends Omit<
  NumberFlowProps,
  'children' | 'value'
> {
  children?:
    | ReactNode
    | ((values: { formatOptions?: Format; value: number }) => ReactNode);
  format?: Format;
  value?: number;
}

function NumberStepperValue({
  children,
  className,
  format,
  value: valueProp,
  ...props
}: NumberStepperValueProps): ReactNode {
  const { formatOptions, size } = useContext(NumberStepperContext);
  const state = useContext(NumberFieldStateContext);
  const value = valueProp ?? state?.numberValue ?? 0;
  const resolvedFormat = format ?? formatOptions;

  if (typeof children === 'function') {
    return children({
      ...(resolvedFormat ? { formatOptions: resolvedFormat } : {}),
      value,
    });
  }

  if (children !== undefined) {
    return children;
  }

  return (
    <NumberFlow
      {...props}
      className={cn(
        'number-stepper__value',
        `number-stepper__value--${size}`,
        className,
      )}
      data-slot='number-stepper-value'
      {...(resolvedFormat ? { format: resolvedFormat } : {})}
      value={value}
    />
  );
}

export type NumberStepperDecrementButtonProps = ComponentPropsWithRef<
  typeof ButtonPrimitive
>;

function NumberStepperDecrementButton({
  children,
  className,
  ...props
}: NumberStepperDecrementButtonProps): ReactElement {
  const { size } = useContext(NumberStepperContext);

  return (
    <ButtonPrimitive
      {...props}
      className={composeRenderProps(
        className,
        (resolvedClassName) =>
          cn(
            'number-stepper__decrement-button',
            `number-stepper__decrement-button--${size}`,
            resolvedClassName,
          ) ?? '',
      )}
      data-slot='number-stepper-decrement-button'
      slot='decrement'
    >
      {children ?? <IconMinus />}
    </ButtonPrimitive>
  );
}

export type NumberStepperIncrementButtonProps = ComponentPropsWithRef<
  typeof ButtonPrimitive
>;

function NumberStepperIncrementButton({
  children,
  className,
  ...props
}: NumberStepperIncrementButtonProps): ReactElement {
  const { size } = useContext(NumberStepperContext);

  return (
    <ButtonPrimitive
      {...props}
      className={composeRenderProps(
        className,
        (resolvedClassName) =>
          cn(
            'number-stepper__increment-button',
            `number-stepper__increment-button--${size}`,
            resolvedClassName,
          ) ?? '',
      )}
      data-slot='number-stepper-increment-button'
      slot='increment'
    >
      {children ?? <IconPlus />}
    </ButtonPrimitive>
  );
}

type NumberStepperComponent = typeof NumberStepperRoot & {
  DecrementButton: typeof NumberStepperDecrementButton;
  Group: typeof NumberStepperGroup;
  IncrementButton: typeof NumberStepperIncrementButton;
  Value: typeof NumberStepperValue;
};

export const NumberStepper: NumberStepperComponent = Object.assign(
  NumberStepperRoot,
  {
    DecrementButton: NumberStepperDecrementButton,
    Group: NumberStepperGroup,
    IncrementButton: NumberStepperIncrementButton,
    Value: NumberStepperValue,
  },
);
