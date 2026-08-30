import { useCallback, useEffect, useRef, useState } from 'react';

export function useSessionTitleMarquee() {
  const labelRef = useRef<HTMLSpanElement>(null);
  const animationRef = useRef<number | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [isOverflowing, setIsOverflowing] = useState(false);

  const getTextElement = () =>
    labelRef.current?.querySelector<HTMLElement>('.sidebar__menu-label-text');

  const reset = useCallback(() => {
    if (animationRef.current !== null) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }

    if (timeoutRef.current !== null) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    const label = labelRef.current;
    const text = getTextElement();

    if (!label || !text) return;

    text.style.transform = 'translateX(0)';
  }, []);

  const handleMouseEnter = useCallback(() => {
    const label = labelRef.current;
    const text = getTextElement();

    if (!label || !text) return;

    reset();

    // Make the text span its natural width so scrollWidth
    // represents the actual text width.
    text.style.width = 'max-content';
    text.style.maxWidth = 'none';
    text.style.flex = 'none';
    text.style.overflow = 'visible';

    const distance = text.scrollWidth - label.clientWidth;

    if (distance <= 0) {
      setIsOverflowing(false);
      return;
    }

    setIsOverflowing(true);

    // Small delay before moving.
    timeoutRef.current = setTimeout(() => {
      const duration = Math.max(1200, distance * 18);
      const start = performance.now();

      const animateForward = (time: number) => {
        const progress = Math.min((time - start) / duration, 1);

        // ease in/out
        const eased =
          progress < 0.5
            ? 2 * progress * progress
            : 1 - Math.pow(-2 * progress + 2, 2) / 2;

        text.style.transform = `translateX(-${distance * eased}px)`;

        if (progress < 1) {
          animationRef.current = requestAnimationFrame(animateForward);
          return;
        }

        // Pause at the end.
        timeoutRef.current = setTimeout(() => {
          const returnStart = performance.now();

          const animateBackward = (time: number) => {
            const progress = Math.min((time - returnStart) / duration, 1);

            const eased =
              progress < 0.5
                ? 2 * progress * progress
                : 1 - Math.pow(-2 * progress + 2, 2) / 2;

            text.style.transform = `translateX(-${distance * (1 - eased)}px)`;

            if (progress < 1) {
              animationRef.current = requestAnimationFrame(animateBackward);
            }
          };

          animationRef.current = requestAnimationFrame(animateBackward);
        }, 700);
      };

      animationRef.current = requestAnimationFrame(animateForward);
    }, 350);
  }, [reset]);

  const handleMouseLeave = useCallback(() => {
    reset();
    setIsOverflowing(false);
  }, [reset]);

  useEffect(() => {
    return reset;
  }, [reset]);

  return {
    labelRef,
    isOverflowing,
    handleMouseEnter,
    handleMouseLeave,
  };
}
