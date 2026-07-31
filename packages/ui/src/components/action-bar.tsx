'use client';

import { cn, Toolbar } from '@heroui/react';
import { AnimatePresence, domAnimation, LazyMotion, m } from 'motion/react';
import type {
  ComponentProps,
  ComponentPropsWithRef,
  ReactElement,
  ReactNode,
} from 'react';
import { createContext, useContext } from 'react';

const ActionBarContext = createContext(true);

export interface ActionBarRootProps extends Omit<
  ComponentProps<typeof Toolbar>,
  'children'
> {
  children: ReactNode;
  /** Controls visibility with animated enter/exit. */
  isOpen: boolean;
}

function ActionBarRoot({
  'aria-label': ariaLabel = 'Actions',
  children,
  className,
  isAttached = true,
  isOpen,
  orientation,
  ...props
}: ActionBarRootProps): ReactElement {
  return (
    <ActionBarContext value>
      <LazyMotion features={domAnimation}>
        <AnimatePresence>
          {isOpen ? (
            <m.div
              animate={{ filter: 'blur(0px)', opacity: 1, y: 0 }}
              className='action-bar'
              data-slot='action-bar'
              exit={{ filter: 'blur(4px)', opacity: 0, y: 8 }}
              initial={{ filter: 'blur(4px)', opacity: 0, y: 8 }}
              transition={{ bounce: 0, duration: 0.3, type: 'spring' }}
            >
              <Toolbar
                {...props}
                {...(orientation ? { orientation } : {})}
                aria-label={ariaLabel}
                className={(state) =>
                  cn(
                    'action-bar__wrapper',
                    typeof className === 'function'
                      ? className(state)
                      : className,
                  ) ?? 'action-bar__wrapper'
                }
                isAttached={isAttached}
              >
                {children}
              </Toolbar>
            </m.div>
          ) : null}
        </AnimatePresence>
      </LazyMotion>
    </ActionBarContext>
  );
}

function ActionBarPrefix({
  children,
  className,
  ...props
}: ComponentPropsWithRef<'div'>): ReactElement {
  useContext(ActionBarContext);
  return (
    <div
      {...props}
      className={cn('action-bar__prefix', className)}
      data-slot='action-bar-prefix'
    >
      {children}
    </div>
  );
}
function ActionBarContent({
  children,
  className,
  ...props
}: ComponentPropsWithRef<'div'>): ReactElement {
  useContext(ActionBarContext);
  return (
    <div
      {...props}
      className={cn('action-bar__content', className)}
      data-slot='action-bar-content'
    >
      {children}
    </div>
  );
}
function ActionBarSuffix({
  children,
  className,
  ...props
}: ComponentPropsWithRef<'div'>): ReactElement {
  useContext(ActionBarContext);
  return (
    <div
      {...props}
      className={cn('action-bar__suffix', className)}
      data-slot='action-bar-suffix'
    >
      {children}
    </div>
  );
}

type ActionBarComponent = typeof ActionBarRoot & {
  Content: typeof ActionBarContent;
  Prefix: typeof ActionBarPrefix;
  Root: typeof ActionBarRoot;
  Suffix: typeof ActionBarSuffix;
};
export const ActionBar: ActionBarComponent = Object.assign(ActionBarRoot, {
  Content: ActionBarContent,
  Prefix: ActionBarPrefix,
  Root: ActionBarRoot,
  Suffix: ActionBarSuffix,
});
export { ActionBarContent, ActionBarPrefix, ActionBarRoot, ActionBarSuffix };
