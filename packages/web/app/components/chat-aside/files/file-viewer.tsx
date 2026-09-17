'use client';

import { memo } from 'react';
import { getMediaKind } from '@/app/components/chat-aside/files/file-helpers';
import { MarkdownPreview } from '@/app/components/chat-aside/files/markdown-preview';
import { MediaPreview } from '@/app/components/chat-aside/files/media-preview';
import {
  type CachedFile,
  type FileEditorChangeEvent,
  type FileEditorOptions,
  PierreEditorView,
} from '@/app/components/chat-aside/files/pierre-editor-view';

export interface FileViewerProps {
  file: CachedFile;
  fileName: string;
  mediaKind: ReturnType<typeof getMediaKind>;
  /**
   * Direct (streamable) source URL for the media element. Null when the file
   * isn't media, or when no URL builder is available and the content couldn't
   * be inlined as a blob.
   */
  mediaUrl: string | null;
  editable: boolean;
  currentContents: string;
  isReadme: boolean;
  previewMode: boolean;
  viewerKey: string;
  layoutKey: string;
  renderKey: string;
  editorOptions: FileEditorOptions;
  onEditChange: (event: FileEditorChangeEvent) => void;
}

export const FileViewer = memo(function FileViewer({
  file,
  fileName,
  mediaKind,
  mediaUrl,
  editable,
  currentContents,
  isReadme,
  previewMode,
  viewerKey,
  layoutKey,
  renderKey,
  editorOptions,
  onEditChange,
}: FileViewerProps) {
  // Media: prefer direct <img>/<video>/<audio> via a streamable URL. Falls
  // back to a blob URL for small files when no URL builder is provided.
  if (mediaKind) {
    if (mediaUrl) {
      return (
        <MediaPreview kind={mediaKind} src={mediaUrl} fileName={fileName} />
      );
    }
    return (
      <div className='text-muted flex min-h-full flex-col items-center justify-center gap-2 p-6 text-center text-sm'>
        <span>File is too large to preview.</span>
        <span>{file.size.toLocaleString()} bytes</span>
      </div>
    );
  }

  if (file.binary) {
    return (
      <div className='text-muted flex min-h-full items-center justify-center p-4 text-sm'>
        Binary file not shown ({file.size.toLocaleString()} bytes).
      </div>
    );
  }

  if (isReadme && previewMode) {
    return <MarkdownPreview content={currentContents} />;
  }

  return (
    <PierreEditorView
      file={file}
      currentContents={currentContents}
      editable={editable}
      viewerKey={viewerKey}
      layoutKey={layoutKey}
      renderKey={renderKey}
      editorOptions={editorOptions}
      onEditChange={onEditChange}
    />
  );
});
