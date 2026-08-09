// adaptive-code-block.tsx
'use client';

import type { ReactElement } from 'react';
import { memo, useMemo } from 'react';

import { CodeBlockCode, type CodeBlockCodeProps } from './code-block';
import {
  VirtualizedCodeBlockCode,
  type VirtualizedCodeBlockCodeProps,
} from './virtualized-code-block';

export interface AdaptiveCodeBlockCodeProps extends CodeBlockCodeProps {
  itemSize?: VirtualizedCodeBlockCodeProps['itemSize'];
  /** Line-count threshold above which rendering switches to VirtualizedCodeBlockCode */
  virtualizeLineThreshold?: number;
}

export const AdaptiveCodeBlockCode = memo(function AdaptiveCodeBlockCode({
  code,
  itemSize,
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

  return shouldVirtualize ? (
    <VirtualizedCodeBlockCode
      code={code}
      itemSize={itemSize}
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
  );
});

AdaptiveCodeBlockCode.displayName = 'AdaptiveCodeBlockCode';
