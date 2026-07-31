'use client';

import { cn } from '@heroui/react';
import type { ComponentPropsWithRef, ReactElement, ReactNode } from 'react';
import { createContext, useContext } from 'react';

type Orientation = 'horizontal' | 'vertical';
const Context = createContext<Orientation | null>(null);

export interface KPIGroupRootProps extends ComponentPropsWithRef<'div'> {
  children: ReactNode;
  orientation?: Orientation;
}
function KPIGroupRoot({
  children,
  className,
  orientation = 'horizontal',
  ...props
}: KPIGroupRootProps): ReactElement {
  return (
    <Context value={orientation}>
      <div
        {...props}
        className={cn('kpi-group', `kpi-group--${orientation}`, className)}
        data-slot='kpi-group'
        role='group'
      >
        {children}
      </div>
    </Context>
  );
}
export interface KPIGroupSeparatorProps extends ComponentPropsWithRef<'span'> {}
function KPIGroupSeparator({
  className,
  ...props
}: KPIGroupSeparatorProps): ReactElement {
  useContext(Context);
  return (
    <span
      {...props}
      aria-hidden='true'
      className={cn('kpi-group__separator', className)}
      data-slot='kpi-group-separator'
    />
  );
}
type KPIGroupComponent = typeof KPIGroupRoot & {
  Root: typeof KPIGroupRoot;
  Separator: typeof KPIGroupSeparator;
};
export const KPIGroup: KPIGroupComponent = Object.assign(KPIGroupRoot, {
  Root: KPIGroupRoot,
  Separator: KPIGroupSeparator,
});
export { KPIGroupRoot, KPIGroupSeparator };
