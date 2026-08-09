import { useCallback, useEffect, useRef, useState } from 'react';

interface UseCopyToClipboardOptions {
  /** Reset delay back to `false` in ms. Defaults to 2000ms. */
  duration?: number;
  /** Optional DOM element ref to apply text-swap exit/enter animation classes. */
  animatedRef?: React.RefObject<HTMLElement | null>;
  /** Animation transition time in ms. Defaults to 150ms. */
  animationDuration?: number;
}

export function useCopyToClipboard(options: UseCopyToClipboardOptions = {}) {
  const { duration = 2000, animatedRef, animationDuration = 150 } = options;

  const [copied, setCopied] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    },
    [],
  );

  const swapTextWithAnimation = useCallback(
    (next: boolean) => {
      const el = animatedRef?.current;

      if (!el) {
        setCopied(next);
        return;
      }

      el.classList.add('is-exit');

      window.setTimeout(() => {
        setCopied(next);

        el.classList.remove('is-exit');
        el.classList.add('is-enter-start');

        // Force browser repaint to register the start state
        void el.offsetWidth;

        el.classList.remove('is-enter-start');
      }, animationDuration);
    },
    [animatedRef, animationDuration],
  );

  const copy = useCallback(
    async (text: string) => {
      try {
        await navigator.clipboard.writeText(text);

        if (timeoutRef.current) return;

        if (animatedRef) {
          swapTextWithAnimation(true);
        } else {
          setCopied(true);
        }

        timeoutRef.current = setTimeout(() => {
          if (animatedRef) {
            swapTextWithAnimation(false);
          } else {
            setCopied(false);
          }
          timeoutRef.current = null;
        }, duration);
      } catch {
        alert('Clipboard not supported');
      }
    },
    [duration, animatedRef, swapTextWithAnimation],
  );

  return { copied, copy };
}
