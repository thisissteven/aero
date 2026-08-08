'use client';

import { Button, cn, Disclosure } from '@heroui/react';
import type { ComponentPropsWithRef, ReactElement, ReactNode } from 'react';
import { createContext, useContext, useMemo } from 'react';

import { TextShimmer } from './text-shimmer';

interface ChainOfThoughtContextValue {
  isStreaming: boolean;
}

const ChainOfThoughtContext = createContext<ChainOfThoughtContextValue>({
  isStreaming: false,
});

const classes = {
  base: 'chain-of-thought',
  content: 'chain-of-thought__content',
  step: 'chain-of-thought__step',
  stepContent: 'chain-of-thought__step-content',
  stepHeader: 'chain-of-thought__step-header',
  stepIndicator: 'chain-of-thought__step-indicator',
  stepLabel: 'chain-of-thought__step-label',
  steps: 'chain-of-thought__steps',
  trigger: 'chain-of-thought__trigger',
};

const cls = (base: string, className: unknown): string =>
  cn(base, typeof className === 'string' ? className : undefined) ?? base;

export interface ChainOfThoughtRootProps extends Omit<
  ComponentPropsWithRef<typeof Disclosure>,
  'children'
> {
  children: ReactNode;
  /** Show shimmer styling on the trigger while reasoning is in progress. */
  isStreaming?: boolean;
}

export function ChainOfThoughtRoot({
  children,
  className,
  isStreaming = false,
  ...props
}: ChainOfThoughtRootProps): ReactElement {
  const context = useMemo(() => ({ isStreaming }), [isStreaming]);

  return (
    <ChainOfThoughtContext value={context}>
      <Disclosure
        className={cls(
          `${classes.base} ${
            isStreaming
              ? 'chain-of-thought--streaming'
              : 'chain-of-thought--complete'
          }`,
          className,
        )}
        data-slot='chain-of-thought'
        {...props}
      >
        {children}
      </Disclosure>
    </ChainOfThoughtContext>
  );
}

export interface ChainOfThoughtTriggerProps extends Omit<
  ComponentPropsWithRef<typeof Button>,
  'children'
> {
  children: ReactNode;
  icon: ReactNode;
  preview: string;
}

export function ChainOfThoughtTrigger({
  children,
  className,
  icon,
  preview,
  ...props
}: ChainOfThoughtTriggerProps): ReactElement {
  const { isStreaming } = useContext(ChainOfThoughtContext);

  return (
    <Disclosure.Heading>
      <Button
        className={cls(
          classes.trigger,
          cn('text-muted/70! group/cot flex h-10 w-full! min-w-0', className),
        )}
        data-slot='chain-of-thought-trigger'
        size='sm'
        slot='trigger'
        variant='ghost'
        {...props}
      >
        <div className='flex min-w-0 flex-1 items-center gap-2 px-[2.5px]'>
          {icon}
          {isStreaming ? <TextShimmer>{children}</TextShimmer> : children}
          <p className='max-w-4/5 min-w-[200px] flex-1 truncate text-left transition-opacity group-has-[svg[data-expanded=true]]/cot:opacity-0'>
            {preview}
          </p>
        </div>
      </Button>
    </Disclosure.Heading>
  );
}

export interface ChainOfThoughtContentProps extends Omit<
  ComponentPropsWithRef<typeof Disclosure.Content>,
  'children'
> {
  children: ReactNode;
}

export function ChainOfThoughtContent({
  children,
  className,
  ...props
}: ChainOfThoughtContentProps): ReactElement {
  return (
    <Disclosure.Content
      className={cls(classes.content, className)}
      data-slot='chain-of-thought-content'
      {...props}
    >
      <Disclosure.Body>{children}</Disclosure.Body>
    </Disclosure.Content>
  );
}

export interface ChainOfThoughtStepsProps extends ComponentPropsWithRef<'div'> {
  children: ReactNode;
}

export function ChainOfThoughtSteps({
  children,
  className,
  ...props
}: ChainOfThoughtStepsProps): ReactElement {
  return (
    <div
      className={cls(classes.steps, className)}
      data-slot='chain-of-thought-steps'
      {...props}
    >
      {children}
    </div>
  );
}

export interface ChainOfThoughtStepProps extends ComponentPropsWithRef<'div'> {
  children: ReactNode;
  label?: ReactNode;
}

export function ChainOfThoughtStep({
  children,
  className,
  label,
  ...props
}: ChainOfThoughtStepProps): ReactElement {
  return (
    <div
      className={cls(classes.step, className)}
      data-slot='chain-of-thought-step'
      {...props}
    >
      {label ? (
        <div className={classes.stepHeader}>
          <span aria-hidden='true' className={classes.stepIndicator} />
          <span className={classes.stepLabel}>{label}</span>
        </div>
      ) : null}
      <div className={classes.stepContent}>{children}</div>
    </div>
  );
}

export interface ChainOfThoughtComponent {
  (props: ChainOfThoughtRootProps): ReactElement;
  Content: typeof ChainOfThoughtContent;
  Root: typeof ChainOfThoughtRoot;
  Step: typeof ChainOfThoughtStep;
  Steps: typeof ChainOfThoughtSteps;
  Trigger: typeof ChainOfThoughtTrigger;
}

export const ChainOfThought = Object.assign(ChainOfThoughtRoot, {
  Content: ChainOfThoughtContent,
  Root: ChainOfThoughtRoot,
  Step: ChainOfThoughtStep,
  Steps: ChainOfThoughtSteps,
  Trigger: ChainOfThoughtTrigger,
}) as ChainOfThoughtComponent;
