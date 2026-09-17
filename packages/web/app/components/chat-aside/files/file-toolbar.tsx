'use client';

import { Eye, FloppyDisk, Hashtag, Pencil } from '@gravity-ui/icons';
import { IconWordWrap } from '@pierre/icons';
import { memo } from 'react';
import { useFileViewerStore } from '@/app/components/chat-aside/files/file-viewer-store';
import { RefreshButton } from '@/app/components/chat-aside/files/refresh-button';
import { ToolbarButton } from '@/app/components/chat-aside/files/toolbar-button';
import { FileTypeIcon } from '@/app/components/file-type-icon';
import { CopyMotionIcon } from '@/app/components/tool-call-view/code-block-icons';

export interface FileToolbarProps {
  filePath: string;
  fileName: string;
  isDirty: boolean;
  saving: boolean;
  copied: boolean;
  editable: boolean;
  /** Viewer controls (font, wrap, line numbers, copy, save) only apply to
   *  text files — hide them for binary/media. */
  showViewerControls: boolean;
  /** True for README files, which get a preview/edit toggle. */
  isReadme: boolean;
  /** Current mode for READMEs. Ignored when `isReadme` is false. */
  previewMode: boolean;
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
  isReadme,
  previewMode,
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

  // In README preview mode the source-level controls don't apply.
  const previewActive = isReadme && previewMode;

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
        {showViewerControls && isReadme && (
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
