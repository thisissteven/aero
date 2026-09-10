import { ReactNode } from 'react';
import { useEffect, useRef, useState } from 'react';
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

const EXIT_DELAY_MS = 200; // Time window allowed for mouse to bridge across gap

export const useTooltipStore = create<TooltipState>((set, get) => ({
  isOpen: false,
  isVisible: false,
  content: null,
  position: null,
  isInteractive: false,
  isHovered: false,
  hideTimeoutId: null,

  showTooltip: ({ content, rect, isInteractive = false, offset = 16 }) => {
    const { hideTimeoutId } = get();
    if (hideTimeoutId) clearTimeout(hideTimeoutId);

    set({
      isOpen: true,
      isVisible: true,
      content,
      isInteractive,
      position: {
        top: rect.top + rect.height / 2, // Centered vertically
        left: rect.right + offset, // Offset to right
      },
      hideTimeoutId: null,
    });
  },

  hideTooltip: () => {
    const { hideTimeoutId, isHovered } = get();
    if (hideTimeoutId) clearTimeout(hideTimeoutId);

    // If cursor moved into interactive tooltip, don't trigger hide
    if (isHovered) return;

    const timeout = setTimeout(() => {
      const { isHovered: currentlyHovered } = get();
      if (currentlyHovered) return;

      set({ isOpen: false });

      // Match exit fade-out duration before unmounting
      setTimeout(() => {
        set({
          isVisible: false,
          content: null,
          position: null,
          isInteractive: false,
        });
      }, 150);
    }, EXIT_DELAY_MS);

    set({ hideTimeoutId: timeout });
  },

  setHovered: (hovered: boolean) => {
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
    position,
    isInteractive,
    setHovered,
    cancelHide,
  } = useTooltipStore();

  const tooltipRef = useRef<HTMLDivElement>(null);
  const [adjustedPos, setAdjustedPos] = useState<{
    top: number;
    left: number;
  } | null>(null);
  const [wasOpen, setWasOpen] = useState(false);

  // 1. Manage state transition flags without resetting adjustedPos mid-animation
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => setWasOpen(true), 50);
      return () => clearTimeout(timer);
    } else {
      setWasOpen(false);
      // DO NOT setAdjustedPos(null) here! Let it freeze at its last position during exit.
    }
  }, [isOpen]);

  // 2. Clear adjustedPos ONLY when the tooltip completely closes and becomes invisible
  useEffect(() => {
    if (!isVisible) {
      setAdjustedPos(null);
    }
  }, [isVisible]);

  // 3. Compute position adjustments
  useEffect(() => {
    if (!position || !tooltipRef.current) return;

    const el = tooltipRef.current;
    const tooltipRect = el.getBoundingClientRect();
    const padding = 12;

    let top = position.top - tooltipRect.height / 2;
    let left = position.left;

    // Top boundary constraint
    if (top < padding) {
      top = padding;
    }
    // Bottom boundary constraint
    else if (top + tooltipRect.height > window.innerHeight - padding) {
      top = window.innerHeight - padding - tooltipRect.height;
    }

    // Right boundary constraint -> flip to left
    if (left + tooltipRect.width > window.innerWidth - padding) {
      const originalTargetLeft = position.left - 12;
      left = originalTargetLeft - tooltipRect.width - 12;
    }

    setAdjustedPos({ top, left });
  }, [position, content]);

  const isMobile = useWindowSize((size) => size.width < 768);

  if (!isVisible || !position || !content || isMobile) return null;

  return (
    <div
      ref={tooltipRef}
      onMouseEnter={() => {
        cancelHide();
        if (isInteractive) setHovered(true);
      }}
      onMouseLeave={() => {
        if (isInteractive) setHovered(false);
      }}
      className={`fixed ${
        isInteractive ? 'pointer-events-auto' : 'pointer-events-none'
      } ${
        /* Position transition only runs between open items */
        wasOpen && isOpen
          ? 'transition-[top,left] duration-150 ease-out'
          : 'transtion-[left]'
      }`}
      style={{
        top: `${adjustedPos?.top ?? position.top}px`,
        left: `${adjustedPos?.left ?? position.left}px`,
        visibility: adjustedPos ? 'visible' : 'hidden',
      }}
    >
      <div
        className={`transition-all duration-150 ease-out ${
          isOpen
            ? 'translate-x-0 scale-100 opacity-100'
            : '-translate-x-1 scale-95 opacity-0'
        }`}
      >
        {content}
      </div>
    </div>
  );
}
