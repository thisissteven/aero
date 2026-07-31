'use client';

import { cn, Slider } from '@heroui/react';
import type {
  ComponentProps,
  ComponentPropsWithRef,
  ReactElement,
  ReactNode,
} from 'react';
import { createContext, useContext } from 'react';

export type CellSliderVariant = 'default' | 'secondary';

const CellSliderVariantContext = createContext<CellSliderVariant>('default');

export interface CellSliderRootProps extends Omit<
  ComponentProps<typeof Slider>,
  'children' | 'orientation' | 'variant'
> {
  children: ReactNode;
  variant?: CellSliderVariant;
}

function CellSliderRoot({
  children,
  className,
  variant = 'default',
  ...props
}: CellSliderRootProps): ReactElement {
  return (
    <CellSliderVariantContext value={variant}>
      <Slider
        {...props}
        className={(renderProps) =>
          cn(
            'cell-slider',
            typeof className === 'function'
              ? className(renderProps)
              : className,
          ) ?? 'cell-slider'
        }
        data-slot='cell-slider'
        orientation='horizontal'
      >
        {children}
      </Slider>
    </CellSliderVariantContext>
  );
}

export type CellSliderTrackProps = ComponentProps<typeof Slider.Track>;

function CellSliderTrack({
  children,
  className,
  ...props
}: CellSliderTrackProps): ReactElement {
  const variant = useContext(CellSliderVariantContext);
  return (
    <Slider.Track
      {...props}
      className={(renderProps) =>
        cn(
          'cell-slider__track',
          `cell-slider__track--${variant}`,
          typeof className === 'function' ? className(renderProps) : className,
        ) ?? 'cell-slider__track'
      }
      data-slot='cell-slider-track'
    >
      {children}
    </Slider.Track>
  );
}

export type CellSliderFillProps = ComponentProps<typeof Slider.Fill>;

function CellSliderFill({
  className,
  ...props
}: CellSliderFillProps): ReactElement {
  return (
    <Slider.Fill
      {...props}
      className={cn('cell-slider__fill', className) ?? 'cell-slider__fill'}
      data-slot='cell-slider-fill'
    />
  );
}

export type CellSliderThumbProps = ComponentProps<typeof Slider.Thumb>;

function CellSliderThumb({
  children,
  className,
  ...props
}: CellSliderThumbProps): ReactElement {
  return (
    <Slider.Thumb
      {...props}
      className={(renderProps) =>
        cn(
          'cell-slider__thumb',
          typeof className === 'function' ? className(renderProps) : className,
        ) ?? 'cell-slider__thumb'
      }
      data-slot='cell-slider-thumb'
    >
      {children}
    </Slider.Thumb>
  );
}

export type CellSliderLabelProps = ComponentPropsWithRef<'span'>;

function CellSliderLabel({
  children,
  className,
  ...props
}: CellSliderLabelProps): ReactElement {
  return (
    <span
      {...props}
      className={cn('cell-slider__label', className)}
      data-slot='cell-slider-label'
    >
      {children}
    </span>
  );
}

export type CellSliderOutputProps = ComponentProps<typeof Slider.Output>;

function CellSliderOutput({
  children,
  className,
  ...props
}: CellSliderOutputProps): ReactElement {
  return (
    <Slider.Output
      {...props}
      className={(renderProps) =>
        cn(
          'cell-slider__output',
          typeof className === 'function' ? className(renderProps) : className,
        ) ?? 'cell-slider__output'
      }
      data-slot='cell-slider-output'
    >
      {children}
    </Slider.Output>
  );
}

type CellSliderComponent = typeof CellSliderRoot & {
  Fill: typeof CellSliderFill;
  Label: typeof CellSliderLabel;
  Output: typeof CellSliderOutput;
  Root: typeof CellSliderRoot;
  Thumb: typeof CellSliderThumb;
  Track: typeof CellSliderTrack;
};

export const CellSlider: CellSliderComponent = Object.assign(CellSliderRoot, {
  Fill: CellSliderFill,
  Label: CellSliderLabel,
  Output: CellSliderOutput,
  Root: CellSliderRoot,
  Thumb: CellSliderThumb,
  Track: CellSliderTrack,
});
