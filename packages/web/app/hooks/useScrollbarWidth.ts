import { useLayoutEffect, useState } from 'react';

export function useScrollbarWidth(ref: React.RefObject<HTMLElement | null>) {
  const [width, setWidth] = useState(0);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;

    const update = () => {
      // offsetWidth (includes scrollbar) - clientWidth (excludes scrollbar)
      const scrollbarWidth = el.offsetWidth - el.clientWidth;
      setWidth(scrollbarWidth);
    };

    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref]);

  return width;
}
