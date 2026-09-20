'use client';

import { cn } from '@heroui/react';
import React, { useMemo } from 'react';

export type TextEffectProps = {
  children: string;
  as?: keyof React.JSX.IntrinsicElements;
  className?: string;
  duration?: number;
  stagger?: number;
  delay?: number;
  style?: React.CSSProperties;
  onAnimationComplete?: () => void;
};

export function TextEffect({
  children,
  as: Tag = 'p',
  className,
  duration = 300,
  stagger = 15,
  delay = 0,
  style,
  onAnimationComplete,
}: TextEffectProps) {
  const chars = useMemo(() => Array.from(children), [children]);

  return (
    <>
      <style>{`
        /* Outer span: only for layout, never animated */
        .text-effect__char {
          display: inline-block;
          white-space: pre;
        }
        /* Inner span: the actual animation */
        .text-effect__char-inner {
          display: inline-block;
          opacity: 0;
          transform: translateY(4px);
          animation-name: text-effect-fade-in;
          animation-timing-function: cubic-bezier(0.16, 1, 0.3, 1);
          animation-fill-mode: forwards;
        }
        @keyframes text-effect-fade-in {
          from { opacity: 0; transform: translateY(4px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
      <Tag className={cn('text-effect', className)} style={style}>
        {chars.map((char, index) => (
          <span key={index} className='text-effect__char'>
            <span
              className='text-effect__char-inner'
              style={{
                animationDuration: `${duration}ms`,
                animationDelay: `${delay + index * stagger}ms`,
              }}
              onAnimationEnd={
                index === chars.length - 1 ? onAnimationComplete : undefined
              }
            >
              {char}
            </span>
          </span>
        ))}
      </Tag>
    </>
  );
}
