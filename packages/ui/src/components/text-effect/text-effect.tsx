'use client';

import { cn } from '@heroui/react';
import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

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
  as: TagProp = 'p',
  className,
  duration = 300,
  stagger = 15,
  delay = 0,
  style,
  onAnimationComplete,
}: TextEffectProps) {
  const Tag = TagProp as React.ElementType;
  const tagRef = useRef<HTMLElement>(null);
  const measurerRef = useRef<HTMLSpanElement>(null);
  const [visibleCount, setVisibleCount] = useState<number>(Infinity);

  const allChars = useMemo(
    () => Array.from(children.replace(/\s+/g, ' ')),
    [children],
  );

  const measure = useCallback(() => {
    const container = tagRef.current;
    const measurer = measurerRef.current;
    if (!container || !measurer) return;

    const cStyle = getComputedStyle(container);
    const cRect = container.getBoundingClientRect();
    const padL = parseFloat(cStyle.paddingLeft) || 0;
    const padR = parseFloat(cStyle.paddingRight) || 0;
    const availableWidth = cRect.width - padL - padR;

    const mStyle = getComputedStyle(measurer);
    const mRect = measurer.getBoundingClientRect();
    const mPadL = parseFloat(mStyle.paddingLeft) || 0;
    const contentLeft = mRect.left + mPadL;

    // Measure the ellipsis width in the same font.
    const probe = document.createElement('span');
    probe.textContent = '…';
    probe.style.cssText = `
      position: absolute;
      visibility: hidden;
      white-space: pre;
      font-family: ${mStyle.fontFamily};
      font-size: ${mStyle.fontSize};
      font-weight: ${mStyle.fontWeight};
      font-style: ${mStyle.fontStyle};
      letter-spacing: ${mStyle.letterSpacing};
      word-spacing: ${mStyle.wordSpacing};
    `;
    document.body.appendChild(probe);
    const ellipsisW = probe.getBoundingClientRect().width;
    document.body.removeChild(probe);

    const charEls =
      measurer.querySelectorAll<HTMLElement>('.text-effect__char');
    if (!charEls.length) {
      setVisibleCount(Infinity);
      return;
    }

    // Step 1: does everything fit at all?
    let lastFits = -1;
    for (let i = 0; i < charEls.length; i++) {
      const r = charEls[i].getBoundingClientRect();
      const right = r.right - contentLeft;
      if (right <= availableWidth + 0.5) lastFits = i;
      else break;
    }
    if (lastFits >= charEls.length - 1) {
      setVisibleCount(Infinity);
      return;
    }

    // Step 2: back off so the ellipsis also fits.
    const budget = availableWidth - ellipsisW;
    let lastIdx = -1;
    for (let i = 0; i <= lastFits; i++) {
      const r = charEls[i].getBoundingClientRect();
      const right = r.right - contentLeft;
      if (right <= budget + 0.5) lastIdx = i;
      else break;
    }

    setVisibleCount(Math.max(0, lastIdx + 1));
  }, []);

  useLayoutEffect(() => {
    measure();
  }, [measure, children]);

  useLayoutEffect(() => {
    const el = tagRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => measure());
    ro.observe(el);
    return () => ro.disconnect();
  }, [measure]);

  useEffect(() => {
    if (typeof document === 'undefined' || !document.fonts) return;
    let cancelled = false;
    document.fonts.ready.then(() => {
      if (!cancelled) measure();
    });
    return () => {
      cancelled = true;
    };
  }, [measure]);

  const isTruncated = visibleCount < allChars.length;
  const renderedChars = isTruncated
    ? [...allChars.slice(0, visibleCount), '…']
    : allChars;

  return (
    <>
      <style>{`
        /*
         * Measurer: absolutely positioned so it spans the same content box
         * as the container, inherits the same className (font, padding,
         * nowrap), but is forced unclipped so every character keeps its
         * true layout position — even the ones that would be hidden by
         * the container's own text-overflow.
         */
        .text-effect__measurer {
          position: absolute !important;
          top: 0 !important;
          left: 0 !important;
          right: 0 !important;
          padding: inherit !important;
          border: 0 !important;
          margin: 0 !important;
          box-sizing: inherit !important;

          visibility: hidden !important;
          pointer-events: none !important;
          z-index: -1 !important;

          overflow: visible !important;
          text-overflow: clip !important;
          max-height: none !important;
          height: auto !important;
        }

        .text-effect__char {
          display: inline-block;
          white-space: pre;
        }
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

      <Tag
        ref={tagRef as React.Ref<HTMLElement>}
        className={cn('text-effect relative', className)}
        style={style}
      >
        {/*
         * Hidden measurer — renders the FULL text so we can read the
         * natural position of every character, even past the container's
         * clip edge.
         */}
        <span
          ref={measurerRef}
          aria-hidden
          className={cn('text-effect__measurer', className)}
        >
          {allChars.map((char, i) => (
            <span key={i} className='text-effect__char'>
              <span
                className='text-effect__char-inner'
                style={{ opacity: 1, transform: 'none', animation: 'none' }}
              >
                {char}
              </span>
            </span>
          ))}
        </span>

        {/* Visible, animated, JS-truncated content. */}
        {renderedChars.map((char, index) => (
          <span key={index} className='text-effect__char'>
            <span
              className='text-effect__char-inner'
              style={{
                animationDuration: `${duration}ms`,
                animationDelay: `${delay + index * stagger}ms`,
              }}
              onAnimationEnd={
                index === renderedChars.length - 1
                  ? onAnimationComplete
                  : undefined
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
