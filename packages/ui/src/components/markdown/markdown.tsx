'use client';

import { cn } from '@heroui/react';
import type {
  ComponentPropsWithRef,
  NamedExoticComponent,
  ReactElement,
  RefObject,
} from 'react';
import { memo, useEffect, useMemo, useRef, useState } from 'react';
import type { Components } from 'react-markdown';

import { useAutoScroll } from '../../hooks';
import {
  defaultComponents,
  MarkdownFileContext,
  MemoizedBlock,
} from '../markdown';

// ---------------------------------------------------------------------------
// Presets
// ---------------------------------------------------------------------------

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
    tokenCount: 6,
    fadeMs: 180,
    liftPx: 2,
    fromOpacity: 0.35,
  },
  fast: {
    tickMs: 25,
    baseStep: 3,
    mediumBacklog: 60,
    mediumStep: 6,
    largeBacklog: 200,
    largeStep: 12,
    tokenCount: 5,
    fadeMs: 140,
    liftPx: 2,
    fromOpacity: 0.4,
  },
  instant: {
    tickMs: 16,
    baseStep: 6,
    mediumBacklog: 60,
    mediumStep: 12,
    largeBacklog: 200,
    largeStep: 24,
    tokenCount: 3,
    fadeMs: 100,
    liftPx: 0,
    fromOpacity: 0.7,
  },
};

// ---------------------------------------------------------------------------
// Stepped content
// ---------------------------------------------------------------------------

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
    if (!isStreaming || !presetRef.current) {
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
      const stepSize =
        backlog > cfg.largeBacklog
          ? cfg.largeStep
          : backlog > cfg.mediumBacklog
            ? cfg.mediumStep
            : cfg.baseStep;

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

  return isStreaming && preset ? displayed : content;
}

// ---------------------------------------------------------------------------
// Block hashing
// ---------------------------------------------------------------------------

function hashString(s: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(36);
}

// ---------------------------------------------------------------------------
// Markdown
// ---------------------------------------------------------------------------

export interface MarkdownProps
  extends Omit<ComponentPropsWithRef<'div'>, 'children'> {
  children: string;
  components?: Partial<Components>;
  id: string;
  isFile?: (path: string) => boolean;
  onFileClick?: (path: string) => void;
  scrollRef?: RefObject<HTMLElement | null>;
  streaming?: boolean;
  streamRevealPreset?: StreamRevealPreset;
}

const NULL_REF: RefObject<HTMLElement | null> = { current: null };

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
        // Opening fence — info string (language tag) can be anything.
        fenceChar = char;
        fenceLen = len;
      } else if (char === fenceChar && len >= fenceLen && info.trim() === '') {
        // Closing fence — must be the same char, at least as long, no info.
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
    scrollRef,
    ...props
  }: MarkdownProps): ReactElement {
    const preset =
      streamRevealPreset === 'off' ? null : PRESETS[streamRevealPreset];

    const bufferedContent = useSteppedContent(children, streaming, preset);

    // Capture whether this markdown was created during active streaming.
    // If so, delay visibility by 300ms so the reasoning / activity UI can
    // paint first. Historical messages bypass the delay.
    const wasStreamingOnMount = useRef(streaming).current;
    const [isVisible, setIsVisible] = useState(!wasStreamingOnMount);

    useEffect(() => {
      if (!wasStreamingOnMount) return;
      const timer = setTimeout(() => setIsVisible(true), 300);
      return () => clearTimeout(timer);
    }, [wasStreamingOnMount]);

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

    const contentRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
      if (!streaming || !preset) return;
      const root = (scrollRef?.current ??
        contentRef.current) as HTMLElement | null;
      if (!root) return;

      const replay = (el: Element) => {
        const html = el as HTMLElement;
        html.style.animation = 'none';
        void html.offsetWidth;
        html.style.animation = '';
      };

      const observer = new MutationObserver((mutations) => {
        for (const m of mutations) {
          for (const n of Array.from(m.addedNodes)) {
            if (!(n instanceof Element)) continue;
            if (n.matches('.stream-reveal__segment')) replay(n);
            for (const child of Array.from(
              n.querySelectorAll('.stream-reveal__segment'),
            )) {
              replay(child);
            }
          }
        }
      });

      observer.observe(root, { childList: true, subtree: true });
      return () => observer.disconnect();
    }, [streaming, scrollRef, preset]);

    useAutoScroll({
      scrollRef: scrollRef ?? NULL_REF,
      contentRef,
      isStreaming: streaming,
    });

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
            className={cn('markdown', className)}
            data-slot='markdown'
            data-stream-reveal={preset ? streamRevealPreset : undefined}
            style={revealStyle}
            ref={scrollRef as RefObject<HTMLDivElement>}
            {...props}
          >
            {blocks.map((blockContent, index) => {
              const isLast = index === blocks.length - 1;
              const blockKey = isLast
                ? `${id}-block-live`
                : `${id}-block-${index}-${hashString(blockContent)}`;
              return (
                <MemoizedBlock
                  key={blockKey}
                  components={renderers}
                  content={blockContent}
                  isStreamingBlock={Boolean(streaming && isLast && preset)}
                  streamRevealTokenCount={preset?.tokenCount}
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
