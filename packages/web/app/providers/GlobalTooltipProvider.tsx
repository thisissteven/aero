import { ReactNode } from 'react';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { create } from 'zustand';

import { useWindowSize } from '@/app/hooks/useWindowSize';

interface TooltipPosition {
  top: number;
  left: number;
}

interface TooltipState {
  isOpen: boolean;
  isVisible: boolean;
  content: ReactNode | null;
  position: TooltipPosition | null;
  triggerRect: DOMRect | null;
  offset: number;
  isInteractive: boolean;
  isHovered: boolean;
  hideTimeoutId: NodeJS.Timeout | null;
  showTooltip: (props: {
    content: ReactNode;
    rect: DOMRect;
    isInteractive?: boolean;
    offset?: number;
  }) => void;
  hideTooltip: () => void;
  setHovered: (hovered: boolean) => void;
  cancelHide: () => void;
}

const EXIT_DELAY_MS = 200;

export const useTooltipStore = create<TooltipState>((set, get) => ({
  isOpen: false,
  isVisible: false,
  content: null,
  position: null,
  triggerRect: null,
  offset: 16,
  isInteractive: false,
  isHovered: false,
  hideTimeoutId: null,

  showTooltip: ({ content, rect, isInteractive = false, offset = 16 }) => {
    const { hideTimeoutId } = get();

    if (hideTimeoutId) {
      clearTimeout(hideTimeoutId);
    }

    set({
      isOpen: true,
      isVisible: true,
      content,
      triggerRect: rect,
      offset,
      isInteractive,
      position: {
        top: rect.top + rect.height / 2,
        left: rect.right + offset,
      },
      hideTimeoutId: null,
    });
  },

  hideTooltip: () => {
    const { hideTimeoutId, isHovered } = get();

    if (hideTimeoutId) {
      clearTimeout(hideTimeoutId);
    }

    if (isHovered) {
      return;
    }

    const timeout = setTimeout(() => {
      const { isHovered: currentlyHovered } = get();

      if (currentlyHovered) {
        return;
      }

      set({ isOpen: false });

      setTimeout(() => {
        set({
          isVisible: false,
          content: null,
          position: null,
          triggerRect: null,
          offset: 16,
          isInteractive: false,
        });
      }, 150);
    }, EXIT_DELAY_MS);

    set({ hideTimeoutId: timeout });
  },

  setHovered: (hovered) => {
    const { hideTimeoutId } = get();

    set({ isHovered: hovered });

    if (hovered && hideTimeoutId) {
      clearTimeout(hideTimeoutId);
      set({ hideTimeoutId: null });
    } else if (!hovered) {
      get().hideTooltip();
    }
  },

  cancelHide: () => {
    const { hideTimeoutId } = get();

    if (hideTimeoutId) {
      clearTimeout(hideTimeoutId);
      set({ hideTimeoutId: null });
    }
  },
}));

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
      className={`fixed z-40 ${
        isInteractive ? 'pointer-events-auto' : 'pointer-events-none'
      } ${
        wasOpen && isOpen ? 'transition-[top,left] duration-150 ease-out' : ''
      }`}
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
