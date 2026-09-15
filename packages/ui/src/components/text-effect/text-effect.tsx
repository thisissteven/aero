'use client';

import { cn } from '@heroui/react';
import React, { useMemo } from 'react';

export type TextEffectProps = {
  children: string;
  as?: keyof React.JSX.IntrinsicElements;
  className?: string;
  duration?: number; // ms, fade duration per character
  stagger?: number; // ms, delay added per character index
  delay?: number; // ms, delay before the first character
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
        .text-effect__char {
          display: inline-block;
          white-space: pre;
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
          <span
            key={index}
            className='text-effect__char'
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
        ))}
      </Tag>
    </>
  );
}
