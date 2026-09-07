'use client';

import {
  Tooltip as HeroUITooltip,
  TooltipArrow as HeroUITooltipArrow,
  TooltipContent as HeroUITooltipContent,
  TooltipTrigger as HeroUITooltipTrigger,
} from '@heroui/react/tooltip';
import type { ComponentPropsWithRef } from 'react';

import { cn } from '../utils';

export * from '@heroui/react/tooltip';

export interface TooltipProps extends ComponentPropsWithRef<
  typeof HeroUITooltip
> {}

export const TooltipRoot = ({ children, ...props }: TooltipProps) => {
  return (
    <HeroUITooltip delay={300} {...props}>
      {children}
    </HeroUITooltip>
  );
};

export const TooltipTrigger = ({
  children,
  ...props
}: ComponentPropsWithRef<typeof HeroUITooltipTrigger>) => {
  return <HeroUITooltipTrigger {...props}>{children}</HeroUITooltipTrigger>;
};

export const TooltipContent = ({
  children,
  className,
  ...props
}: ComponentPropsWithRef<typeof HeroUITooltipContent>) => {
  return (
    <HeroUITooltipContent className={cn('break-normal', className)} {...props}>
      {children}
    </HeroUITooltipContent>
  );
};

export const TooltipArrow = HeroUITooltipArrow;

export const Tooltip = Object.assign(TooltipRoot, {
  Trigger: TooltipTrigger,
  Content: TooltipContent,
  Arrow: TooltipArrow,
});
