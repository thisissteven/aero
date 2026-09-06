import { type ReactNode, useLayoutEffect, useRef, useState } from 'react';

interface FlexibleSpacerProps {
  children: ReactNode;
  /** Pass the message count, last item ID, or stream length to shrink the height as content grows */
  streamSignal?: number | string;
}

export function FlexibleSpacer({
  children,
  streamSignal,
}: FlexibleSpacerProps) {
  const contentRef = useRef<HTMLDivElement>(null);
  const [reservedHeight, setReservedHeight] = useState<number>(0);
  const lastMeasuredHeight = useRef<number>(0);

  // Measure content height continuously when visible
  useLayoutEffect(() => {
    if (!contentRef.current) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const height =
          entry.borderBoxSize?.[0]?.blockSize ?? entry.contentRect.height;
        if (height > 0) {
          lastMeasuredHeight.current = height;
          setReservedHeight(height);
        }
      }
    });

    observer.observe(contentRef.current);
    return () => observer.disconnect();
  }, []);

  // When new messages stream in or signal changes, decay the reserved height toward 0
  useLayoutEffect(() => {
    if (reservedHeight > 0) {
      setReservedHeight((prev) => Math.max(0, prev - 40)); // Smooth step reduction per chunk
    }
  }, [streamSignal]);

  return (
    <div
      style={{
        minHeight: `${reservedHeight}px`,
        transition: 'min-height 300px cubic-bezier(0.4, 0, 0.2, 1)',
      }}
      className='-mt-5 w-full'
    >
      <div ref={contentRef}>{children}</div>
    </div>
  );
}
