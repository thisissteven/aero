import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';

import { ModelItem } from '@/app/lib/model';

const PANEL_WIDTH = 256;
const PANEL_GAP = 8;
const ESTIMATED_PANEL_HEIGHT = 200;

export interface UseModelInfoPanelResult {
  activeModel: ModelItem | null;
  hoverTop: number;
  infoSide: 'left' | 'right';
  /** Attach to the positioning-reference container (the row that wraps the list + panel). */
  panelRef: React.RefObject<HTMLDivElement | null>;
  activateModel: (model: ModelItem, element: HTMLElement) => void;
  /** Call in an effect whenever the visible result set changes, to drop a now-hidden active model. */
  clearIfStale: (isStillVisible: (modelId: string) => boolean) => void;
}

/**
 * Tracks the currently hovered/focused model and where its details panel
 * should render using rAF-throttled position updates for 60fps scrolling/hovering.
 */
export function useModelInfoPanel(): UseModelInfoPanelResult {
  const [activeModel, setActiveModel] = useState<ModelItem | null>(null);
  const [hoverTop, setHoverTop] = useState(0);
  const [infoSide, setInfoSide] = useState<'left' | 'right'>('left');

  const activeItemRef = useRef<HTMLElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);

  // Animation frame reference to throttle updates per frame
  const rafIdRef = useRef<number | null>(null);

  const cancelPendingUpdate = useCallback(() => {
    if (rafIdRef.current !== null) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }
  }, []);

  const positionFor = useCallback((element: HTMLElement) => {
    const parent = panelRef.current;
    if (!parent || !element.isConnected) return null;

    const itemRect = element.getBoundingClientRect();
    const parentRect = parent.getBoundingClientRect();

    if (itemRect.width === 0 && itemRect.height === 0) return null;

    // Hide panel if item scrolls out of parent viewport
    const isOutOfBounds =
      itemRect.bottom < parentRect.top || itemRect.top > parentRect.bottom;
    if (isOutOfBounds) return null;

    const spaceLeft = parentRect.left;
    const rawTop = itemRect.top + itemRect.height / 2 - parentRect.top;

    // Clamp inside parent height boundaries
    const minTop = ESTIMATED_PANEL_HEIGHT / 2;
    const maxTop = Math.max(
      minTop,
      parentRect.height - ESTIMATED_PANEL_HEIGHT / 2,
    );
    const clampedTop = Math.min(Math.max(rawTop, minTop), maxTop);

    return {
      side: (spaceLeft >= PANEL_WIDTH + PANEL_GAP ? 'left' : 'right') as
        'left' | 'right',
      top: clampedTop,
    };
  }, []);

  const performUpdate = useCallback(
    (model: ModelItem | null, element: HTMLElement | null) => {
      if (!element || !model) {
        activeItemRef.current = null;
        setActiveModel(null);
        return;
      }

      const position = positionFor(element);
      if (!position) {
        activeItemRef.current = null;
        setActiveModel(null);
        return;
      }

      activeItemRef.current = element;
      // Synchronize text + position in a single state batch
      setActiveModel(model);
      setInfoSide(position.side);
      setHoverTop(position.top);
    },
    [positionFor],
  );

  const activateModel = useCallback(
    (model: ModelItem, element: HTMLElement) => {
      cancelPendingUpdate();

      // Schedule both content and position update on the next frame paint
      rafIdRef.current = requestAnimationFrame(() => {
        rafIdRef.current = null;
        performUpdate(model, element);
      });
    },
    [cancelPendingUpdate, performUpdate],
  );

  const updateActiveItemPosition = useCallback(() => {
    cancelPendingUpdate();

    rafIdRef.current = requestAnimationFrame(() => {
      rafIdRef.current = null;
      if (!activeItemRef.current || !activeModel) return;
      performUpdate(activeModel, activeItemRef.current);
    });
  }, [activeModel, cancelPendingUpdate, performUpdate]);

  useLayoutEffect(() => {
    if (activeModel && activeItemRef.current) {
      updateActiveItemPosition();
    }
  }, [activeModel, updateActiveItemPosition]);

  useEffect(() => {
    if (!activeModel) return;

    const handleLayoutShift = () => updateActiveItemPosition();

    window.addEventListener('resize', handleLayoutShift, { passive: true });
    window.addEventListener('scroll', handleLayoutShift, {
      capture: true,
      passive: true,
    });

    return () => {
      cancelPendingUpdate();
      window.removeEventListener('resize', handleLayoutShift);
      window.removeEventListener('scroll', handleLayoutShift, {
        capture: true,
      });
    };
  }, [activeModel, cancelPendingUpdate, updateActiveItemPosition]);

  const clearIfStale = useCallback(
    (isStillVisible: (modelId: string) => boolean) => {
      if (activeModel && !isStillVisible(activeModel.id)) {
        cancelPendingUpdate();
        setActiveModel(null);
        activeItemRef.current = null;
      }
    },
    [activeModel, cancelPendingUpdate],
  );

  return {
    activeModel,
    hoverTop,
    infoSide,
    panelRef,
    activateModel,
    clearIfStale,
  };
}
