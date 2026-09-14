import { cn } from '@aero/ui';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import { useWindowSize } from '@/app/hooks/useWindowSize';
import { useTooltipStore } from '@/app/providers/global-tooltip/global-tooltip-store';

interface TooltipPosition {
  top: number;
  // Only one of these is set, matching `side` — the other stays null so we
  // never emit both `left` and `right` at once (that would force a width).
  left: number | null;
  right: number | null;
}

type Side = 'left' | 'right';

export function GlobalTooltip() {
  const {
    isOpen,
    isVisible,
    content,
    triggerRect,
    offset,
    isInteractive,
    setHovered,
    cancelHide,
    hideTooltip,
  } = useTooltipStore();

  const tooltipRef = useRef<HTMLDivElement>(null);
  const prevSideRef = useRef<Side | null>(null);
  const updatePositionRef = useRef<() => void>(() => {
    //
  });

  const [adjustedPos, setAdjustedPos] = useState<TooltipPosition | null>(null);
  const [maxWidth, setMaxWidth] = useState<number | null>(null);
  const [side, setSide] = useState<Side>('right');
  const [wasOpen, setWasOpen] = useState(false);
  const [snapPosition, setSnapPosition] = useState(true);

  const isMobile = useWindowSize((size) => size.width < 768);
  const isPositioned = adjustedPos !== null;

  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        setWasOpen(true);
      }, 50);

      return () => clearTimeout(timer);
    }

    setWasOpen(false);
  }, [isOpen]);

  useEffect(() => {
    if (!isVisible) {
      setAdjustedPos(null);
      setMaxWidth(null);
      prevSideRef.current = null;
      setSnapPosition(true);
    }
  }, [isVisible]);

  useEffect(() => {
    if (!isVisible) return;

    const handleGlobalClickOrFocus = (e: MouseEvent | FocusEvent) => {
      if (
        tooltipRef.current &&
        !tooltipRef.current.contains(e.target as Node)
      ) {
        setHovered(false);
        hideTooltip();
      }
    };

    const handleScroll = () => {
      setHovered(false);
      hideTooltip();
    };

    window.addEventListener('pointerdown', handleGlobalClickOrFocus, true);
    window.addEventListener('focusin', handleGlobalClickOrFocus, true);
    window.addEventListener('scroll', handleScroll, {
      capture: true,
      passive: true,
    });

    return () => {
      window.removeEventListener('pointerdown', handleGlobalClickOrFocus, true);
      window.removeEventListener('focusin', handleGlobalClickOrFocus, true);
      window.removeEventListener('scroll', handleScroll, true);
    };
  }, [isVisible, setHovered, hideTooltip]);

  const updatePosition = () => {
    const tooltip = tooltipRef.current;

    if (!tooltip || !triggerRect) {
      return;
    }

    const previousInlineMaxWidth = tooltip.style.maxWidth;
    tooltip.style.maxWidth = 'none';
    const naturalRect = tooltip.getBoundingClientRect();
    tooltip.style.maxWidth = previousInlineMaxWidth;

    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const padding = 12;

    const rightSpace = viewportWidth - triggerRect.right - offset - padding;
    const leftSpace = triggerRect.left - offset - padding;

    let nextSide: Side;
    let availableWidth: number;

    if (naturalRect.width <= rightSpace) {
      nextSide = 'right';
      availableWidth = rightSpace;
    } else if (naturalRect.width <= leftSpace) {
      nextSide = 'left';
      availableWidth = leftSpace;
    } else if (rightSpace >= leftSpace) {
      nextSide = 'right';
      availableWidth = Math.max(0, rightSpace);
    } else {
      nextSide = 'left';
      availableWidth = Math.max(0, leftSpace);
    }

    // Anchor points are computed WITHOUT depending on tooltip width, so a
    // later width change (new content, async-loaded content, etc.) never
    // needs the anchor itself to move — only the free edge moves, natively,
    // via CSS. `maxWidth` (below) guarantees that free edge never crosses
    // back over the trigger.
    let nextLeft: number | null = null;
    let nextRight: number | null = null;

    if (nextSide === 'right') {
      nextLeft = Math.max(
        padding,
        Math.min(triggerRect.right + offset, viewportWidth - padding),
      );
    } else {
      // Distance from the viewport's right edge to the point where the
      // tooltip's right edge should sit (trigger's left edge, minus offset).
      nextRight = Math.max(
        padding,
        viewportWidth - (triggerRect.left - offset),
      );
    }

    let top = triggerRect.top + triggerRect.height / 2 - naturalRect.height / 2;

    top = Math.max(
      padding,
      Math.min(top, viewportHeight - naturalRect.height - padding),
    );

    const sideChanged =
      prevSideRef.current !== null && prevSideRef.current !== nextSide;
    const shouldSnap = sideChanged || prevSideRef.current === null;

    prevSideRef.current = nextSide;
    setSnapPosition(shouldSnap);
    setSide(nextSide);
    setMaxWidth(Math.max(0, availableWidth));
    setAdjustedPos({ top, left: nextLeft, right: nextRight });

    if (shouldSnap) {
      requestAnimationFrame(() => setSnapPosition(false));
    }
  };

  updatePositionRef.current = updatePosition;

  useLayoutEffect(() => {
    updatePosition();
  }, [triggerRect, offset, content]);

  useLayoutEffect(() => {
    const tooltip = tooltipRef.current;
    if (!isVisible || !tooltip) return;

    const observer = new ResizeObserver(() => {
      updatePositionRef.current();
    });

    observer.observe(tooltip);

    return () => observer.disconnect();
  }, [isVisible]);

  useEffect(() => {
    if (!isVisible) return;

    window.addEventListener('resize', updatePosition);
    return () => {
      window.removeEventListener('resize', updatePosition);
    };
  }, [isVisible, triggerRect, offset, content]);

  if (!isVisible || !triggerRect || !content || isMobile) {
    return null;
  }

  // Only emit ONE of left/right, matching `side` — never both, or the
  // browser would be forced to stretch the box between two fixed edges
  // instead of letting the free edge grow with content.
  const horizontalStyle =
    side === 'right'
      ? { left: `${adjustedPos?.left ?? triggerRect.right + offset}px` }
      : {
          right: `${adjustedPos?.right ?? window.innerWidth - (triggerRect.left - offset)}px`,
        };

  return createPortal(
    <div
      ref={tooltipRef}
      tabIndex={-1}
      onMouseEnter={() => {
        cancelHide();
        if (isInteractive) {
          setHovered(true);
        }
      }}
      onMouseLeave={() => {
        if (isInteractive) {
          setHovered(false);
        }
      }}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) {
          setHovered(false);
          hideTooltip();
        }
      }}
      className={cn(
        'fixed z-40',
        'bg-overlay/60 border-separator rounded-lg border backdrop-blur-sm',
        'transition-[opacity,transform] duration-150 ease-out',
        wasOpen && isOpen && !snapPosition
          ? 'transition-[top,left,right,opacity,transform] duration-150 ease-out'
          : '',
        isOpen && isPositioned
          ? 'translate-x-0 scale-100 opacity-100'
          : cn(
              side === 'right' ? '-translate-x-1' : 'translate-x-1',
              'scale-95 opacity-0',
            ),
        isInteractive ? 'pointer-events-auto' : 'pointer-events-none',
      )}
      style={{
        top: `${adjustedPos?.top ?? triggerRect.top}px`,
        ...horizontalStyle,
        maxWidth: maxWidth ? `${maxWidth}px` : 'calc(100vw - 24px)',
      }}
    >
      <div className='w-max max-w-full p-0'>{content}</div>
    </div>,
    document.body,
  );
}
