import { ReactNode } from 'react';
import { create } from 'zustand';

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
