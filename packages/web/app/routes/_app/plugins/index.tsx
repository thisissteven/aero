import { PatchDiff } from '@pierre/diffs/react';
import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';
import { CodeBlock } from '@/app/components/tool-call-view/code-block';

export const Route = createFileRoute('/_app/plugins/')({
  component: DiffDebugPage,
});

const PATCH = `--- a/command.css
+++ b/command.css
@@ -1,5 +1,5 @@
 border-color: color-mix(
   in oklab,
-  var(--border-separator) 60%,
+  var(--separator) 60%,
   transparent
 );
`;

const CODE = `border-color: color-mix(
  in oklab,
  var(--separator) 60%,
  transparent
);`;

type Indicators = 'bars' | 'classic' | 'none';
type Overflow = 'wrap' | 'scroll';
type DiffStyle = 'split' | 'unified';

export default function DiffDebugPage() {
  const [diffIndicators, setDiffIndicators] = useState<Indicators>('bars');
  const [disableBackground, setDisableBackground] = useState(false);
  const [overflow, setOverflow] = useState<Overflow>('wrap');
  const [diffStyle, setDiffStyle] = useState<DiffStyle>('unified');
  const [paneWidth, setPaneWidth] = useState(500);
  const [variant, setVariant] = useState<'file' | 'diff'>('diff');

  const optionKey = `${variant}:${diffIndicators}:${disableBackground}:${overflow}:${diffStyle}`;

  return (
    <div className='space-y-4 p-6'>
      <div className='flex flex-wrap items-center gap-3 text-xs'>
        <label className='flex items-center gap-1'>
          variant
          <select
            value={variant}
            onChange={(e) => setVariant(e.target.value as 'file' | 'diff')}
            className='border-separator rounded border bg-transparent px-1 py-0.5'
          >
            <option value='diff'>diff</option>
            <option value='file'>file</option>
          </select>
        </label>

        <label className='flex items-center gap-1'>
          indicators
          <select
            value={diffIndicators}
            onChange={(e) => setDiffIndicators(e.target.value as Indicators)}
            className='border-separator rounded border bg-transparent px-1 py-0.5'
          >
            <option value='bars'>bars</option>
            <option value='classic'>classic</option>
            <option value='none'>none</option>
          </select>
        </label>

        <label className='flex items-center gap-1'>
          <input
            type='checkbox'
            checked={disableBackground}
            onChange={(e) => setDisableBackground(e.target.checked)}
          />
          disableBackground
        </label>

        <label className='flex items-center gap-1'>
          overflow
          <select
            value={overflow}
            onChange={(e) => setOverflow(e.target.value as Overflow)}
            className='border-separator rounded border bg-transparent px-1 py-0.5'
          >
            <option value='wrap'>wrap</option>
            <option value='scroll'>scroll</option>
          </select>
        </label>

        <label className='flex items-center gap-1'>
          style
          <select
            value={diffStyle}
            onChange={(e) => setDiffStyle(e.target.value as DiffStyle)}
            className='border-separator rounded border bg-transparent px-1 py-0.5'
          >
            <option value='unified'>unified</option>
            <option value='split'>split</option>
          </select>
        </label>

        <label className='flex items-center gap-1'>
          pane width
          <input
            type='range'
            min={200}
            max={1200}
            value={paneWidth}
            onChange={(e) => setPaneWidth(Number(e.target.value))}
          />
          <span className='tabular-nums'>{paneWidth}px</span>
        </label>
      </div>

      {/*
        The pane wrapper width is controllable so you can watch the fill
        behavior change as the pane gets wider or narrower than the code text.
      */}
      <div style={{ width: paneWidth }}>
        <CodeBlock.Root key={optionKey}>
          <CodeBlock.Header>
            <span className='truncate font-mono text-xs'>command.css</span>
            <div className='flex items-center gap-1'>
              <CodeBlock.ViewModeButton />
              <CodeBlock.WrapButton />
              <CodeBlock.CopyButton code={variant === 'diff' ? PATCH : CODE} />
            </div>
          </CodeBlock.Header>

          <CodeBlock.Code
            variant={variant}
            patch={variant === 'diff' ? PATCH : undefined}
            code={variant === 'file' ? CODE : ''}
            language='css'
            showLineNumbers
          />

          <CodeBlock.Footer>
            <span className='text-[10px]'>Changes</span>
            <CodeBlock.ChangeSummary additions={5} deletions={5} />
          </CodeBlock.Footer>
        </CodeBlock.Root>
      </div>

      <details className='text-muted text-xs'>
        <summary className='cursor-pointer'>current options</summary>
        <pre className='mt-2'>
          {JSON.stringify(
            {
              variant,
              diffStyle,
              diffIndicators,
              disableBackground,
              overflow,
              paneWidth,
            },
            null,
            2,
          )}
        </pre>
      </details>
    </div>
  );
}
