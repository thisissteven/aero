'use client';

import type { ReactElement } from 'react';
import { memo, useMemo } from 'react';
import rehypeParse from 'rehype-parse';
import rehypeSanitize from 'rehype-sanitize';
import rehypeStringify from 'rehype-stringify';
import { unified } from 'unified';
import { CodeBlock } from '../code-block/code-block';
import { DiagramFrame } from './diagram-frame';
import { svgSanitizeSchema } from './svg-sanitize-schema';

interface SvgBlockProps {
  code: string;
  isStreamingBlock?: boolean;
}

export const SvgBlock = memo(function SvgBlock({
  code,
  isStreamingBlock = false,
}: SvgBlockProps): ReactElement {
  const safeSvg = useMemo(() => {
    if (isStreamingBlock || !code.includes('</svg>')) return null;

    try {
      const file = unified()
        .use(rehypeParse, { fragment: true })
        .use(rehypeSanitize, svgSanitizeSchema)
        .use(rehypeStringify)
        .processSync(code);
      return String(file);
    } catch {
      return null;
    }
  }, [code, isStreamingBlock]);

  const codeView = (
    <CodeBlock className='rounded-none border-0 bg-transparent'>
      <CodeBlock.Code code={code} language='xml' />
    </CodeBlock>
  );

  return (
    <DiagramFrame
      label='svg'
      code={code}
      codeView={codeView}
      previewUnavailable={!safeSvg}
      preview={
        safeSvg ? (
          // oxlint-disable-next-line react/no-danger -- sanitized via rehype-sanitize above
          <div
            className='flex items-center justify-center [&_svg]:max-h-[38vh] [&_svg]:max-w-full'
            dangerouslySetInnerHTML={{ __html: safeSvg }}
          />
        ) : (
          <div className='flex h-full w-full items-center justify-center text-xs text-muted'>
            {isStreamingBlock ? 'Rendering…' : 'Unable to render SVG'}
          </div>
        )
      }
    />
  );
});

SvgBlock.displayName = 'SvgBlock';
