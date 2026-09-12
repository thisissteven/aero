import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import { cn } from '@aero/ui';

import { useWindowSize } from '@/app/hooks/useWindowSize';
import { useTooltipStore } from '@/app/providers/global-tooltip/global-tooltip-store';

interface TooltipPosition {
  top: number;
  left: number;
}

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
  } = useTooltipStore();

  const tooltipRef = useRef<HTMLDivElement>(null);

  const [adjustedPos, setAdjustedPos] = useState<TooltipPosition | null>(null);

  const [maxWidth, setMaxWidth] = useState<number | null>(null);
  const [wasOpen, setWasOpen] = useState(false);

  const isMobile = useWindowSize((size) => size.width < 768);

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
    }
  }, [isVisible]);

  const updatePosition = () => {
    const tooltip = tooltipRef.current;

    if (!tooltip || !triggerRect) {
      return;
    }

    const tooltipRect = tooltip.getBoundingClientRect();

    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const padding = 12;

    const rightSpace = viewportWidth - triggerRect.right - offset - padding;

    const leftSpace = triggerRect.left - offset - padding;

    let left: number;
    let availableWidth: number;

    // Prefer right.
    if (tooltipRect.width <= rightSpace) {
      left = triggerRect.right + offset;
      availableWidth = rightSpace;
    }
    // Otherwise place it to the left of the trigger.
    else if (tooltipRect.width <= leftSpace) {
      left = triggerRect.left - offset - tooltipRect.width;
      availableWidth = leftSpace;
    }
    // Neither side fits; use whichever side has more room.
    else if (rightSpace >= leftSpace) {
      left = triggerRect.right + offset;
      availableWidth = Math.max(0, rightSpace);
    } else {
      availableWidth = Math.max(0, leftSpace);
      left = triggerRect.left - offset - availableWidth;
    }

    // Keep the tooltip inside the viewport.
    left = Math.max(
      padding,
      Math.min(left, viewportWidth - tooltipRect.width - padding),
    );

    setMaxWidth(Math.max(0, availableWidth));

    let top = triggerRect.top + triggerRect.height / 2 - tooltipRect.height / 2;

    top = Math.max(
      padding,
      Math.min(top, viewportHeight - tooltipRect.height - padding),
    );

    setAdjustedPos({
      top,
      left,
    });
  };

  useLayoutEffect(() => {
    updatePosition();
  }, [triggerRect, offset, content]);

  useEffect(() => {
    if (!isVisible) {
      return;
    }

    window.addEventListener('resize', updatePosition);

    return () => {
      window.removeEventListener('resize', updatePosition);
    };
  }, [isVisible, triggerRect, offset, content]);

  if (!isVisible || !triggerRect || !content || isMobile) {
    return null;
  }

  const tooltip = (
    <div
      ref={tooltipRef}
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
      className={cn(
        'fixed z-40',
        'bg-overlay/60 border-separator rounded-lg border backdrop-blur-sm',
        wasOpen && isOpen ? 'transition-[top,left] duration-150 ease-out' : '',
        isInteractive ? 'pointer-events-auto' : 'pointer-events-none',
      )}
      style={{
        top: `${adjustedPos?.top ?? triggerRect.top}px`,
        left: `${adjustedPos?.left ?? triggerRect.right + offset}px`,
        maxWidth: maxWidth ? `${maxWidth}px` : 'calc(100vw - 24px)',
      }}
    >
      <div
        className={`w-max max-w-full transition-all duration-150 ease-out ${
          isOpen
            ? 'translate-x-0 scale-100 opacity-100'
            : '-translate-x-1 scale-95 opacity-0'
        }`}
      >
        {content}
      </div>
    </div>
  );

  return createPortal(tooltip, document.body);
}
