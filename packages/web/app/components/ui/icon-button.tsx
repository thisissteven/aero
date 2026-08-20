'use client';

import type { ComponentPropsWithoutRef } from 'react';

import { ButtonRoot } from '@aero/ui';

export interface IconButtonProps extends Omit<
  ComponentPropsWithoutRef<typeof ButtonRoot>,
  'size'
> {
  size?: 'xs' | 'sm' | 'md' | 'lg';
  svgSize?: 'xs' | 'sm';
}

export const IconButton = ({
  children,
  className = '',
  size = 'xs',
  svgSize = 'xs',
  variant = 'ghost',
  ...props
}: IconButtonProps) => {
  const isExtraSmall = size === 'xs';

  return (
    <ButtonRoot
      size={isExtraSmall ? 'sm' : size}
      isIconOnly
      className={[
        isExtraSmall && [
          '!h-7.5 !w-7.5 !p-0',
          svgSize === 'xs' && '[&_svg]:!size-3.5',
          svgSize === 'sm' && '[&_svg]:!size-4.5',
          'active:!scale-[0.98] data-[pressed=true]:!scale-[0.98]',
          'text-muted hover:text-foreground rounded-md',
        ],
        className,
      ]
        .flat()
        .filter(Boolean)
        .join(' ')}
      variant={variant}
      {...props}
    >
      {children}
    </ButtonRoot>
  );
};
