'use client';

import type {
  ComponentPropsWithRef,
  NamedExoticComponent,
  ReactElement,
  RefObject,
} from 'react';
import { memo } from 'react';
import type { Components } from 'react-markdown';

import { Markdown } from './markdown';
import { VirtualizedMarkdown } from './virtualized-markdown';

export interface AdaptiveMarkdownProps extends Omit<
  ComponentPropsWithRef<'div'>,
  'children'
> {
  children: string;
  components?: Partial<Components>;
  id: string;
  isFile?: (path: string) => boolean;
  /** Item size hint forwarded to VirtualizedMarkdown/virtua */
  itemSize?: number;
  onFileClick?: (path: string) => void;
  /** Ref to the actual scrollable ancestor (e.g. the wrapping ScrollShadow's ref). Required — without it virtua can't find the real viewport. */
  scrollRef?: RefObject<HTMLElement | null>;
  /**
   * Character length above which content switches to VirtualizedMarkdown.
   * Tune to your typical block size — this is intentionally a length check,
   * not a block-count check, so it's O(1) and doesn't require splitting the
   * string just to decide.
   */
  virtualizeThreshold?: number;
}

export const AdaptiveMarkdown: NamedExoticComponent<AdaptiveMarkdownProps> =
  memo(function AdaptiveMarkdown({
    children,
    itemSize,
    scrollRef,
    virtualizeThreshold = 4000,
    ...props
  }: AdaptiveMarkdownProps): ReactElement {
    // Same rule as AdaptiveCodeBlockCode: no proven bounded viewport, no virtualization —
    // otherwise you get virtua's tracking overhead for zero windowing benefit.
    const shouldVirtualize =
      !!scrollRef && children.length >= virtualizeThreshold;

    return shouldVirtualize ? (
      <VirtualizedMarkdown itemSize={itemSize} scrollRef={scrollRef} {...props}>
        {children}
      </VirtualizedMarkdown>
    ) : (
      <Markdown {...props}>{children}</Markdown>
    );
  });

AdaptiveMarkdown.displayName = 'AdaptiveMarkdown';
