import { useEffect } from 'react';

interface UseKeyPressOptions {
  /** Prevent firing when user is typing in input/textarea/contentEditable */
  ignoreInputs?: boolean;
  /** Require or disallow modifier keys */
  modifiers?: {
    ctrl?: boolean;
    meta?: boolean;
    alt?: boolean;
    shift?: boolean;
  };
}

export function useKeyPress(
  targetKey: string,
  handler: (event: KeyboardEvent) => void,
  options: UseKeyPressOptions = {},
) {
  const { ignoreInputs = true, modifiers } = options;

  useEffect(() => {
    const listener = (event: KeyboardEvent) => {
      // 1. Check if key matches (case-insensitive)
      if (event.key.toLowerCase() !== targetKey.toLowerCase()) {
        return;
      }

      // 2. Ignore keypresses if typing inside an input/textarea element
      if (ignoreInputs) {
        const target = event.target as HTMLElement | null;
        if (
          target &&
          (target.tagName === 'INPUT' ||
            target.tagName === 'TEXTAREA' ||
            target.isContentEditable)
        ) {
          return;
        }
      }

      // 3. Optional modifier key validation (e.g. require !meta, !ctrl)
      if (modifiers) {
        if (modifiers.ctrl !== undefined && event.ctrlKey !== modifiers.ctrl)
          return;
        if (modifiers.meta !== undefined && event.metaKey !== modifiers.meta)
          return;
        if (modifiers.alt !== undefined && event.altKey !== modifiers.alt)
          return;
        if (modifiers.shift !== undefined && event.shiftKey !== modifiers.shift)
          return;
      }

      handler(event);
    };

    window.addEventListener('keydown', listener);

    return () => {
      window.removeEventListener('keydown', listener);
    };
  }, [targetKey, handler, ignoreInputs, modifiers]);
}
