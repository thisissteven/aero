'use client';

import type { EditorChangeEvent, EditorOptions } from '@pierre/diffs/edit';
import { File as PierreFile, Virtualizer } from '@pierre/diffs/react';
import { memo, useMemo } from 'react';
import { useFileViewerStore } from '@/app/components/chat-aside/files/file-viewer-store';
import {
  getPierreShadowCss,
  getPierreTheme,
  PIERRE_FILE_STYLE,
} from '@/app/components/chat-aside/files/pierre-styles';
import { useTheme } from '@/app/providers';

/** A file read from disk and cached by the pane. */
export interface CachedFile {
  path: string;
  content: string | null;
  binary: boolean;
  truncated: boolean;
  size: number;
  mtimeMs: number;
  mimeType: string | null;
}

export type FileEditorChangeEvent = EditorChangeEvent<
  'file',
  unknown,
  undefined
>;
export type FileEditorOptions = EditorOptions<'file', unknown, undefined>;

export interface PierreEditorViewProps {
  file: CachedFile;
  currentContents: string;
  editable: boolean;
  viewerKey: string;
  layoutKey: string;
  renderKey: string;
  editorOptions: FileEditorOptions;
  onEditChange: (event: FileEditorChangeEvent) => void;
}

export const PierreEditorView = memo(function PierreEditorView({
  file,
  currentContents,
  editable,
  viewerKey,
  layoutKey,
  renderKey,
  editorOptions,
  onEditChange,
}: PierreEditorViewProps) {
  const { resolvedTheme, colorTheme } = useTheme();
  const wrapText = useFileViewerStore((s) => s.wrapText);
  const showLineNumbers = useFileViewerStore((s) => s.showLineNumbers);
  const fontSize = useFileViewerStore((s) => s.fontSize);

  const pierreTheme = useMemo(() => getPierreTheme(colorTheme), [colorTheme]);

  const shadowCss = useMemo(() => getPierreShadowCss(fontSize), [fontSize]);

  const pierreFile = (
    <PierreFile
      style={PIERRE_FILE_STYLE}
      file={{
        name: file.path,
        contents: currentContents,
        header: undefined,
        cacheKey: `${viewerKey}:${layoutKey}`,
      }}
      options={{
        theme: pierreTheme,
        themeType: resolvedTheme,
        overflow: wrapText ? 'wrap' : 'scroll',
        disableFileHeader: true,
        disableLineNumbers: !showLineNumbers,
        unsafeCSS: shadowCss,
      }}
      edit={editable}
      editorOptions={editorOptions}
      onEditChange={onEditChange}
    />
  );

  if (wrapText) {
    return (
      <div key={renderKey} className='scrollbar-thin h-full overflow-auto'>
        {pierreFile}
      </div>
    );
  }

  return (
    <Virtualizer
      key={renderKey}
      className='relative h-full min-h-0 min-w-0 scrollbar-thin'
      style={{ overflow: 'auto' }}
      contentStyle={{
        display: 'flex',
        minHeight: '100%',
        width: '100%',
        alignItems: 'stretch',
      }}
    >
      {pierreFile}
    </Virtualizer>
  );
});
