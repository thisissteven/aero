import React, {
  Children,
  cloneElement,
  createContext,
  HTMLAttributes,
  isValidElement,
  ReactElement,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';

import { useIsomorphicLayoutEffect } from '@aero/ui';

import { useKeyPress } from '@/app/hooks/useKeyPress';
import { useOnClickOutside } from '@/app/hooks/useOnClickOutside';

export type ExpandBehavior = 'spread' | 'vertical' | 'horizontal';
export type ExpandOrigin = 'trigger-left' | 'trigger' | 'trigger-right';

interface Position {
  top: number;
  left: number;
}

interface CollapsibleActionsContextValue {
  isOpen: boolean;
  setIsOpen: (value: React.SetStateAction<boolean>) => void;
  toggle: () => void;
  triggerRef: React.RefObject<HTMLDivElement | null>;
  portalRef: React.RefObject<HTMLDivElement | null>;
  triggerPos: Position;
  updatePosition: () => void;
  distance: number;
  gap: number;
  expandBehavior: ExpandBehavior;
  expandOrigin: ExpandOrigin;
  flip: boolean;
}

const CollapsibleActionsContext =
  createContext<CollapsibleActionsContextValue | null>(null);

function useCollapsibleActions() {
  const ctx = useContext(CollapsibleActionsContext);
  if (!ctx) {
    throw new Error(
      'CollapsibleActions subcomponents must be used within <CollapsibleActions>',
    );
  }
  return ctx;
}

function getPositions(
  count: number,
  distance: number,
  gap: number,
  behavior: ExpandBehavior = 'spread',
  origin: ExpandOrigin = 'trigger',
  flip: boolean = false,
) {
  if (count <= 0) return [];

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

    if (flip) {
      startAngle = -startAngle;
      endAngle = -endAngle;
    }

    if (count === 1) {
      const midAngle = ((startAngle + endAngle) / 2) * (Math.PI / 180);
      return [
        {
          fx: Math.round(distance * Math.cos(midAngle)),
          fy: Math.round(distance * Math.sin(midAngle)),
        },
      ];
    }

    const step = (endAngle - startAngle) / (count - 1);
    return Array.from({ length: count }, (_, i) => {
      const angle = (startAngle + i * step) * (Math.PI / 180);
      return {
        fx: Math.round(distance * Math.cos(angle)),
        fy: Math.round(distance * Math.sin(angle)),
      };
    });
  }

  if (behavior === 'vertical') {
    const yDir = flip ? 1 : -1;

    if (origin === 'trigger') {
      return Array.from({ length: count }, (_, i) => ({
        fx: 0,
        fy: yDir * Math.round(distance + i * gap),
      }));
    }

    const xOffset = origin === 'trigger-left' ? -distance : distance;
    return Array.from({ length: count }, (_, i) => ({
      fx: xOffset,
      fy: yDir * Math.round(i * gap),
    }));
  }

  if (behavior === 'horizontal') {
    if (origin === 'trigger-left') {
      return Array.from({ length: count }, (_, i) => ({
        fx: -Math.round(distance + i * gap),
        fy: 0,
      }));
    }

    if (origin === 'trigger-right') {
      return Array.from({ length: count }, (_, i) => ({
        fx: Math.round(distance + i * gap),
        fy: 0,
      }));
    }

    const half = (count - 1) / 2;
    const yOffset = flip ? distance : -distance;
    return Array.from({ length: count }, (_, i) => ({
      fx: Math.round((i - half) * gap),
      fy: yOffset,
    }));
  }

  return [];
}

export interface CollapsibleActionsProps {
  children: ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  defaultOpen?: boolean;
  distance?: number;
  gap?: number;
  expandBehavior?: ExpandBehavior;
  expandOrigin?: ExpandOrigin;
  flip?: boolean;
}

export function CollapsibleActions({
  children,
  open: controlledOpen,
  onOpenChange,
  defaultOpen = false,
  distance = 48,
  gap = 40,
  expandBehavior = 'spread',
  expandOrigin = 'trigger',
  flip = false,
}: CollapsibleActionsProps) {
  const isControlled = controlledOpen !== undefined;
  const [uncontrolledOpen, setUncontrolledOpen] = useState(defaultOpen);

  const isOpen = isControlled ? controlledOpen : uncontrolledOpen;

  const [triggerPos, setTriggerPos] = useState<Position>({ top: 0, left: 0 });

  const triggerRef = useRef<HTMLDivElement | null>(null);
  const portalRef = useRef<HTMLDivElement | null>(null);

  const setIsOpen = useCallback(
    (value: React.SetStateAction<boolean>) => {
      const nextOpen = typeof value === 'function' ? value(isOpen) : value;

      if (!isControlled) {
        setUncontrolledOpen(nextOpen);
      }
      onOpenChange?.(nextOpen);
    },
    [isControlled, isOpen, onOpenChange],
  );

  useOnClickOutside([triggerRef, portalRef], () => {
    if (isOpen) setIsOpen(false);
  });

  useKeyPress('Escape', () => setIsOpen(false), {
    ignoreInputs: false,
  });

  const updatePosition = useCallback(() => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setTriggerPos({
        top: Math.round(rect.top + rect.height / 2),
        left: Math.round(rect.left + rect.width / 2),
      });
    }
  }, []);

  const toggle = useCallback(() => {
    if (!isOpen) updatePosition();
    setIsOpen((prev) => !prev);
  }, [isOpen, setIsOpen, updatePosition]);

  useEffect(() => {
    if (isOpen) {
      updatePosition();

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
  }, [isOpen, updatePosition]);

  return (
    <CollapsibleActionsContext.Provider
      value={{
        isOpen,
        setIsOpen,
        toggle,
        triggerRef,
        portalRef,
        triggerPos,
        updatePosition,
        distance,
        gap,
        expandBehavior,
        expandOrigin,
        flip,
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

        .speed-dial-portal-layer {
          position: fixed;
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

        .speed-dial-portal-layer[data-open="true"] {
          opacity: 1;
          visibility: visible;
        }

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
          transform-origin: 300px 300px;
          /* Default state: disembunyikan & kuncinya dikecilkan biar ga bocor keluar trigger */
          transform: translate(0, 0) scale(0);
          opacity: 0;
          transition: transform var(--pv3g) var(--pv34), opacity 150ms ease, fill 0.2s ease;
        }

        /* Saat Aktif Open: mekar ke posisi tujuan */
        .speed-dial-portal-layer[data-open="true"] .speed-dial-circle {
          opacity: 1;
          transform: translate(calc(var(--fx, 0px) * var(--pv4l)), calc(var(--fy, 0px) * var(--pv4l))) scale(1);
          transition: transform var(--pv3x) var(--pv3i), opacity 150ms ease, fill 0.2s ease;
          transition-delay: calc(var(--i, 0) * var(--pv4a));
        }

        /* Center base circle (titik tengah penyambung gooey): hanya muncul pas open */
        .speed-dial-portal-layer[data-open="true"] .speed-dial-circle-center {
          opacity: 1;
          transform: scale(1);
        }

        .speed-dial-circle-center {
          fill: var(--surface, #181818);
          transform-origin: 300px 300px;
          transform: scale(0);
          opacity: 0;
          transition: transform 200ms ease, opacity 200ms ease;
        }

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
          transform: translate(0, 0) scale(0);
          opacity: 0;
          transition: transform var(--pv3g) var(--pv34), opacity 150ms ease;

          backface-visibility: hidden;
          -webkit-backface-visibility: hidden;
          transform-style: preserve-3d;
          will-change: transform;
        }

        .speed-dial-portal-layer[data-open="true"] .speed-dial-item-wrapper {
          pointer-events: auto;
          opacity: 1;
          transform: translate(calc(var(--fx, 0px) * var(--pv4l)), calc(var(--fy, 0px) * var(--pv4l))) scale(1);
          transition: transform var(--pv3x) var(--pv3i), opacity 150ms ease;
          transition-delay: calc(var(--i, 0) * var(--pv4a));
        }

        .speed-dial-portal-layer button:focus-visible,
        .speed-dial-container button:focus-visible {
          outline: 2px solid var(--accent, #0073e5);
          outline-offset: 2px;
        }

        [data-vaul-drawer]:has(.speed-dial-portal-layer[data-open="true"]),
        [data-slot="sheet-content"]:has(.speed-dial-portal-layer[data-open="true"]),
        .sheet_content:has(.speed-dial-portal-layer[data-open="true"]) {
          overflow: visible !important;
        }
      `}</style>

      <div className='speed-dial-container'>{children}</div>
    </CollapsibleActionsContext.Provider>
  );
}

interface CollapsibleActionsActionProps extends HTMLAttributes<HTMLElement> {
  'aria-expanded'?: boolean;
  tabIndex?: number;
}

interface TriggerProps {
  children: ReactElement<CollapsibleActionsActionProps>;
}

export function CollapsibleActionsTrigger({ children }: TriggerProps) {
  const { isOpen, toggle, triggerRef, updatePosition } =
    useCollapsibleActions();

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

function getAutoContainer(element: HTMLElement | null): HTMLElement {
  if (typeof window === 'undefined' || !element) return document.body;

  const container = element.closest<HTMLElement>(
    [
      '[data-vaul-drawer]',
      '[data-slot="sheet-content"]',
      '[role="dialog"]',
      'dialog',
      '[role="alertdialog"]',
      '[aria-modal="true"]',
    ].join(', '),
  );

  return container || document.body;
}

export function CollapsibleActionsContents({
  children,
}: {
  children: ReactNode;
}) {
  const {
    isOpen,
    triggerRef,
    portalRef,
    distance,
    gap,
    expandBehavior,
    expandOrigin,
    flip,
    setIsOpen,
  } = useCollapsibleActions();

  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(() => {
    return typeof window !== 'undefined' ? document.body : null;
  });

  const [adjustedPos, setAdjustedPos] = useState<Position>({ top: 0, left: 0 });

  const updatePosition = useCallback(() => {
    if (!triggerRef.current) return;

    const target = getAutoContainer(triggerRef.current);
    setPortalTarget(target);

    const triggerRect = triggerRef.current.getBoundingClientRect();

    if (target && target !== document.body) {
      const containerRect = target.getBoundingClientRect();
      setAdjustedPos({
        top: Math.round(
          triggerRect.top - containerRect.top + triggerRect.height / 2,
        ),
        left: Math.round(
          triggerRect.left - containerRect.left + triggerRect.width / 2,
        ),
      });
    } else {
      setAdjustedPos({
        top: Math.round(triggerRect.top + triggerRect.height / 2),
        left: Math.round(triggerRect.left + triggerRect.width / 2),
      });
    }
  }, [triggerRef]);

  useIsomorphicLayoutEffect(() => {
    updatePosition();
  }, [updatePosition]);

  useEffect(() => {
    if (isOpen) {
      updatePosition();
      window.addEventListener('resize', updatePosition);
      window.addEventListener('scroll', updatePosition, true);

      return () => {
        window.removeEventListener('resize', updatePosition);
        window.removeEventListener('scroll', updatePosition, true);
      };
    }
  }, [isOpen, updatePosition]);

  const items = Children.toArray(children).filter(isValidElement);
  const positions = getPositions(
    items.length,
    distance,
    gap,
    expandBehavior,
    expandOrigin,
    flip,
  );

  const portalContent = (
    <div
      ref={portalRef}
      className='speed-dial-portal-layer'
      data-open={isOpen}
      style={{
        top: `${adjustedPos.top}px`,
        left: `${adjustedPos.left}px`,
      }}
    >
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
          {/* Lingkaran pusat gooey hanya aktif/tampil saat menu dalam keadaan OPEN */}
          <circle
            className='speed-dial-circle-center'
            cx='300'
            cy='300'
            r='18'
          />
        </g>
      </svg>

      {items.map((child, index) => {
        const pos = positions[index] || { fx: 0, fy: 0 };
        const style = {
          '--fx': `${pos.fx}px`,
          '--fy': `${pos.fy}px`,
          '--i': index,
        } as React.CSSProperties;

        const actionChild =
          child as ReactElement<CollapsibleActionsActionProps>;

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

  if (!portalTarget) return null;
  return createPortal(portalContent, portalTarget);
}

CollapsibleActions.Trigger = CollapsibleActionsTrigger;
CollapsibleActions.Contents = CollapsibleActionsContents;
