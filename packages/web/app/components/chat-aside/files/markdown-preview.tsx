'use client';

import { Markdown } from '@aero/ui';
import { memo } from 'react';

export const MarkdownPreview = memo(function MarkdownPreview({
  content,
}: {
  content: string;
}) {
  return (
    <div className='scrollbar-thin h-full overflow-auto px-4 py-3'>
      <Markdown id='file-content-markdown-preview'>{content}</Markdown>
    </div>
  );
});
