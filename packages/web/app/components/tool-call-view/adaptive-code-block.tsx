'use client';

import type { ReactElement } from 'react';
import { memo, Suspense } from 'react';

import { CodeBlockCode, type CodeBlockCodeProps } from './code-block';

export const AdaptiveCodeBlockCode = memo(function AdaptiveCodeBlockCode({
  code,
  patch,
  variant = 'file',
  viewMode,
  scrollOverflow,
  ...props
}: CodeBlockCodeProps): ReactElement {
  return (
    <Suspense
      fallback={
        <pre className='p-4 font-mono text-xs leading-relaxed whitespace-pre'>
          <code>{code}</code>
        </pre>
      }
    >
      <CodeBlockCode
        code={code}
        patch={patch}
        variant={variant}
        viewMode={viewMode}
        scrollOverflow={scrollOverflow}
        {...props}
      />
    </Suspense>
  );
});

AdaptiveCodeBlockCode.displayName = 'AdaptiveCodeBlockCode';
