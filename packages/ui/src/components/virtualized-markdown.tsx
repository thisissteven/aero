'use client';

import { cn } from '@heroui/react';
import type {
  ComponentPropsWithRef,
  NamedExoticComponent,
  ReactElement,
  RefObject,
} from 'react';
import { memo, useMemo } from 'react';
import type { Components } from 'react-markdown';
import { Virtualizer } from 'virtua';

import {
  defaultComponents,
  MarkdownFileContext,
  MemoizedBlock,
} from './markdown';

/**
 * Splits markdown into top-level blocks on blank-line boundaries, keeping
 * fenced code blocks (``` or ~~~) intact so a fence is never split across
 * two virtualized items.
 *
 * Trade-off: each block is parsed by its own ReactMarkdown instance, so
 * constructs that depend on document-wide state (loose list numbering
 * continuing across a blank line, link/footnote reference definitions
 * living in a different block than their usage) won't resolve correctly.
 * For most chat/markdown-response content this doesn't come up in practice.
 */
function splitMarkdownIntoBlocks(markdown: string): string[] {
  const lines = markdown.split('\n');
  const blocks: string[] = [];
  let buffer: string[] = [];
  let fence: string | null = null;

  const flush = () => {
    const block = buffer.join('\n').trim();

    if (block) {
      blocks.push(block);
    }

    buffer = [];
  };

  for (const line of lines) {
    const fenceMatch = /^ {0,3}(`{3,}|~{3,})/.exec(line);

    if (fenceMatch) {
      buffer.push(line);

      const marker = fenceMatch[1]!;

      fence =
        fence && line.trimStart().startsWith(fence) ? null : (fence ?? marker);

      continue;
    }

    if (fence) {
      buffer.push(line);
      continue;
    }

    if (line.trim() === '') {
      if (buffer.length > 0) {
        flush();
      }

      continue;
    }

    buffer.push(line);
  }

  flush();

  return blocks.length > 0 ? blocks : [markdown];
}

export interface VirtualizedMarkdownProps extends Omit<
  ComponentPropsWithRef<'div'>,
  'children'
> {
  children: string;
  components?: Partial<Components>;
  id: string;
  isFile?: (path: string) => boolean;
  itemSize?: number;
  onFileClick?: (path: string) => void;
  scrollRef?: RefObject<HTMLElement | null>;
  streaming?: boolean;
}

export const VirtualizedMarkdown: NamedExoticComponent<VirtualizedMarkdownProps> =
  memo(function VirtualizedMarkdown({
    children,
    className,
    components,
    id,
    isFile,
    itemSize,
    onFileClick,
    scrollRef,
    streaming = false,
    ...props
  }: VirtualizedMarkdownProps): ReactElement {
    const blocks = useMemo(() => splitMarkdownIntoBlocks(children), [children]);

    const renderers = useMemo(
      () => ({ ...defaultComponents, ...components }),
      [components],
    );

    const contextValue = useMemo(
      () => ({ isFile, onFileClick }),
      [isFile, onFileClick],
    );

    return (
      <MarkdownFileContext.Provider value={contextValue}>
        <div
          className={cn('markdown', className)}
          data-slot='markdown'
          {...props}
        >
          <Virtualizer<string>
            data={blocks}
            itemSize={itemSize}
            scrollRef={scrollRef}
          >
            {(block, index) => (
              <div key={`${id}-${index}`} className='mb-4'>
                <MemoizedBlock
                  components={renderers}
                  content={block}
                  streaming={streaming}
                />
              </div>
            )}
          </Virtualizer>
        </div>
      </MarkdownFileContext.Provider>
    );
  });

VirtualizedMarkdown.displayName = 'VirtualizedMarkdown';
