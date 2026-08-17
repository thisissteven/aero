import { useEffect } from 'react';

const IS_MAC =
  typeof window !== 'undefined' &&
  /Mac|iPod|iPhone|iPad/.test(navigator.platform || navigator.userAgent);

interface UseKeyPressOptions {
  ignoreInputs?: boolean;
  preventDefault?: boolean;
  stopPropagation?: boolean;
  modifiers?: {
    /** Primary command modifier: `metaKey` on Mac, `ctrlKey` on Windows/Linux */
    mod?: boolean;
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
  const {
    ignoreInputs = true,
    preventDefault = true,
    stopPropagation = true,
    modifiers = {},
  } = options;

  useEffect(() => {
    const listener = (event: KeyboardEvent) => {
      // 1. Check target key
      if (event.key.toLowerCase() !== targetKey.toLowerCase()) {
        return;
      }

      // 2. Ignore inputs if user is typing
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

      // 3. Modifier validation
      const { mod, ctrl, meta, alt, shift } = modifiers;

      // Handle 'mod' (Cmd on Mac, Ctrl on Windows)
      if (mod !== undefined) {
        const isModPressed = IS_MAC ? event.metaKey : event.ctrlKey;
        if (isModPressed !== mod) return;
      }

      // Handle individual modifiers if specified
      if (ctrl !== undefined && event.ctrlKey !== ctrl) return;
      if (meta !== undefined && event.metaKey !== meta) return;
      if (alt !== undefined && event.altKey !== alt) return;
      if (shift !== undefined && event.shiftKey !== shift) return;

      // 4. Prevent default & stop propagation
      if (preventDefault) event.preventDefault();
      if (stopPropagation) event.stopPropagation();

      handler(event);
    };

    window.addEventListener('keydown', listener);
    return () => window.removeEventListener('keydown', listener);
  }, [
    targetKey,
    handler,
    ignoreInputs,
    preventDefault,
    stopPropagation,
    modifiers,
  ]);
}
