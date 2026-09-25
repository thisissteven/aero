'use client';

import { memo } from 'react';
import { getMediaKind } from '@/app/components/chat-aside/files/file-helpers';
import { ImageZoomView } from '@/app/components/chat-aside/files/image-zoom-view';
import { MarkdownPreview } from '@/app/components/chat-aside/files/markdown-preview';
import { MediaPreview } from '@/app/components/chat-aside/files/media-preview';
import {
  type CachedFile,
  type FileEditorChangeEvent,
  type FileEditorOptions,
  PierreEditorView,
} from '@/app/components/chat-aside/files/pierre-editor-view';
import { useI18n } from '@/app/hooks/i18n';

export interface FileViewerProps {
  file: CachedFile;
  fileName: string;
  mediaKind: ReturnType<typeof getMediaKind>;
  mediaUrl: string | null;
  editable: boolean;
  currentContents: string;
  isMarkdown: boolean;
  previewMode: boolean;
  viewerKey: string;
  layoutKey: string;
  renderKey: string;
  editorOptions: FileEditorOptions;
  getFileUrl?: (p: string) => string;
  onOpenFile?: (p: string) => void;
  onEditChange: (event: FileEditorChangeEvent) => void;
}

export const FileViewer = memo(function FileViewer({
  file,
  fileName,
  mediaKind,
  mediaUrl,
  editable,
  currentContents,
  isMarkdown,
  previewMode,
  viewerKey,
  layoutKey,
  renderKey,
  editorOptions,
  getFileUrl,
  onOpenFile,
  onEditChange,
}: FileViewerProps) {
  const { t } = useI18n();

  if (mediaKind && mediaUrl) {
    if (mediaKind === 'image') {
      return <ImageZoomView src={mediaUrl} alt={fileName} />;
    }
    return <MediaPreview kind={mediaKind} src={mediaUrl} fileName={fileName} />;
  }

  if (mediaKind) {
    return (
      <div className='text-muted flex min-h-full flex-col items-center justify-center gap-2 p-6 text-center text-sm'>
        <span>{t.fileExplorer.fileTooLarge}</span>
        <span>
          {file.size.toLocaleString()} {t.fileExplorer.bytes}
        </span>
      </div>
    );
  }

  if (file.binary) {
    return (
      <div className='text-muted flex min-h-full items-center justify-center p-4 text-sm'>
        {t.fileExplorer.binaryFileNotShown(file.size.toLocaleString())}
      </div>
    );
  }

  if (isMarkdown && previewMode) {
    return (
      <MarkdownPreview
        content={currentContents}
        path={file.path}
        getFileUrl={getFileUrl ?? ((p) => p)}
        onOpenFile={
          onOpenFile ??
          (() => {
            //
          })
        }
      />
    );
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
