import React, {
  Children,
  cloneElement,
  createContext,
  HTMLAttributes,
  isValidElement,
  ReactElement,
  ReactNode,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';

import { useOnClickOutside } from '@/app/hooks/useOnClickOutside';

export type ExpandBehavior = 'spread' | 'vertical' | 'horizontal';
export type ExpandOrigin = 'trigger-left' | 'trigger' | 'trigger-right';

interface Position {
  top: number;
  left: number;
}

interface AttachContextActionContextValue {
  isOpen: boolean;
  setIsOpen: React.Dispatch<React.SetStateAction<boolean>>;
  toggle: () => void;
  triggerRef: React.RefObject<HTMLDivElement | null>;
  portalRef: React.RefObject<HTMLDivElement | null>;
  triggerPos: Position;
  updatePosition: () => void;
  gap: number;
  expandBehavior: ExpandBehavior;
  expandOrigin: ExpandOrigin;
}

const AttachContextActionContext =
  createContext<AttachContextActionContextValue | null>(null);

function useAttachContextAction() {
  const ctx = useContext(AttachContextActionContext);
  if (!ctx) {
    throw new Error(
      'AttachContextAction subcomponents must be used within <AttachContextAction>',
    );
  }
  return ctx;
}

// Helper to calculate item coordinates based on behavior, origin, and gap
function getPositions(
  count: number,
  gap: number,
  behavior: ExpandBehavior = 'spread',
  origin: ExpandOrigin = 'trigger',
) {
  if (count <= 0) return [];

  // 1. SPREAD (ARC) BEHAVIOR
  if (behavior === 'spread') {
    let startAngle = -150;
    let endAngle = -30;

    if (origin === 'trigger-left') {
      startAngle = -210;
      endAngle = -90;
    } else if (origin === 'trigger-right') {
      startAngle = -90;
      endAngle = 30;
    }

    if (count === 1) {
      const midAngle = ((startAngle + endAngle) / 2) * (Math.PI / 180);
      return [
        {
          fx: Math.round(gap * Math.cos(midAngle)),
          fy: Math.round(gap * Math.sin(midAngle)),
        },
      ];
    }

    const step = (endAngle - startAngle) / (count - 1);
    return Array.from({ length: count }, (_, i) => {
      const angle = (startAngle + i * step) * (Math.PI / 180);
      return {
        fx: Math.round(gap * Math.cos(angle)),
        fy: Math.round(gap * Math.sin(angle)),
      };
    });
  }

  // 2. VERTICAL LINE BEHAVIOR
  if (behavior === 'vertical') {
    let fxOffset = 0;
    if (origin === 'trigger-left') fxOffset = -14;
    if (origin === 'trigger-right') fxOffset = 14;

    return Array.from({ length: count }, (_, i) => ({
      fx: fxOffset,
      // Item 0 is at offset -1*gap, Item 1 at -2*gap, etc.
      fy: -Math.round((i + 1) * gap),
    }));
  }

  // 3. HORIZONTAL LINE BEHAVIOR
  if (behavior === 'horizontal') {
    if (origin === 'trigger-left') {
      return Array.from({ length: count }, (_, i) => ({
        // Item 0 is at offset -1*gap, Item 1 at -2*gap, etc.
        fx: -Math.round((i + 1) * gap),
        fy: 0,
      }));
    }

    if (origin === 'trigger-right') {
      return Array.from({ length: count }, (_, i) => ({
        // Item 0 is at offset +1*gap, Item 1 at +2*gap, etc.
        fx: Math.round((i + 1) * gap),
        fy: 0,
      }));
    }

    // Centered horizontal spread above trigger
    const half = (count - 1) / 2;
    return Array.from({ length: count }, (_, i) => ({
      fx: Math.round((i - half) * gap),
      fy: -gap,
    }));
  }

  return [];
}

export interface AttachContextActionProps {
  children: ReactNode;
  defaultOpen?: boolean;
  /** Spacing from trigger to first item, and between consecutive items. Defaults to 48. */
  gap?: number;
  /** Legacy distance prop (falls back to gap if omitted). */
  distance?: number;
  /** Layout pattern for expanding items. Defaults to 'spread'. */
  expandBehavior?: ExpandBehavior;
  /** Anchor orientation relative to the trigger. Defaults to 'trigger'. */
  expandOrigin?: ExpandOrigin;
}

export function AttachContextAction({
  children,
  defaultOpen = false,
  gap,
  distance,
  expandBehavior = 'spread',
  expandOrigin = 'trigger',
}: AttachContextActionProps) {
  const effectiveGap = gap ?? distance ?? 48;

  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [triggerPos, setTriggerPos] = useState<Position>({ top: 0, left: 0 });

  const triggerRef = useRef<HTMLDivElement | null>(null);
  const portalRef = useRef<HTMLDivElement | null>(null);

  // Close menu when clicking outside trigger or portal overlay
  useOnClickOutside([triggerRef, portalRef], () => {
    if (isOpen) setIsOpen(false);
  });

  const updatePosition = () => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setTriggerPos({
        top: Math.round(rect.top + rect.height / 2 + window.scrollY),
        left: Math.round(rect.left + rect.width / 2 + window.scrollX),
      });
    }
  };

  const toggle = () => {
    if (!isOpen) updatePosition();
    setIsOpen((prev) => !prev);
  };

  // Re-calculate position on scroll, window resize, OR trigger container resize (e.g. textarea expanding)
  useEffect(() => {
    if (isOpen) {
      window.addEventListener('resize', updatePosition);
      window.addEventListener('scroll', updatePosition, true);

      let resizeObserver: ResizeObserver | null = null;
      if (typeof ResizeObserver !== 'undefined' && triggerRef.current) {
        resizeObserver = new ResizeObserver(() => updatePosition());
        resizeObserver.observe(triggerRef.current);
      }

      return () => {
        window.removeEventListener('resize', updatePosition);
        window.removeEventListener('scroll', updatePosition, true);
        if (resizeObserver) resizeObserver.disconnect();
      };
    }
  }, [isOpen]);

  return (
    <AttachContextActionContext.Provider
      value={{
        isOpen,
        setIsOpen,
        toggle,
        triggerRef,
        portalRef,
        triggerPos,
        updatePosition,
        gap: effectiveGap,
        expandBehavior,
        expandOrigin,
      }}
    >
      <style>{`
        .speed-dial-container {
          position: relative;
          display: inline-flex;
          align-items: center;
          justify-content: center;
        }

        .speed-dial-trigger-wrapper {
          position: relative;
          z-index: 2;
          display: inline-flex;
        }

        /* Fixed floating portal layer placed in document.body */
        .speed-dial-portal-layer {
          position: absolute;
          top: 0;
          left: 0;
          width: 0;
          height: 0;
          pointer-events: none;
          opacity: 0;
          visibility: hidden;
          transition: opacity 200ms ease, visibility 200ms ease;
          --pv3x: 350ms;
          --pv3i: cubic-bezier(0.34, 1.56, 0.64, 1);
          --pv3g: 250ms;
          --pv34: cubic-bezier(0.22, 1, 0.36, 1);
          --pv4a: 40ms;
          --pv4l: 1;
        }

        /* Active/Open State */
        .speed-dial-portal-layer[data-open="true"] {
          opacity: 1;
          visibility: visible;
        }

        /* Large SVG container (600x600) to prevent clipping when expanding far */
        .speed-dial-svg {
          position: absolute;
          top: -300px;
          left: -300px;
          width: 600px;
          height: 600px;
          pointer-events: none;
          overflow: visible;
        }

        .speed-dial-circle {
          fill: var(--surface, #181818);
          transition: transform var(--pv3g) var(--pv34), fill 0.2s ease;
          transform-origin: 300px 300px;
          transform: translate(0, 0);
        }

        .speed-dial-portal-layer[data-open="true"] .speed-dial-circle {
          transform: translate(calc(var(--fx, 0px) * var(--pv4l)), calc(var(--fy, 0px) * var(--pv4l)));
          transition: transform var(--pv3x) var(--pv3i), fill 0.2s ease;
          transition-delay: calc(var(--i, 0) * var(--pv4a));
        }

        /* Wrapper for each floating action child inside portal */
        .speed-dial-item-wrapper {
          position: absolute;
          top: -20px;
          left: -20px;
          width: 40px;
          height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
          pointer-events: none;
          transform: translate(0, 0);
          transition: transform var(--pv3g) var(--pv34);

          backface-visibility: hidden;
          -webkit-backface-visibility: hidden;
          transform-style: preserve-3d;
          will-change: transform;
        }

        .speed-dial-portal-layer[data-open="true"] .speed-dial-item-wrapper {
          pointer-events: auto;
          transform: translate(calc(var(--fx, 0px) * var(--pv4l)), calc(var(--fy, 0px) * var(--pv4l)));
          transition: transform var(--pv3x) var(--pv3i);
          transition-delay: calc(var(--i, 0) * var(--pv4a));
        }

        /* Accent focus rings */
        .speed-dial-portal-layer button:focus-visible,
        .speed-dial-container button:focus-visible {
          outline: 2px solid var(--accent, #0073e5);
          outline-offset: 2px;
        }
      `}</style>

      <div className='speed-dial-container'>{children}</div>
    </AttachContextActionContext.Provider>
  );
}

/* -------------------------------------------------------------------------- */
/*                               Component Types                              */
/* -------------------------------------------------------------------------- */

interface AttachContextActionActionProps extends HTMLAttributes<HTMLElement> {
  'aria-expanded'?: boolean;
  tabIndex?: number;
}

interface TriggerProps {
  children: ReactElement<AttachContextActionActionProps>;
}

/* -------------------------------------------------------------------------- */
/*                               Trigger Component                            */
/* -------------------------------------------------------------------------- */

export function AttachContextActionTrigger({ children }: TriggerProps) {
  const { isOpen, toggle, triggerRef, updatePosition } =
    useAttachContextAction();

  return (
    <div ref={triggerRef} className='speed-dial-trigger-wrapper'>
      {cloneElement(children, {
        'aria-expanded': isOpen,
        onClick: (e: React.MouseEvent<HTMLElement>) => {
          updatePosition();
          children.props.onClick?.(e);
          toggle();
        },
      })}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                              Contents Component                            */
/* -------------------------------------------------------------------------- */

export function AttachContextActionContents({
  children,
}: {
  children: ReactNode;
}) {
  const {
    isOpen,
    setIsOpen,
    triggerPos,
    portalRef,
    gap,
    expandBehavior,
    expandOrigin,
  } = useAttachContextAction();

  const items = Children.toArray(children).filter(isValidElement);
  const positions = getPositions(
    items.length,
    gap,
    expandBehavior,
    expandOrigin,
  );

  const portalContent = (
    <div
      ref={portalRef}
      className='speed-dial-portal-layer'
      data-open={isOpen}
      style={{
        top: `${triggerPos.top}px`,
        left: `${triggerPos.left}px`,
      }}
    >
      {/* Liquid SVG Gooey Filter */}
      <svg
        className='speed-dial-svg'
        viewBox='0 0 600 600'
        aria-hidden='true'
        focusable='false'
      >
        <defs>
          <filter
            id='gooey-filter'
            x='-100%'
            y='-100%'
            width='300%'
            height='300%'
            colorInterpolationFilters='sRGB'
          >
            <feGaussianBlur in='SourceGraphic' stdDeviation='6' result='blur' />
            <feColorMatrix
              in='blur'
              type='matrix'
              values='1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 18 -7'
            />
          </filter>
        </defs>

        <g filter='url(#gooey-filter)'>
          {positions.map((pos, index) => {
            const customStyle = {
              '--fx': `${pos.fx}px`,
              '--fy': `${pos.fy}px`,
              '--i': index,
            } as React.CSSProperties;

            return (
              <circle
                key={index}
                className='speed-dial-circle'
                cx='300'
                cy='300'
                r='18'
                style={customStyle}
              />
            );
          })}
          <circle className='speed-dial-circle' cx='300' cy='300' r='18' />
        </g>
      </svg>

      {/* Floating Action Items */}
      {items.map((child, index) => {
        const pos = positions[index] || { fx: 0, fy: 0 };
        const style = {
          '--fx': `${pos.fx}px`,
          '--fy': `${pos.fy}px`,
          '--i': index,
        } as React.CSSProperties;

        const actionChild =
          child as ReactElement<AttachContextActionActionProps>;

        return (
          <div
            key={actionChild.key ?? index}
            className='speed-dial-item-wrapper'
            style={style}
          >
            {cloneElement(actionChild, {
              tabIndex: isOpen ? 0 : -1,
              onClick: (e: React.MouseEvent<HTMLElement>) => {
                actionChild.props.onClick?.(e);
                setIsOpen(false);
              },
            })}
          </div>
        );
      })}
    </div>
  );

  if (typeof window === 'undefined') return null;
  return createPortal(portalContent, document.body);
}

// Attach subcomponents
AttachContextAction.Trigger = AttachContextActionTrigger;
AttachContextAction.Contents = AttachContextActionContents;
