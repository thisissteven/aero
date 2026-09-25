'use client';

import { memo, useCallback, useMemo } from 'react';
import { Components as MarkdownComponents } from 'react-markdown';
import { resolveMarkdownUrl } from '@/app/components/chat-aside/files/markdown-url';
import { Markdown } from '@/app/components/markdown/markdown';

export interface MarkdownPreviewProps {
  /** Raw markdown source. */
  content: string;
  /** Path of the markdown file itself, relative to project root.
   *  Used to resolve relative image / link URLs. */
  path: string;
  /** Builds a streamable HTTP URL for a project-relative path. */
  getFileUrl: (p: string) => string;
  /** Called when the user clicks an inline link to another project file. */
  onOpenFile: (p: string) => void;
}

export const MarkdownPreview = memo(function MarkdownPreview({
  content,
  path,
  getFileUrl,
  onOpenFile,
}: MarkdownPreviewProps) {
  const resolve = useCallback(
    (url: string, kind: 'image' | 'link') =>
      resolveMarkdownUrl(url, path, kind, getFileUrl),
    [path, getFileUrl],
  );

  const components = useMemo<Partial<MarkdownComponents>>(
    () => ({
      // react-markdown passes a `node` prop into every renderer; strip it
      // before spreading onto the DOM element.
      img: ({ src, alt, node: _node, ...rest }) => {
        const resolved = typeof src === 'string' ? resolve(src, 'image') : src;
        return <img src={resolved} alt={alt ?? ''} {...rest} />;
      },
      a: ({ href, children, node: _node, ...rest }) => {
        if (typeof href === 'string' && href.startsWith('fs:')) {
          const target = href.slice(3);
          return (
            <a
              {...rest}
              href='#'
              onClick={(e) => {
                e.preventDefault();
                onOpenFile(target);
              }}
            >
              {children}
            </a>
          );
        }
        return (
          <a {...rest} href={href} target='_blank' rel='noreferrer'>
            {children}
          </a>
        );
      },
    }),
    [resolve, onOpenFile],
  );

  return (
    <div
      data-file-scroll-root='true'
      className='scrollbar-thin h-full overflow-auto px-4 py-3'
    >
      <Markdown
        id={`md-preview:${path}`}
        components={components}
        streamRevealPreset='off'
      >
        {content}
      </Markdown>
    </div>
  );
});
