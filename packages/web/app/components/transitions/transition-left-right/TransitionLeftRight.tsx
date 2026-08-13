import React, { ReactNode, useEffect, useRef, useState } from 'react';

import styles from './TransitionLeftRight.module.css';

interface TransitionLeftRightProps {
  left: ReactNode;
  right: ReactNode;
  current: 'left' | 'right';
}

export const TransitionLeftRight: React.FC<TransitionLeftRightProps> = ({
  left,
  right,
  current,
}) => {
  const isRight = current === 'right';
  const [height, setHeight] = useState<number | undefined>(undefined);

  const leftRef = useRef<HTMLDivElement>(null);
  const rightRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const activeEl = isRight ? rightRef.current : leftRef.current;
    if (!activeEl) return;

    const updateHeight = () => {
      setHeight(activeEl.offsetHeight);
    };

    updateHeight();

    // Dynamically adjust height if inner content changes size
    const observer = new ResizeObserver(updateHeight);
    observer.observe(activeEl);

    return () => observer.disconnect();
  }, [isRight]);

  return (
    <div
      className={styles.container}
      style={{ height: height ? `${height}px` : 'auto' }}
    >
      <div
        ref={leftRef}
        className={`${styles.leftPage} ${isRight ? styles.slideLeft : ''}`}
      >
        {left}
      </div>

      <div
        ref={rightRef}
        className={`${styles.rightPage} ${isRight ? styles.slideIn : ''}`}
      >
        {right}
      </div>
    </div>
  );
};
