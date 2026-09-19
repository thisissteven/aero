'use client';

import { cn } from '@aero/ui';
import type {
  ComponentPropsWithRef,
  NamedExoticComponent,
  ReactElement,
} from 'react';
import {
  memo,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { Components } from 'react-markdown';
import { defaultComponents } from '@/app/components/markdown/default-components';
import { MarkdownFileContext } from '@/app/components/markdown/markdown-file-context';
import { MemoizedBlock } from '@/app/components/markdown/memoized-block';

const SETTLE_FADE_MS = 320;
const SETTLE_HOLD_MS = SETTLE_FADE_MS + 500;
const STAGGER_MS = 40;
const MAX_STAGGER_INDEX = 4;

const settleWindows = new Map<string, number>();

/**
 * Markdown instances whose stream-in fade has already played in this session.
 *
 * virtua (esp. on Firefox) unmounts and remounts rows aggressively during
 * scroll. Component state and refs are destroyed on unmount, so a per-instance
 * `useState`/`useRef` gate re-arms on every remount, leaving the row stuck at
 * `opacity: 0` for its whole lifetime. Tracking "already revealed" at module
 * scope survives remounts, so the fade plays exactly once per markdown id.
 */
const revealedMarkdown = new Set<string>();

export type StreamRevealPreset =
  | 'claude'
  | 'chatgpt'
  | 'fast'
  | 'instant'
  | 'off';

interface PresetConfig {
  tickMs: number;
  baseStep: number;
  mediumBacklog: number;
  mediumStep: number;
  largeBacklog: number;
  largeStep: number;
  /**
   * Fraction of the above-medium backlog consumed per tick as catch-up.
   * Higher = the reveal aggressively closes the gap when the upstream stream
   * is producing characters faster than the base step schedule can display.
   */
  catchUpRate: number;
  tokenCount: number;
  fadeMs: number;
  liftPx: number;
  fromOpacity: number;
}

const PRESETS: Record<Exclude<StreamRevealPreset, 'off'>, PresetConfig> = {
  claude: {
    tickMs: 55,
    baseStep: 1,
    mediumBacklog: 80,
    mediumStep: 2,
    largeBacklog: 240,
    largeStep: 4,
    catchUpRate: 0.1,
    tokenCount: 4,
    fadeMs: 220,
    liftPx: 1,
    fromOpacity: 0.4,
  },
  chatgpt: {
    tickMs: 40,
    baseStep: 2,
    mediumBacklog: 50,
    mediumStep: 4,
    largeBacklog: 200,
    largeStep: 8,
    catchUpRate: 0.15,
    tokenCount: 6,
    fadeMs: 180,
    liftPx: 2,
    fromOpacity: 0.35,
  },
  fast: {
    tickMs: 15,
    baseStep: 2,
    mediumBacklog: 120,
    mediumStep: 4,
    largeBacklog: 320,
    largeStep: 8,
    catchUpRate: 0.25,
    tokenCount: 6,
    fadeMs: 320,
    liftPx: 1,
    fromOpacity: 0.25,
  },
  instant: {
    tickMs: 16,
    baseStep: 6,
    mediumBacklog: 60,
    mediumStep: 12,
    largeBacklog: 200,
    largeStep: 24,
    catchUpRate: 0.5,
    tokenCount: 3,
    fadeMs: 100,
    liftPx: 0,
    fromOpacity: 0.7,
  },
};

function useSteppedContent(
  content: string,
  isStreaming: boolean,
  preset: PresetConfig | null,
): string {
  const [displayed, setDisplayed] = useState(content);
  const displayedRef = useRef(displayed);
  displayedRef.current = displayed;

  const targetRef = useRef(content);
  targetRef.current = content;

  const presetRef = useRef(preset);
  presetRef.current = preset;

  const rafRef = useRef<number | null>(null);
  const lastTickRef = useRef<number>(0);

  useEffect(() => {
    if (!presetRef.current) {
      if (displayedRef.current !== content) setDisplayed(content);
      return;
    }

    if (!isStreaming) {
      if (displayedRef.current !== content) setDisplayed(content);
      return;
    }

    const step = (now: number) => {
      const cfg = presetRef.current;
      if (!cfg) {
        rafRef.current = null;
        return;
      }

      if (now - lastTickRef.current < cfg.tickMs) {
        rafRef.current = requestAnimationFrame(step);
        return;
      }
      lastTickRef.current = now;

      const target = targetRef.current;
      const current = displayedRef.current;

      if (current === target) {
        rafRef.current = null;
        return;
      }

      if (current.length > target.length || !target.startsWith(current)) {
        setDisplayed(target);
        rafRef.current = null;
        return;
      }

      const backlog = target.length - current.length;
      const baseStep =
        backlog > cfg.largeBacklog
          ? cfg.largeStep
          : backlog > cfg.mediumBacklog
            ? cfg.mediumStep
            : cfg.baseStep;

      // Catch-up term. The per-tier step is a hard cap and cannot keep up
      // when the upstream stream produces more than `largeStep` chars per
      // tick. A term proportional to the excess backlog lets the reveal drain
      // arbitrarily fast streams instead of falling behind forever.
      const catchUp =
        backlog > cfg.mediumBacklog
          ? Math.ceil((backlog - cfg.mediumBacklog) * cfg.catchUpRate)
          : 0;

      const stepSize = Math.max(cfg.baseStep, baseStep + catchUp);

      setDisplayed(target.slice(0, current.length + stepSize));
      rafRef.current = requestAnimationFrame(step);
    };

    if (rafRef.current === null) {
      lastTickRef.current = 0;
      rafRef.current = requestAnimationFrame(step);
    }
  }, [content, isStreaming]);

  useEffect(
    () => () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    },
    [],
  );

  return preset ? displayed : content;
}

function hashString(s: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(36);
}

export interface MarkdownProps
  extends Omit<ComponentPropsWithRef<'div'>, 'children'> {
  children: string;
  components?: Partial<Components>;
  id: string;
  isFile?: (path: string) => boolean;
  onFileClick?: (path: string) => void;
  streaming?: boolean;
  streamRevealPreset?: StreamRevealPreset;
}

function splitIntoBlocks(markdown: string): string[] {
  const lines = markdown.split('\n');
  const blocks: string[] = [];
  let buffer: string[] = [];
  let fenceChar: '`' | '~' | null = null;
  let fenceLen = 0;

  const flush = () => {
    if (buffer.length > 0) {
      blocks.push(buffer.join('\n'));
      buffer = [];
    }
  };

  for (const line of lines) {
    const m = line.match(/^ {0,3}(`{3,}|~{3,})(.*)$/);
    if (m) {
      const char = m[1][0] as '`' | '~';
      const len = m[1].length;
      const info = m[2];
      if (fenceChar === null) {
        fenceChar = char;
        fenceLen = len;
      } else if (char === fenceChar && len >= fenceLen && info.trim() === '') {
        fenceChar = null;
        fenceLen = 0;
      }
    }

    buffer.push(line);

    if (fenceChar === null && line.trim() === '') {
      flush();
    }
  }

  flush();

  return blocks.length > 0 ? blocks : [markdown];
}

export const Markdown: NamedExoticComponent<MarkdownProps> = memo(
  function Markdown({
    children = '',
    className,
    components,
    id,
    isFile,
    onFileClick,
    streaming = false,
    streamRevealPreset = 'chatgpt',
    ...props
  }: MarkdownProps): ReactElement {
    const preset =
      streamRevealPreset === 'off' ? null : PRESETS[streamRevealPreset];

    const bufferedContent = useSteppedContent(children, streaming, preset);

    // -------- Block-level settle fade -----------------------------------
    const [blockSettleFading, setBlockSettleFading] = useState(false);
    const prevStreamingForBlockFadeRef = useRef(streaming);

    useEffect(() => {
      const was = prevStreamingForBlockFadeRef.current;
      prevStreamingForBlockFadeRef.current = streaming;

      if (!preset) return;
      if (!(was === true && streaming === false)) return;

      setBlockSettleFading(true);
      const t = setTimeout(
        () => setBlockSettleFading(false),
        SETTLE_FADE_MS + 50,
      );
      return () => clearTimeout(t);
    }, [streaming, preset]);

    // -------- Settle window ---------------------------------------------
    const [settling, setSettling] = useState<boolean>(() => {
      if (!preset) return false;
      if (streaming) return true;
      return settleWindows.has(id);
    });

    const settleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const prevStreamingRef = useRef<boolean | null>(null);

    useEffect(
      () => () => {
        if (settleTimerRef.current) {
          clearTimeout(settleTimerRef.current);
          settleTimerRef.current = null;
        }
      },
      [],
    );

    useEffect(() => {
      const prevStreaming = prevStreamingRef.current;
      prevStreamingRef.current = streaming;
      const observedTransition = prevStreaming === true && streaming === false;

      if (!preset) {
        if (settleTimerRef.current) {
          clearTimeout(settleTimerRef.current);
          settleTimerRef.current = null;
        }
        settleWindows.delete(id);
        setSettling(false);
        return;
      }

      if (streaming) {
        settleWindows.delete(id);
        setSettling(true);
        if (settleTimerRef.current) {
          clearTimeout(settleTimerRef.current);
          settleTimerRef.current = null;
        }
        return;
      }

      if (!observedTransition && !settleWindows.has(id)) {
        if (settleTimerRef.current) {
          clearTimeout(settleTimerRef.current);
          settleTimerRef.current = null;
        }
        setSettling(false);
        return;
      }

      setSettling(true);

      if (settleTimerRef.current) return;

      const existingStart = settleWindows.get(id);
      const start = existingStart ?? Date.now();
      if (!existingStart) settleWindows.set(id, start);
      const remaining = Math.max(0, SETTLE_HOLD_MS - (Date.now() - start));

      settleTimerRef.current = setTimeout(() => {
        settleTimerRef.current = null;
        settleWindows.delete(id);
        setSettling(false);
      }, remaining);
    }, [streaming, preset, id]);

    // -------- isVisible delay -------------------------------------------
    // Same fix as BaseTool/ReasoningBlock: back the "already revealed" flag
    // with a module-level Set keyed on `id`, so a virtua remount after the
    // fade has already played comes back visible instead of re-arming the
    // 300 ms timer (and getting cancelled before it fires).
    const wasStreamingOnMount = useRef(streaming).current;
    const [isVisible, setIsVisible] = useState(
      () => !wasStreamingOnMount || revealedMarkdown.has(id),
    );

    useEffect(() => {
      if (!wasStreamingOnMount) return;
      if (revealedMarkdown.has(id)) return;

      const timer = setTimeout(() => {
        revealedMarkdown.add(id);
        setIsVisible(true);
      }, 300);

      return () => clearTimeout(timer);
    }, [wasStreamingOnMount, id]);

    // -------- Reveal-mode persistence -----------------------------------
    const [revealModeEverOn, setRevealModeEverOn] = useState<boolean>(
      () => Boolean(preset) && (streaming || settleWindows.has(id)),
    );

    useEffect(() => {
      if (!preset) return;
      if (!revealModeEverOn && (streaming || settling)) {
        setRevealModeEverOn(true);
      }
    }, [streaming, settling, preset, revealModeEverOn]);

    // -------- Derived ---------------------------------------------------
    const renderers = useMemo(
      () => ({ ...defaultComponents, ...components }),
      [components],
    );

    const contextValue = useMemo(
      () => ({ isFile, onFileClick }),
      [isFile, onFileClick],
    );

    const blocks = useMemo(
      () => splitIntoBlocks(bufferedContent),
      [bufferedContent],
    );

    // The stream can end with "\n\n", which produces a trailing empty block.
    // The settle fade should land on the last block that actually carries
    // content, not on an empty wrapper.
    const lastNonEmptyIndex = useMemo(() => {
      for (let i = blocks.length - 1; i >= 0; i--) {
        if (blocks[i].trim() !== '') return i;
      }
      return -1;
    }, [blocks]);

    const contentRef = useRef<HTMLDivElement>(null);
    const measureRef = useRef<HTMLDivElement | null>(null);

    const isPostStreamSettle = Boolean(preset) && !streaming && settling;

    const isPostStreamSettleRef = useRef(isPostStreamSettle);
    isPostStreamSettleRef.current = isPostStreamSettle;

    const isFullySettled =
      Boolean(preset) && revealModeEverOn && !streaming && !settling;

    // -------- Reveal observer -------------------------------------------
    useLayoutEffect(() => {
      if (!preset) return;
      if (!streaming && !settling) return;

      const root = measureRef.current;
      if (!root) return;

      const lastLen = new WeakMap<HTMLElement, number>();
      const animatedLen = new WeakMap<HTMLElement, number>();
      let firstProcess = true;

      const animate = (el: HTMLElement, delayMs: number) => {
        el.style.animation = 'none';
        void el.offsetWidth;
        el.style.animation = '';
        el.style.animationDelay = `${delayMs}ms`;
      };

      const process = () => {
        const phase: 'stream' | 'settle' = isPostStreamSettleRef.current
          ? 'settle'
          : 'stream';

        const segments = Array.from(
          root.querySelectorAll<HTMLElement>('.stream-reveal__segment'),
        );

        if (firstProcess) {
          firstProcess = false;
          for (const el of segments) {
            const len = (el.textContent ?? '').length;
            lastLen.set(el, len);
            animatedLen.set(el, len);
            el.style.animation = 'none';
          }
          return;
        }

        if (segments.length === 0) return;

        if (phase === 'settle') {
          for (const el of segments) {
            const len = (el.textContent ?? '').length;
            lastLen.set(el, len);
            animatedLen.set(el, len);
          }
          return;
        }

        const toAnimate: HTMLElement[] = [];
        for (const el of segments) {
          const len = (el.textContent ?? '').length;
          const prev = lastLen.get(el);
          const animated = animatedLen.get(el);
          const isNew = prev === undefined;
          const grew = prev !== undefined && len > prev;
          const alreadyAnimated = animated !== undefined && animated >= len;

          if ((isNew || grew) && !alreadyAnimated) {
            toAnimate.push(el);
          }
          lastLen.set(el, len);
        }

        if (toAnimate.length === 0) return;

        toAnimate.forEach((el, i) => {
          animate(el, Math.min(i, MAX_STAGGER_INDEX) * STAGGER_MS);
          animatedLen.set(el, (el.textContent ?? '').length);
        });
      };

      const observer = new MutationObserver(process);
      observer.observe(root, {
        childList: true,
        subtree: true,
        characterData: true,
      });

      process();

      return () => observer.disconnect();
    }, [preset, id, streaming, settling]);

    const revealStyle = preset
      ? ({
          '--stream-reveal-fade-ms': `${preset.fadeMs}ms`,
          '--stream-reveal-lift': `${preset.liftPx}px`,
          '--stream-reveal-from-opacity': `${preset.fromOpacity}`,
        } as React.CSSProperties)
      : undefined;

    return (
      <div
        ref={contentRef}
        className={cn(
          'transition-opacity duration-200 ease-out',
          isVisible ? 'opacity-100' : 'opacity-0',
        )}
      >
        <MarkdownFileContext.Provider value={contextValue}>
          <div
            ref={measureRef}
            className={cn('markdown', className)}
            data-slot='markdown'
            data-stream-reveal={preset ? streamRevealPreset : undefined}
            data-settling={isPostStreamSettle ? 'true' : undefined}
            data-settled={isFullySettled ? 'true' : undefined}
            style={revealStyle}
            {...props}
          >
            {blocks.map((blockContent, index) => {
              const isLast = index === blocks.length - 1;

              const blockKey = isLast
                ? `${id}-block-last`
                : `${id}-block-${index}-${hashString(blockContent)}`;

              const isRevealingBlock =
                Boolean(preset && isLast) && revealModeEverOn;

              return (
                <MemoizedBlock
                  key={blockKey}
                  components={renderers}
                  content={blockContent}
                  isStreamingBlock={isRevealingBlock}
                  streamRevealTokenCount={preset?.tokenCount}
                  settleFading={
                    blockSettleFading && index === lastNonEmptyIndex
                  }
                  settleFadeMs={SETTLE_FADE_MS}
                />
              );
            })}
          </div>
        </MarkdownFileContext.Provider>
      </div>
    );
  },
);

Markdown.displayName = 'Markdown';
