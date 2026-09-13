'use client';

import { ButtonRoot, cn } from '@aero/ui';
import type { ComponentPropsWithoutRef } from 'react';

export interface IconButtonProps
  extends Omit<ComponentPropsWithoutRef<typeof ButtonRoot>, 'size'> {
  size?: 'xs' | 'sm' | 'md' | 'lg';
  svgSize?: 'xs' | 'sm' | 'lg';
  color?: 'default' | 'accent';
}

export const IconButton = ({
  children,
  className = '',
  size = 'xs',
  svgSize = 'xs',
  variant = 'ghost',
  color = 'default',
  isIconOnly = true,
  ...props
}: IconButtonProps) => {
  const isExtraSmall = size === 'xs';

  return (
    <ButtonRoot
      size={isExtraSmall ? 'sm' : size}
      isIconOnly={isIconOnly}
      className={cn([
        isExtraSmall && [
          svgSize === 'xs' && '[&_svg]:!size-3.5',
          svgSize === 'xs' && isIconOnly && 'h-7 w-7',
          svgSize === 'sm' && '[&_svg]:!size-4.5',
          svgSize === 'lg' && '[&_svg]:!size-5',
          'active:!scale-[0.98] data-[pressed=true]:!scale-[0.98]',
          'rounded-md shrink-0',
          variant === 'ghost' &&
            'opacity-50 hover:opacity-80 active:opacity-80',
          color === 'accent' && 'text-accent-soft-foreground',
        ],
        className,
      ])}
      variant={variant}
      {...props}
    >
      {children}
    </ButtonRoot>
  );
};
