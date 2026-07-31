'use client';

import { cn } from '@heroui/react';
import type { HTMLAttributes, ReactElement, ReactNode, Ref } from 'react';
import {
  Children,
  createContext,
  isValidElement,
  useContext,
  useMemo,
} from 'react';
import { useLocale } from 'react-aria-components';

interface NumberValueContextValue {
  prefixClassName: string;
  suffixClassName: string;
}

const NumberValueContext = createContext<NumberValueContextValue>({
  prefixClassName: 'number-value__prefix',
  suffixClassName: 'number-value__suffix',
});

export interface NumberValueAffixProps extends HTMLAttributes<HTMLSpanElement> {
  children: ReactNode;
  ref?: Ref<HTMLSpanElement>;
}

function NumberValuePrefix({
  children,
  className,
  ref,
  ...props
}: NumberValueAffixProps): ReactElement {
  const context = useContext(NumberValueContext);
  return (
    <span
      ref={ref}
      className={cn(context.prefixClassName, className)}
      data-slot='number-value-prefix'
      {...props}
    >
      {children}
    </span>
  );
}

function NumberValueSuffix({
  children,
  className,
  ref,
  ...props
}: NumberValueAffixProps): ReactElement {
  const context = useContext(NumberValueContext);
  return (
    <span
      ref={ref}
      className={cn(context.suffixClassName, className)}
      data-slot='number-value-suffix'
      {...props}
    >
      {children}
    </span>
  );
}

export interface NumberValueRootProps extends Omit<
  HTMLAttributes<HTMLSpanElement>,
  'children' | 'style'
> {
  children?: ((formatted: string) => ReactNode) | ReactNode;
  currency?: string;
  formatOptions?: Intl.NumberFormatOptions;
  locale?: string;
  maximumFractionDigits?: number;
  minimumFractionDigits?: number;
  notation?: 'compact' | 'engineering' | 'scientific' | 'standard';
  ref?: Ref<HTMLSpanElement>;
  signDisplay?: 'always' | 'auto' | 'exceptZero' | 'never';
  style?: 'currency' | 'decimal' | 'percent' | 'unit';
  unit?: string;
  value: number;
}

function NumberValueRoot({
  children,
  className,
  currency,
  formatOptions,
  locale,
  maximumFractionDigits,
  minimumFractionDigits,
  notation,
  ref,
  signDisplay,
  style,
  unit,
  value,
  ...props
}: NumberValueRootProps): ReactElement {
  const { locale: contextLocale } = useLocale();
  const resolvedLocale = locale ?? contextLocale;
  const options = useMemo<Intl.NumberFormatOptions>(
    () =>
      formatOptions ?? {
        ...(currency != null ? { currency } : {}),
        ...(maximumFractionDigits != null ? { maximumFractionDigits } : {}),
        ...(minimumFractionDigits != null ? { minimumFractionDigits } : {}),
        ...(notation != null ? { notation } : {}),
        ...(signDisplay != null ? { signDisplay } : {}),
        ...(style != null ? { style } : {}),
        ...(unit != null ? { unit } : {}),
      },
    [
      currency,
      formatOptions,
      maximumFractionDigits,
      minimumFractionDigits,
      notation,
      signDisplay,
      style,
      unit,
    ],
  );
  const formatted = useMemo(
    () => new Intl.NumberFormat(resolvedLocale, options).format(value),
    [options, resolvedLocale, value],
  );
  const context = useMemo(
    () => ({
      prefixClassName: 'number-value__prefix',
      suffixClassName: 'number-value__suffix',
    }),
    [],
  );

  if (typeof children === 'function') {
    return (
      <NumberValueContext value={context}>
        {children(formatted)}
      </NumberValueContext>
    );
  }

  let prefix: ReactElement | null = null;
  let suffix: ReactElement | null = null;
  const remaining: ReactNode[] = [];
  Children.forEach(children, (child) => {
    if (!isValidElement(child)) {
      remaining.push(child);
    } else if (child.type === NumberValuePrefix) {
      prefix = child;
    } else if (child.type === NumberValueSuffix) {
      suffix = child;
    } else {
      remaining.push(child);
    }
  });

  return (
    <NumberValueContext value={context}>
      <span
        ref={ref}
        className={cn('number-value', className)}
        data-slot='number-value'
        {...props}
      >
        {prefix}
        <span className='number-value__value' data-slot='number-value-value'>
          {formatted}
        </span>
        {suffix}
        {remaining}
      </span>
    </NumberValueContext>
  );
}

type NumberValueComponent = typeof NumberValueRoot & {
  Prefix: typeof NumberValuePrefix;
  Root: typeof NumberValueRoot;
  Suffix: typeof NumberValueSuffix;
};

export const NumberValue: NumberValueComponent = Object.assign(
  NumberValueRoot,
  {
    Prefix: NumberValuePrefix,
    Root: NumberValueRoot,
    Suffix: NumberValueSuffix,
  },
);
