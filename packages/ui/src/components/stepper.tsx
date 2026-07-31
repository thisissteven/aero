'use client';

import { cn } from '@heroui/react';
import type { ComponentPropsWithRef, ReactElement, ReactNode } from 'react';
import {
  Children,
  cloneElement,
  createContext,
  isValidElement,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react';

export type StepperOrientation = 'horizontal' | 'vertical';
export type StepperSize = 'lg' | 'md' | 'sm';
export type StepperStatus = 'active' | 'complete' | 'inactive';
interface StepperContextValue {
  currentStep: number;
  onStepChange: ((step: number) => void) | undefined;
  orientation: StepperOrientation;
  size: StepperSize;
}
export interface StepperStepContextValue {
  index: number;
  isLast: boolean;
  status: StepperStatus;
}
const Context = createContext<StepperContextValue>({
  currentStep: 0,
  onStepChange: undefined,
  orientation: 'horizontal',
  size: 'md',
});
const StepContext = createContext<StepperStepContextValue>({
  index: 0,
  isLast: false,
  status: 'inactive',
});
export const useStepperStep = (): StepperStepContextValue =>
  useContext(StepContext);

interface InternalStepProps {
  _index?: number;
  _isLast?: boolean;
}
type PartComponent = { part?: 'separator' | 'step' };
const isStep = (node: ReactNode): node is ReactElement<StepperStepProps> =>
  isValidElement(node) &&
  (node.type === StepperStep || (node.type as PartComponent).part === 'step');
const isSeparator = (
  node: ReactNode,
): node is ReactElement<StepperSeparatorProps> =>
  isValidElement(node) &&
  (node.type === StepperSeparator ||
    (node.type as PartComponent).part === 'separator');

export interface StepperRootProps extends Omit<
  ComponentPropsWithRef<'ol'>,
  'children'
> {
  children: ReactNode;
  currentStep?: number;
  defaultStep?: number;
  onStepChange?: (step: number) => void;
  orientation?: StepperOrientation;
  size?: StepperSize;
}
export function StepperRoot({
  children,
  className,
  currentStep,
  defaultStep = 0,
  onStepChange,
  orientation = 'horizontal',
  size = 'md',
  ...props
}: StepperRootProps): ReactElement {
  const [uncontrolledStep, setUncontrolledStep] = useState(defaultStep);
  const activeStep = currentStep ?? uncontrolledStep;
  const changeStep = useCallback(
    (step: number) => {
      if (currentStep === undefined) setUncontrolledStep(step);
      onStepChange?.(step);
    },
    [currentStep, onStepChange],
  );
  const context = useMemo(
    () => ({
      currentStep: activeStep,
      onStepChange: onStepChange ? changeStep : undefined,
      orientation,
      size,
    }),
    [activeStep, changeStep, onStepChange, orientation, size],
  );
  const nodes = Children.toArray(children);
  const count = nodes.filter(isStep).length;
  let index = 0;
  const renderedChildren = nodes.map((node) => {
    if (!isStep(node)) return node;
    const stepIndex = index++;
    return cloneElement(node, {
      _index: stepIndex,
      _isLast: stepIndex === count - 1,
      key: node.key ?? `step-${stepIndex}`,
    } as InternalStepProps);
  });
  return (
    <Context value={context}>
      <ol
        {...props}
        aria-label={props['aria-label'] ?? 'Progress'}
        className={cn(
          'stepper',
          `stepper--${orientation}`,
          `stepper--${size}`,
          className,
        )}
        data-slot='stepper'
      >
        {renderedChildren}
      </ol>
    </Context>
  );
}

export interface StepperStepProps
  extends Omit<ComponentPropsWithRef<'li'>, 'content'>, InternalStepProps {
  children?: ReactNode;
}
export function StepperStep({
  _index,
  _isLast,
  children,
  className,
  ...props
}: StepperStepProps): ReactElement {
  const stepper = useContext(Context);
  const index = _index ?? 0;
  const isLast = _isLast ?? false;
  const floor = Math.floor(stepper.currentStep);
  const status: StepperStatus =
    floor === index ? 'active' : floor > index ? 'complete' : 'inactive';
  const context = useMemo(
    () => ({ index, isLast, status }),
    [index, isLast, status],
  );
  const contents: ReactNode[] = [];
  let separator: ReactElement<StepperSeparatorProps> | null = null;
  Children.forEach(children, (child) => {
    if (isSeparator(child)) separator = child;
    else contents.push(child);
  });
  const buttonClass = cn(
    'stepper__step-button',
    `stepper__step-button--${stepper.orientation}`,
  );
  const clickable = Boolean(stepper.onStepChange);
  return (
    <StepContext value={context}>
      <li
        {...props}
        className={cn(
          'stepper__step',
          `stepper__step--${stepper.orientation}`,
          className,
        )}
        data-index={index}
        data-slot='stepper-step'
        data-status={status}
      >
        {clickable ? (
          <button
            {...(status === 'active'
              ? { 'aria-current': 'step' as const }
              : {})}
            className={buttonClass ?? ''}
            data-clickable='true'
            data-slot='stepper-step-button'
            type='button'
            onClick={() => stepper.onStepChange?.(index)}
          >
            {contents}
          </button>
        ) : (
          <div
            aria-current={status === 'active' ? 'step' : undefined}
            className={buttonClass}
            data-slot='stepper-step-button'
          >
            {contents}
          </div>
        )}
        {separator}
      </li>
    </StepContext>
  );
}

export interface StepperIndicatorProps extends ComponentPropsWithRef<'span'> {
  children?: ReactNode;
}
export function StepperIndicator({
  children,
  className,
  ...props
}: StepperIndicatorProps): ReactElement {
  const { size } = useContext(Context);
  const { index, status } = useContext(StepContext);
  const fallback =
    status === 'complete' ? (
      <StepperIcon>
        <svg
          aria-hidden='true'
          data-slot='stepper-default-checkmark'
          fill='none'
          role='presentation'
          stroke='currentColor'
          strokeLinecap='round'
          strokeLinejoin='round'
          strokeWidth='2.5'
          viewBox='0 0 17 18'
        >
          <polyline points='1 9 7 14 15 4' />
        </svg>
      </StepperIcon>
    ) : (
      <span>{index + 1}</span>
    );
  return (
    <span
      {...props}
      className={cn(
        'stepper__indicator',
        `stepper__indicator--${size}`,
        className,
      )}
      data-slot='stepper-indicator'
      data-status={status}
    >
      {children ?? fallback}
    </span>
  );
}

export type StepperContentProps = ComponentPropsWithRef<'span'>;
export function StepperContent({
  children,
  className,
  ...props
}: StepperContentProps): ReactElement {
  const { orientation } = useContext(Context);
  return (
    <span
      {...props}
      className={cn(
        'stepper__content',
        `stepper__content--${orientation}`,
        className,
      )}
      data-slot='stepper-content'
    >
      {children}
    </span>
  );
}
export type StepperTitleProps = ComponentPropsWithRef<'span'>;
export function StepperTitle({
  children,
  className,
  ...props
}: StepperTitleProps): ReactElement {
  const { size } = useContext(Context);
  return (
    <span
      {...props}
      className={cn('stepper__title', `stepper__title--${size}`, className)}
      data-slot='stepper-title'
    >
      {children}
    </span>
  );
}
export type StepperDescriptionProps = ComponentPropsWithRef<'span'>;
export function StepperDescription({
  children,
  className,
  ...props
}: StepperDescriptionProps): ReactElement {
  const { size } = useContext(Context);
  return (
    <span
      {...props}
      className={cn(
        'stepper__description',
        `stepper__description--${size}`,
        className,
      )}
      data-slot='stepper-description'
    >
      {children}
    </span>
  );
}
export type StepperIconProps = ComponentPropsWithRef<'span'>;
export function StepperIcon({
  children,
  className,
  ...props
}: StepperIconProps): ReactElement {
  return (
    <span
      {...props}
      className={cn('stepper__icon', className)}
      data-slot='stepper-icon'
    >
      {children}
    </span>
  );
}
export interface StepperSeparatorProps extends ComponentPropsWithRef<'div'> {
  force?: boolean;
  progress?: number;
}
export function StepperSeparator({
  className,
  force,
  progress,
  ...props
}: StepperSeparatorProps): ReactElement | null {
  const { currentStep, orientation } = useContext(Context);
  const { index, isLast } = useContext(StepContext);
  if (isLast && !force) return null;
  const floor = Math.floor(currentStep);
  const automatic =
    floor > index ? 1 : floor === index ? currentStep - floor : 0;
  const value = Math.min(1, Math.max(0, progress ?? automatic));
  return (
    <div
      {...props}
      aria-hidden='true'
      className={cn(
        'stepper__separator',
        `stepper__separator--${orientation}`,
        className,
      )}
      data-slot='stepper-separator'
    >
      <div
        className={cn(
          'stepper__separator-track',
          `stepper__separator-track--${orientation}`,
        )}
        data-complete={value >= 1 || undefined}
        data-slot='stepper-separator-track'
      >
        <div
          className={cn(
            'stepper__separator-fill',
            `stepper__separator-fill--${orientation}`,
          )}
          data-slot='stepper-separator-fill'
          style={
            { '--stepper-separator-progress': value } as React.CSSProperties
          }
        />
      </div>
    </div>
  );
}

(StepperStep as PartComponent).part = 'step';
(StepperSeparator as PartComponent).part = 'separator';
type StepperComponent = typeof StepperRoot & {
  Content: typeof StepperContent;
  Description: typeof StepperDescription;
  Icon: typeof StepperIcon;
  Indicator: typeof StepperIndicator;
  Root: typeof StepperRoot;
  Separator: typeof StepperSeparator;
  Step: typeof StepperStep;
  Title: typeof StepperTitle;
  useStep: typeof useStepperStep;
};
export const Stepper: StepperComponent = Object.assign(StepperRoot, {
  Content: StepperContent,
  Description: StepperDescription,
  Icon: StepperIcon,
  Indicator: StepperIndicator,
  Root: StepperRoot,
  Separator: StepperSeparator,
  Step: StepperStep,
  Title: StepperTitle,
  useStep: useStepperStep,
});
