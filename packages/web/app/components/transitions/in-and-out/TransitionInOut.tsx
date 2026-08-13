import React, { ReactNode } from 'react';

import styles from './TransitionInOut.module.css';

interface TransitionInOutProps {
  first: ReactNode;
  second: ReactNode;
  current: 'first' | 'second';
}

export const TransitionInOut: React.FC<TransitionInOutProps> = ({
  first,
  second,
  current,
}) => {
  const isSecond = current === 'second';

  return (
    <div className={styles.container}>
      <div
        className={`${styles.page} ${isSecond ? styles.fadeOut : styles.fadeIn}`}
      >
        {first}
      </div>

      <div
        className={`${styles.page} ${isSecond ? styles.fadeIn : styles.fadeOut}`}
      >
        {second}
      </div>
    </div>
  );
};
