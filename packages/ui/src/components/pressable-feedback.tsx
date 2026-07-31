'use client';

import { cn, dom, type DOMRenderProps } from '@heroui/react';
import type {
  ComponentPropsWithRef,
  CSSProperties,
  ReactElement,
  ReactNode,
} from 'react';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';

type Sweep = 'down' | 'left' | 'right' | 'up';

function hasDisabledParent(element: HTMLElement | null): boolean {
  const parent = element?.parentElement;
  return Boolean(
    (parent as HTMLButtonElement | null)?.disabled ||
    parent?.getAttribute('aria-disabled') === 'true',
  );
}

function isNestedInteractive(
  parent: HTMLElement | null,
  target: EventTarget | null,
): boolean {
  if (!parent || !(target instanceof Element) || target === parent)
    return false;
  const interactive = target.closest(
    "a,button,input,select,textarea,[role='button']",
  );
  return Boolean(
    interactive && interactive !== parent && parent.contains(interactive),
  );
}

export interface HoldConfirmProps {
  children?: ReactNode;
  className?: string;
  duration?: number;
  isDisabled?: boolean;
  onComplete?: () => void;
  releaseDuration?: number;
  resetOnComplete?: boolean;
  style?: CSSProperties;
  sweep?: Sweep;
}

function HoldConfirm({
  children,
  className = '',
  duration = 2000,
  isDisabled = false,
  onComplete,
  releaseDuration = 200,
  resetOnComplete = true,
  style,
  sweep = 'right',
}: HoldConfirmProps): ReactElement {
  const ref = useRef<HTMLDivElement>(null);
  const [isHolding, setHolding] = useState(false);
  const [isComplete, setComplete] = useState(false);
  const timeout = useRef<ReturnType<typeof setTimeout>>(undefined);
  const onCompleteRef = useRef(onComplete);
  useEffect(() => void (onCompleteRef.current = onComplete), [onComplete]);

  const start = useCallback(() => {
    setHolding(true);
    setComplete(false);
    timeout.current = setTimeout(() => {
      setComplete(true);
      onCompleteRef.current?.();
      if (resetOnComplete) {
        setComplete(false);
        setHolding(false);
      }
    }, duration);
  }, [duration, resetOnComplete]);
  const cancel = useCallback(() => {
    clearTimeout(timeout.current);
    setHolding(false);
  }, []);
  const onStart = useCallback(
    (event: Event) => {
      if (isDisabled || hasDisabledParent(ref.current)) return;
      if (event instanceof PointerEvent) {
        if (
          !event.isPrimary ||
          isNestedInteractive(ref.current?.parentElement ?? null, event.target)
        )
          return;
      } else if (event instanceof KeyboardEvent) {
        if ((event.key !== ' ' && event.key !== 'Enter') || event.repeat)
          return;
      } else return;
      start();
    },
    [isDisabled, start],
  );
  const onKeyUp = useCallback(
    (event: Event) => {
      if (
        event instanceof KeyboardEvent &&
        event.key !== ' ' &&
        event.key !== 'Enter'
      )
        return;
      cancel();
    },
    [cancel],
  );

  useEffect(() => {
    const parent = ref.current?.parentElement;
    if (!parent) return;
    parent.addEventListener('pointerdown', onStart, true);
    parent.addEventListener('pointerup', cancel, true);
    parent.addEventListener('pointerleave', cancel, true);
    parent.addEventListener('pointercancel', cancel, true);
    parent.addEventListener('keydown', onStart, true);
    parent.addEventListener('keyup', onKeyUp, true);
    parent.addEventListener('blur', cancel, true);
    return () => {
      parent.removeEventListener('pointerdown', onStart, true);
      parent.removeEventListener('pointerup', cancel, true);
      parent.removeEventListener('pointerleave', cancel, true);
      parent.removeEventListener('pointercancel', cancel, true);
      parent.removeEventListener('keydown', onStart, true);
      parent.removeEventListener('keyup', onKeyUp, true);
      parent.removeEventListener('blur', cancel, true);
    };
  }, [cancel, onKeyUp, onStart]);
  useEffect(() => () => clearTimeout(timeout.current), []);

  return (
    <div
      ref={ref}
      aria-hidden='true'
      className={cn('pressable-feedback__hold-confirm', className)}
      data-complete={isComplete || undefined}
      data-holding={isHolding || undefined}
      data-slot='pressable-feedback-hold-confirm'
      data-sweep={sweep}
      style={
        {
          '--pressable-feedback-hold-confirm-duration': `${duration}ms`,
          '--pressable-feedback-hold-confirm-release-duration': `${releaseDuration}ms`,
          ...style,
        } as CSSProperties
      }
    >
      {children}
    </div>
  );
}

export interface ProgressFeedbackProps {
  autoReset?: boolean;
  children?: ReactNode;
  className?: string;
  duration?: number;
  isDisabled?: boolean;
  onComplete?: () => void;
  onReset?: () => void;
  releaseDuration?: number;
  resetDelay?: number;
  style?: CSSProperties;
  sweep?: Sweep;
}

function ProgressFeedback({
  autoReset = true,
  children,
  className = '',
  duration = 2000,
  isDisabled = false,
  onComplete,
  onReset,
  releaseDuration = 300,
  resetDelay = 1500,
  style,
  sweep = 'right',
}: ProgressFeedbackProps): ReactElement {
  const ref = useRef<HTMLDivElement>(null);
  const [isProgressing, setProgressing] = useState(false);
  const [isComplete, setComplete] = useState(false);
  const completeTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const resetTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const state = useRef<'complete' | 'idle' | 'progressing'>('idle');
  const onCompleteRef = useRef(onComplete);
  const onResetRef = useRef(onReset);
  useEffect(() => void (onCompleteRef.current = onComplete), [onComplete]);
  useEffect(() => void (onResetRef.current = onReset), [onReset]);

  const start = useCallback(
    (event: Event) => {
      if (
        isDisabled ||
        hasDisabledParent(ref.current) ||
        isNestedInteractive(ref.current?.parentElement ?? null, event.target) ||
        state.current !== 'idle'
      )
        return false;
      state.current = 'progressing';
      setProgressing(true);
      setComplete(false);
      completeTimer.current = setTimeout(() => {
        state.current = 'complete';
        setProgressing(false);
        setComplete(true);
        onCompleteRef.current?.();
        if (autoReset) {
          resetTimer.current = setTimeout(() => {
            state.current = 'idle';
            setComplete(false);
            onResetRef.current?.();
          }, resetDelay);
        }
      }, duration);
      return true;
    },
    [autoReset, duration, isDisabled, resetDelay],
  );
  const onClick = useCallback((event: Event) => void start(event), [start]);
  const onKeyDown = useCallback(
    (event: Event) => {
      if (!(event instanceof KeyboardEvent)) return;
      if ((event.key !== ' ' && event.key !== 'Enter') || event.repeat) return;
      if (start(event)) event.preventDefault();
    },
    [start],
  );
  useEffect(() => {
    const parent = ref.current?.parentElement;
    if (!parent) return;
    parent.addEventListener('click', onClick, true);
    parent.addEventListener('keydown', onKeyDown, true);
    return () => {
      parent.removeEventListener('click', onClick, true);
      parent.removeEventListener('keydown', onKeyDown, true);
    };
  }, [onClick, onKeyDown]);
  useEffect(
    () => () => {
      clearTimeout(completeTimer.current);
      clearTimeout(resetTimer.current);
    },
    [],
  );

  return (
    <div
      ref={ref}
      aria-hidden='true'
      className={cn('pressable-feedback__progress-feedback', className)}
      data-complete={isComplete || undefined}
      data-progressing={isProgressing || undefined}
      data-slot='pressable-feedback-progress-feedback'
      data-sweep={sweep}
      style={
        {
          '--pressable-feedback-progress-feedback-duration': `${duration}ms`,
          '--pressable-feedback-progress-feedback-release-duration': `${releaseDuration}ms`,
          ...style,
        } as CSSProperties
      }
    >
      {children}
    </div>
  );
}

export interface RippleProps {
  className?: string;
  duration?: number;
  easing?: 'cubic-bezier(0.2, 0, 0, 1)';
  hoverOpacity?: number;
  isDisabled?: boolean;
  minimumPressDuration?: number;
  pressedOpacity?: number;
  style?: CSSProperties;
  touchDelay?: number;
}

function Ripple({
  className = '',
  duration = 150,
  easing,
  hoverOpacity,
  isDisabled = false,
  minimumPressDuration = 225,
  pressedOpacity,
  style,
  touchDelay = 150,
}: RippleProps): ReactElement {
  const rootRef = useRef<HTMLDivElement>(null);
  const surfaceRef = useRef<HTMLDivElement>(null);
  const [hovered, setHovered] = useState(false);
  const [pressed, setPressed] = useState(false);
  const initialSize = useRef('');
  const scale = useRef('');
  const initialSizeValue = useRef(0);
  const animation = useRef<Animation>(null);
  const touchState = useRef<0 | 1 | 2 | 3>(0);
  const pointerEvent = useRef<PointerEvent | undefined>(undefined);
  const ignoreEmulatedMouseEvents = useRef(false);

  useEffect(() => {
    const surface = surfaceRef.current;
    if (!surface) return;
    if (hoverOpacity != null)
      surface.style.setProperty(
        '--pressable-feedback-ripple-hover-opacity',
        String(hoverOpacity),
      );
    if (pressedOpacity != null)
      surface.style.setProperty(
        '--pressable-feedback-ripple-pressed-opacity',
        String(pressedOpacity),
      );
    if (duration !== 150)
      surface.style.setProperty(
        '--pressable-feedback-ripple-duration',
        `${duration}ms`,
      );
  }, [duration, hoverOpacity, pressedOpacity]);

  const isTouch = useCallback(
    (event: PointerEvent) => event.pointerType === 'touch',
    [],
  );
  const nested = useCallback(
    (event: PointerEvent | MouseEvent) =>
      isNestedInteractive(rootRef.current?.parentElement ?? null, event.target),
    [],
  );
  const valid = useCallback(
    (event: PointerEvent) => {
      if (
        isDisabled ||
        (rootRef.current?.parentElement as HTMLButtonElement | null)
          ?.disabled ||
        !event.isPrimary ||
        (pointerEvent.current &&
          pointerEvent.current.pointerId !== event.pointerId)
      )
        return false;
      if (event.type === 'pointerenter' || event.type === 'pointerleave')
        return !isTouch(event);
      if (nested(event)) return false;
      return isTouch(event) || event.buttons === 1;
    },
    [isDisabled, isTouch, nested],
  );
  const isInside = useCallback((event: PointerEvent) => {
    const root = rootRef.current;
    if (!root) return false;
    const rect = root.getBoundingClientRect();
    return (
      event.x >= rect.left &&
      event.x <= rect.right &&
      event.y >= rect.top &&
      event.y <= rect.bottom
    );
  }, []);
  const measure = useCallback(() => {
    const root = rootRef.current;
    if (!root) return;
    const { height, width } = root.getBoundingClientRect();
    const size = Math.max(height, width);
    const extra = Math.max(0.35 * size, 75);
    const initial = Math.floor(size * 0.2);
    const final = Math.sqrt(width ** 2 + height ** 2) + 12;
    initialSizeValue.current = initial;
    initialSize.current = `${initial}px`;
    scale.current = String((final + extra) / initial);
  }, []);
  const eventPoint = useCallback((event: MouseEvent | PointerEvent) => {
    const root = rootRef.current;
    if (!root) return { x: 0, y: 0 };
    const rect = root.getBoundingClientRect();
    return {
      x: event.pageX - (window.scrollX + rect.left),
      y: event.pageY - (window.scrollY + rect.top),
    };
  }, []);
  const points = useCallback(
    (event?: MouseEvent | PointerEvent) => {
      const parent = rootRef.current?.parentElement;
      if (!parent)
        return { endPoint: { x: 0, y: 0 }, startPoint: { x: 0, y: 0 } };
      const rect = parent.getBoundingClientRect();
      const center = {
        x: (rect.width - initialSizeValue.current) / 2,
        y: (rect.height - initialSizeValue.current) / 2,
      };
      return {
        endPoint: center,
        startPoint: event ? eventPoint(event) : center,
      };
    },
    [eventPoint],
  );
  const start = useCallback(
    (event?: MouseEvent | PointerEvent) => {
      const surface = surfaceRef.current;
      if (!surface) return;
      setPressed(true);
      animation.current?.cancel();
      measure();
      const { endPoint, startPoint } = points(event);
      animation.current = surface.animate(
        {
          height: [initialSize.current, initialSize.current],
          transform: [
            `translate(${startPoint.x}px,${startPoint.y}px) scale(1)`,
            `translate(${endPoint.x}px,${endPoint.y}px) scale(${scale.current})`,
          ],
          width: [initialSize.current, initialSize.current],
        },
        {
          duration,
          ...(easing ? { easing } : {}),
          fill: 'forwards',
          pseudoElement: '::after',
        },
      );
    },
    [duration, easing, measure, points],
  );
  const end = useCallback(() => {
    pointerEvent.current = undefined;
    touchState.current = 0;
    const currentAnimation = animation.current;
    const currentTime = currentAnimation?.currentTime;
    let elapsed = Number.POSITIVE_INFINITY;
    if (typeof currentTime === 'number') elapsed = currentTime;
    else if (
      currentTime &&
      typeof currentTime === 'object' &&
      'to' in currentTime &&
      typeof currentTime.to === 'function'
    )
      elapsed = currentTime.to('ms').value;
    if (elapsed >= minimumPressDuration) {
      setPressed(false);
      return;
    }
    if (elapsed < minimumPressDuration)
      setTimeout(() => {
        if (animation.current === currentAnimation) setPressed(false);
      }, minimumPressDuration - elapsed);
  }, [minimumPressDuration]);

  const pointerEnter = useCallback(
    (event: PointerEvent) => {
      if (valid(event)) setHovered(true);
    },
    [valid],
  );
  const pointerLeave = useCallback(
    (event: PointerEvent) => {
      if (!valid(event)) return;
      setHovered(false);
      if (touchState.current !== 0) end();
    },
    [end, valid],
  );
  const pointerUp = useCallback(
    (event: PointerEvent) => {
      if (!valid(event)) return;
      if (touchState.current === 2) {
        touchState.current = 3;
        return;
      }
      if (touchState.current === 1) {
        touchState.current = 3;
        start(pointerEvent.current);
      }
    },
    [start, valid],
  );
  const pointerDown = useCallback(
    (event: PointerEvent) => {
      if (!valid(event)) return;
      pointerEvent.current = event;
      if (!isTouch(event)) {
        touchState.current = 3;
        start(event);
        return;
      }
      if (ignoreEmulatedMouseEvents.current && !isInside(event)) return;
      ignoreEmulatedMouseEvents.current = false;
      touchState.current = 1;
      setTimeout(() => {
        if (touchState.current === 1) {
          touchState.current = 2;
          start(event);
        }
      }, touchDelay);
    },
    [isInside, isTouch, start, touchDelay, valid],
  );
  const click = useCallback(
    (event: MouseEvent) => {
      if (isDisabled || nested(event)) return;
      if (touchState.current === 3) {
        end();
        return;
      }
      if (touchState.current === 0) {
        start(event);
        end();
      }
    },
    [end, isDisabled, nested, start],
  );
  const pointerCancel = useCallback(
    (event: PointerEvent) => {
      if (valid(event)) end();
    },
    [end, valid],
  );
  const contextMenu = useCallback(() => {
    if (!isDisabled) {
      ignoreEmulatedMouseEvents.current = true;
      end();
    }
  }, [end, isDisabled]);
  useEffect(() => {
    const parent = rootRef.current?.parentElement;
    if (!parent) return;
    parent.addEventListener('click', click, true);
    parent.addEventListener('contextmenu', contextMenu, true);
    parent.addEventListener('pointercancel', pointerCancel, true);
    parent.addEventListener('pointerdown', pointerDown, true);
    parent.addEventListener('pointerenter', pointerEnter, true);
    parent.addEventListener('pointerleave', pointerLeave, true);
    parent.addEventListener('pointerup', pointerUp, true);
    return () => {
      parent.removeEventListener('click', click, true);
      parent.removeEventListener('contextmenu', contextMenu, true);
      parent.removeEventListener('pointercancel', pointerCancel, true);
      parent.removeEventListener('pointerdown', pointerDown, true);
      parent.removeEventListener('pointerenter', pointerEnter, true);
      parent.removeEventListener('pointerleave', pointerLeave, true);
      parent.removeEventListener('pointerup', pointerUp, true);
    };
  }, [
    click,
    contextMenu,
    duration,
    easing,
    isDisabled,
    minimumPressDuration,
    pointerCancel,
    pointerDown,
    pointerEnter,
    pointerLeave,
    pointerUp,
    touchDelay,
  ]);

  return (
    <div
      ref={rootRef}
      aria-disabled={isDisabled || undefined}
      aria-hidden='true'
      className={cn('pressable-feedback__ripple', className)}
      style={style}
    >
      <div
        ref={surfaceRef}
        className={cn(
          'pressable-feedback__ripple-surface',
          hovered && '--hover',
          pressed && '--press',
        )}
      />
    </div>
  );
}

const PressableFeedbackContext = createContext(true);

export interface PressableFeedbackRootProps
  extends
    Omit<ComponentPropsWithRef<'button'>, 'className'>,
    DOMRenderProps<'button', undefined> {
  children: ReactNode;
  className?: string;
  isDisabled?: boolean;
}

function PressableFeedbackRoot({
  children,
  className,
  isDisabled,
  ...props
}: PressableFeedbackRootProps): ReactElement {
  return (
    <PressableFeedbackContext value>
      <dom.button
        aria-disabled={isDisabled || undefined}
        className={cn('pressable-feedback', className) ?? ''}
        data-slot='pressable-feedback'
        disabled={isDisabled || undefined}
        type='button'
        {...props}
      >
        {children}
      </dom.button>
    </PressableFeedbackContext>
  );
}

function Highlight({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>): ReactElement {
  useContext(PressableFeedbackContext);
  return (
    <div
      aria-hidden='true'
      className={cn('pressable-feedback__highlight', className)}
      data-slot='pressable-feedback-highlight'
      {...props}
    />
  );
}

type PressableFeedbackComponent = typeof PressableFeedbackRoot & {
  Highlight: typeof Highlight;
  HoldConfirm: typeof HoldConfirm;
  ProgressFeedback: typeof ProgressFeedback;
  Ripple: typeof Ripple;
  Root: typeof PressableFeedbackRoot;
};

export const PressableFeedback: PressableFeedbackComponent = Object.assign(
  PressableFeedbackRoot,
  {
    Highlight,
    HoldConfirm,
    ProgressFeedback,
    Ripple,
    Root: PressableFeedbackRoot,
  },
);
