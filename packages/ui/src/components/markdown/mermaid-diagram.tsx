'use client';

import mermaid from 'mermaid';
import type { ReactElement } from 'react';
import { memo, useEffect, useRef, useState } from 'react';
import { CodeBlock } from '../code-block';
import { DiagramFrame } from './diagram-frame';

let initialized = false;
function ensureInit() {
  if (initialized) return;
  mermaid.initialize({
    startOnLoad: false,
    theme: 'neutral',
    securityLevel: 'strict',
    fontFamily: 'inherit',
  });
  initialized = true;
}

function hashString(s: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(36);
}

interface MermaidDiagramProps {
  code: string;
  /** While the parent block is still streaming, skip parse/render attempts
   *  on every incomplete tick and just show the raw source. */
  isStreamingBlock?: boolean;
}

export const MermaidDiagram = memo(function MermaidDiagram({
  code,
  isStreamingBlock = false,
}: MermaidDiagramProps): ReactElement {
  const [svg, setSvg] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const lastGoodCodeRef = useRef<string | null>(null);
  const renderIdRef = useRef(0);

  useEffect(() => {
    if (isStreamingBlock) return;

    ensureInit();
    const myRenderId = ++renderIdRef.current;

    if (code.trim().length < 3) return;

    const id = `mermaid-${hashString(code)}`;

    mermaid
      .parse(code, { suppressErrors: true })
      .then((valid) => {
        if (!valid || myRenderId !== renderIdRef.current) return null;
        return mermaid.render(id, code);
      })
      .then((result) => {
        if (!result || myRenderId !== renderIdRef.current) return;
        lastGoodCodeRef.current = code;
        setSvg(result.svg);
        setFailed(false);
      })
      .catch(() => {
        if (myRenderId !== renderIdRef.current) return;
        if (!lastGoodCodeRef.current) setFailed(true);
      });
  }, [code, isStreamingBlock]);

  // Same compound structure as code-block.tsx usages elsewhere: CodeBlock
  // (root) wraps CodeBlock.Code. Border/rounding are stripped because the
  // DiagramFrame already provides them for the whole card.
  const codeView = (
    <CodeBlock className='rounded-none border-0 bg-transparent'>
      <CodeBlock.Code code={code} language='mermaid' />
    </CodeBlock>
  );

  return (
    <DiagramFrame
      label='mermaid'
      code={code}
      codeView={codeView}
      previewUnavailable={!svg && (failed || isStreamingBlock)}
      preview={
        svg ? (
          // Shiki-equivalent trust boundary: this is mermaid's own generated
          // SVG, not raw model/user markup passed straight to the DOM.
          // oxlint-disable-next-line react/no-danger
          <div
            className='flex items-center justify-center [&_svg]:max-h-[38vh] [&_svg]:max-w-full'
            dangerouslySetInnerHTML={{ __html: svg }}
          />
        ) : (
          <div className='flex h-full w-full items-center justify-center text-xs text-muted'>
            {isStreamingBlock ? 'Rendering…' : 'Unable to render diagram'}
          </div>
        )
      }
    />
  );
});

MermaidDiagram.displayName = 'MermaidDiagram';
