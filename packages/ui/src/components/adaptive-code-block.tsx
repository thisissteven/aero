'use client';

import type { ReactElement } from 'react';
import { lazy, memo, Suspense, useMemo } from 'react';

import type { CodeBlockCodeProps } from './code-block';
import type { VirtualizedCodeBlockCodeProps } from './virtualized-code-block';

const CodeBlockCode = lazy(() =>
  import('./code-block').then((m) => ({ default: m.CodeBlockCode })),
);

const VirtualizedCodeBlockCode = lazy(() =>
  import('./virtualized-code-block').then((m) => ({
    default: m.VirtualizedCodeBlockCode,
  })),
);

export interface AdaptiveCodeBlockCodeProps extends CodeBlockCodeProps {
  itemSize?: VirtualizedCodeBlockCodeProps['itemSize'];
  virtualizeLineThreshold?: number;
}

export const AdaptiveCodeBlockCode = memo(function AdaptiveCodeBlockCode({
  code,
  scrollOverflow,
  virtualizeLineThreshold = 300,
  ...props
}: AdaptiveCodeBlockCodeProps): ReactElement {
  const lineCount = useMemo(
    () => (code.length === 0 ? 0 : code.split('\n').length),
    [code],
  );

  const shouldVirtualize =
    scrollOverflow && lineCount >= virtualizeLineThreshold;

  return (
    <Suspense
      fallback={
        <pre className='p-4 font-mono text-xs leading-relaxed whitespace-pre'>
          <code>{code}</code>
        </pre>
      }
    >
      {shouldVirtualize ? (
        <VirtualizedCodeBlockCode
          code={code}
          scrollOverflow={scrollOverflow}
          showLineNumbers
          {...props}
        />
      ) : (
        <CodeBlockCode
          code={code}
          scrollOverflow={scrollOverflow}
          showLineNumbers
          {...props}
        />
      )}
    </Suspense>
  );
});

AdaptiveCodeBlockCode.displayName = 'AdaptiveCodeBlockCode';
