'use client';

import { cn, dom, type DOMRenderProps } from '@heroui/react';
import type { ComponentPropsWithRef, ReactElement, ReactNode } from 'react';

export interface TextShimmerProps
  extends
    Omit<ComponentPropsWithRef<'span'>, 'className'>,
    DOMRenderProps<'span', undefined> {
  children: ReactNode;
  className?: string;
}
export function TextShimmer({
  children,
  className,
  ...props
}: TextShimmerProps): ReactElement {
  return (
    <dom.span
      className={cn('text-shimmer', className)}
      data-slot='text-shimmer'
      {...props}
    >
      {children}
    </dom.span>
  );
}
