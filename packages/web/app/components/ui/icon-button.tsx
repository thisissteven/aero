'use client';

import type { ComponentPropsWithoutRef } from 'react';

import { ButtonRoot, cn } from '@aero/ui';

export interface IconButtonProps extends Omit<
  ComponentPropsWithoutRef<typeof ButtonRoot>,
  'size'
> {
  size?: 'xs' | 'sm' | 'md' | 'lg';
  svgSize?: 'xs' | 'sm' | 'lg';
}

export const IconButton = ({
  children,
  className = '',
  size = 'xs',
  svgSize = 'xs',
  variant = 'ghost',
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
          svgSize === 'sm' && '[&_svg]:!size-4.5',
          svgSize === 'lg' && '[&_svg]:!size-5',
          'active:!scale-[0.98] data-[pressed=true]:!scale-[0.98]',
          'text-muted hover:text-foreground rounded-md',
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
