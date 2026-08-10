import { useRef } from 'react';

import { useEventListener } from './useEventListener';

type EventType = 'pointerup' | 'mouseup' | 'touchend' | 'click';

export function useOnClickOutside<T extends HTMLElement = HTMLElement>(
  ref: React.RefObject<T | null> | Array<React.RefObject<T | null>>,
  handler: (event: MouseEvent | TouchEvent | PointerEvent) => void,
  eventType: EventType = 'pointerup',
  eventListenerOptions: AddEventListenerOptions = { capture: true },
): void {
  // Store the initial target when the user presses down
  const initialTargetRef = useRef<Node | null>(null);

  // 1. Capture target on press start
  useEventListener(
    'pointerdown',
    (event) => {
      initialTargetRef.current = event.target as Node;
    },
    undefined,
    eventListenerOptions,
  );

  // 2. Evaluate outside click on release (pointerup / mouseup / touchend)
  useEventListener(
    eventType,
    (event) => {
      const releaseTarget = event.target as Node | null;
      const initialTarget = initialTargetRef.current;

      const refs = Array.isArray(ref) ? ref : [ref];

      // Helper function to check if a node is outside all refs
      const isNodeOutside = (node: Node | null) => {
        if (!node) return true;
        // If node was unmounted during click (e.g. sidebar re-rendered), treat as outside
        if (!node.isConnected) return true;

        return refs
          .filter((r): r is React.RefObject<T> => Boolean(r.current))
          .every((r) => r.current && !r.current.contains(node));
      };

      // Both initial press AND release targets must be outside
      const initialIsOutside = isNodeOutside(initialTarget);
      const releaseIsOutside = isNodeOutside(releaseTarget);

      if (initialIsOutside && releaseIsOutside) {
        handler(event as MouseEvent | TouchEvent | PointerEvent);
      }

      // Reset target for next interaction
      initialTargetRef.current = null;
    },
    undefined,
    eventListenerOptions,
  );
}
