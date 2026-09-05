import { useCallback, useRef } from 'react';

import { useKeyPress } from './useKeyPress';

interface UseDoubleKeyPressOptions {
  /** Max time between presses (ms) to count as a "double" press */
  threshold?: number;
  ignoreInputs?: boolean;
  preventDefault?: boolean;
  stopPropagation?: boolean;
}

export function useDoubleKeyPress(
  targetKey: string,
  handler: (event: KeyboardEvent) => void,
  options: UseDoubleKeyPressOptions = {},
) {
  const { threshold = 400, ...restOptions } = options;
  const lastPressRef = useRef<number>(0);

  const onKeyPress = useCallback(
    (event: KeyboardEvent) => {
      const now = Date.now();
      const elapsed = now - lastPressRef.current;

      if (elapsed > 0 && elapsed <= threshold) {
        lastPressRef.current = 0; // reset so a 3rd press doesn't chain-fire
        handler(event);
      } else {
        lastPressRef.current = now;
      }
    },
    [handler, threshold],
  );

  useKeyPress(targetKey, onKeyPress, restOptions);
}
