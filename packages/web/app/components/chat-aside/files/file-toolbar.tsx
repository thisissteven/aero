'use client';

import {
  Eye,
  FloppyDisk,
  Hashtag,
  Minus,
  Pencil,
  Plus,
} from '@gravity-ui/icons';
import { IconWordWrap } from '@pierre/icons';
import { memo } from 'react';
import {
  IMAGE_ZOOM_MAX,
  IMAGE_ZOOM_MIN,
  useFileViewerStore,
} from '@/app/components/chat-aside/files/file-viewer-store';
import { RefreshButton } from '@/app/components/chat-aside/files/refresh-button';
import { ToolbarButton } from '@/app/components/chat-aside/files/toolbar-button';
import { CopyMotionIcon } from '@/app/components/code-block/code-block-icons';
import { FileTypeIcon } from '@/app/components/file-type-icon';

export interface FileToolbarProps {
  filePath: string;
  fileName: string;
  isDirty: boolean;
  saving: boolean;
  copied: boolean;
  editable: boolean;
  /** Viewer controls (font, wrap, line numbers, copy, save) for text files. */
  showViewerControls: boolean;
  /** True for markdown files, which get a preview/edit toggle. */
  isMarkdown: boolean;
  /** Current mode for markdown. Ignored when `isMarkdown` is false. */
  previewMode: boolean;
  /** True for image files, which get zoom controls. */
  isImage: boolean;
  onTogglePreview: () => void;
  onCopy: () => void;
  onSave: () => void;
  onRefresh: () => void;
}

export const FileToolbar = memo(function FileToolbar({
  filePath,
  fileName,
  isDirty,
  saving,
  copied,
  editable,
  showViewerControls,
  isMarkdown,
  previewMode,
  isImage,
  onTogglePreview,
  onCopy,
  onSave,
  onRefresh,
}: FileToolbarProps) {
  const wrapText = useFileViewerStore((s) => s.wrapText);
  const showLineNumbers = useFileViewerStore((s) => s.showLineNumbers);
  const increaseFontSize = useFileViewerStore((s) => s.increaseFontSize);
  const decreaseFontSize = useFileViewerStore((s) => s.decreaseFontSize);
  const toggleWrapText = useFileViewerStore((s) => s.toggleWrapText);
  const toggleLineNumbers = useFileViewerStore((s) => s.toggleLineNumbers);
  const imageZoom = useFileViewerStore((s) => s.imageZoom);
  const zoomIn = useFileViewerStore((s) => s.zoomIn);
  const zoomOut = useFileViewerStore((s) => s.zoomOut);
  const resetImageZoom = useFileViewerStore((s) => s.resetImageZoom);

  const previewActive = isMarkdown && previewMode;

  return (
    <div className='border-separator sticky top-0 z-10 flex h-10 shrink-0 items-center justify-between border-b px-3'>
      <div
        className='text-foreground flex min-w-0 items-center gap-1 truncate text-xs font-medium'
        title={filePath}
      >
        <FileTypeIcon filePath={fileName} />
        {fileName}
        {isDirty && (
          <span
            className='bg-accent ml-1 inline-block h-1.5 w-1.5 shrink-0 rounded-full'
            aria-label='Unsaved changes'
            title='Unsaved changes'
          />
        )}
      </div>

      <div className='flex items-center gap-0.5'>
        {isImage && (
          <>
            <ToolbarButton
              label='Zoom out'
              onClick={zoomOut}
              disabled={imageZoom <= IMAGE_ZOOM_MIN}
            >
              <Minus className='size-3.5' />
            </ToolbarButton>

            <button
              type='button'
              onClick={resetImageZoom}
              title='Reset zoom (or double-click the image)'
              className='text-muted hover:text-foreground min-w-[4ch] rounded px-1 text-center text-xs tabular-nums'
            >
              {Math.round(imageZoom * 100)}%
            </button>

            <ToolbarButton
              label='Zoom in'
              onClick={zoomIn}
              disabled={imageZoom >= IMAGE_ZOOM_MAX}
            >
              <Plus className='size-3.5' />
            </ToolbarButton>
          </>
        )}

        {showViewerControls && isMarkdown && (
          <ToolbarButton
            label={previewMode ? 'Edit markdown' : 'Preview markdown'}
            active={previewMode}
            onClick={onTogglePreview}
          >
            {previewMode ? (
              <Pencil className='size-3.5' />
            ) : (
              <Eye className='size-3.5' />
            )}
          </ToolbarButton>
        )}

        {showViewerControls && !previewActive && (
          <>
            <ToolbarButton
              label='Decrease font size'
              onClick={decreaseFontSize}
            >
              <span className='text-xs font-medium'>A-</span>
            </ToolbarButton>
            <ToolbarButton
              label='Increase font size'
              onClick={increaseFontSize}
            >
              <span className='text-xs font-medium'>A+</span>
            </ToolbarButton>

            <ToolbarButton
              label={wrapText ? 'Disable word wrap' : 'Enable word wrap'}
              active={wrapText}
              onClick={toggleWrapText}
            >
              <IconWordWrap className='size-3' />
            </ToolbarButton>

            <ToolbarButton
              label={
                showLineNumbers ? 'Hide line numbers' : 'Show line numbers'
              }
              active={showLineNumbers}
              onClick={toggleLineNumbers}
            >
              <Hashtag className='size-3.5' />
            </ToolbarButton>
          </>
        )}

        {showViewerControls && (
          <ToolbarButton
            label={copied ? 'Copied' : 'Copy contents'}
            active={copied}
            onClick={onCopy}
          >
            <CopyMotionIcon copied={copied} />
          </ToolbarButton>
        )}

        {showViewerControls && editable && (
          <ToolbarButton
            label={
              saving
                ? 'Saving…'
                : isDirty
                  ? 'Save changes'
                  : 'No unsaved changes'
            }
            active={isDirty}
            disabled={!isDirty || saving}
            onClick={onSave}
          >
            <FloppyDisk className='size-3.5' />
          </ToolbarButton>
        )}

        <RefreshButton label='Reload file' onClick={onRefresh} />
      </div>
    </div>
  );
});
