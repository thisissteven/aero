// file-drop-zone.tsx
import { cn, logger } from '@aero/ui';
import { memo, type ReactNode, useCallback, useRef, useState } from 'react';
import { useExternalPartsStore } from '@/app/features/chat-page/chat-input/external-parts-store';
import { useSessionId } from '@/app/providers/SessionIdProvider';

interface FileDropZoneProps {
  children: ReactNode;
  className?: string;
  /** Overlay copy. Defaults to “Drop files to attach”. */
  label?: string;
}

/**
 * Wraps a container and turns it into a file drop target.
 *
 * - Renders an overlay only while a *file* drag is over the zone.
 * - The overlay is `pointer-events: none`, so it never eats clicks, hovers,
 *   text selection, or anything else happening underneath.
 * - On drop it hands the files straight to the external-parts store for the
 *   current session. Nothing else changes.
 */
export const FileDropZone = memo(function FileDropZone({
  children,
  className,
  label,
}: FileDropZoneProps) {
  const sessionId = useSessionId();
  const addFileAttachments = useExternalPartsStore(
    (state) => state.addFileAttachments,
  );

  // dragenter/dragleave fire for every descendant crossed, so a naive
  // boolean flickers off when the cursor moves over a child. Count depth.
  const dragDepth = useRef(0);

  const handleDragEnter = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      if (!hasFiles(event)) return;

      event.preventDefault();
      dragDepth.current += 1;
    },
    [],
  );

  const handleDragOver = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      if (!hasFiles(event)) return;

      // Required, or the browser refuses to fire `drop`.
      event.preventDefault();
      event.dataTransfer.dropEffect = 'copy';
    },
    [],
  );

  const handleDragLeave = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      if (!hasFiles(event)) return;

      dragDepth.current = Math.max(0, dragDepth.current - 1);
    },
    [],
  );

  const handleDrop = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      if (!hasFiles(event)) return;

      event.preventDefault();
      dragDepth.current = 0;

      const files = Array.from(event.dataTransfer.files);
      if (files.length === 0) return;

      addFileAttachments(sessionId, files);
    },
    [addFileAttachments, sessionId],
  );

  return (
    <div
      className={cn('relative', className)}
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {children}
    </div>
  );
});

/**
 * Drag events expose what's being dragged via `dataTransfer.types`. File
 * drags always include the literal `'Files'` entry; text/URL drags don't.
 */
function hasFiles(event: React.DragEvent): boolean {
  const types = event.dataTransfer?.types;
  if (!types) return false;
  return Array.from(types).includes('Files');
}
