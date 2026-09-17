'use client';

import type { Editor } from '@pierre/diffs/edit';
import {
  memo,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from 'react';
import {
  useFileEditStore,
  useIsDirty,
} from '@/app/components/chat-aside/files/file-edit-store';
import {
  base64ToBlob,
  getFileName,
  getMediaKind,
} from '@/app/components/chat-aside/files/file-helpers';
import { FileToolbar } from '@/app/components/chat-aside/files/file-toolbar';
import { FileViewer } from '@/app/components/chat-aside/files/file-viewer';
import { useFileViewerStore } from '@/app/components/chat-aside/files/file-viewer-store';
import { FsSocket } from '@/app/components/chat-aside/files/fs-socket';
import {
  type CachedFile,
  type FileEditorChangeEvent,
  type FileEditorOptions,
} from '@/app/components/chat-aside/files/pierre-editor-view';
import { useTheme } from '@/app/providers';

export interface FileContentPaneProps {
  socket: FsSocket;
  path: string | null;
  /**
   * Optional URL builder for streaming a file over HTTP. When provided, media
   * files render via direct <img>/<video>/<audio> sources instead of being
   * read as base64 through the socket.
   */
  getFileUrl?: (path: string) => string;
  /** Optional: called when the user clicks a link to another project file
   *  inside a markdown preview. If omitted, such links are no-ops. */
  onOpenFile?: (path: string) => void;
}

const MARKDOWN_RE = /\.(md|markdown|mdx)$/i;

function isMarkdownFile(filePath: string): boolean {
  return MARKDOWN_RE.test(filePath);
}

export const FileContentPane = memo(function FileContentPane({
  socket,
  path,
  getFileUrl,
  onOpenFile,
}: FileContentPaneProps) {
  const { resolvedTheme } = useTheme();

  const cacheRef = useRef<{
    files: Map<string, CachedFile>;
    errors: Map<string, string>;
  }>({ files: new Map(), errors: new Map() });

  const [, forceUpdate] = useReducer((n: number) => n + 1, 0);

  const [copied, setCopied] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const copyTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const setBuffer = useFileEditStore((s) => s.setBuffer);
  const clearBuffer = useFileEditStore((s) => s.clearBuffer);
  const setDiskContent = useFileEditStore((s) => s.setDiskContent);

  const bufferedContent = useFileEditStore((s) =>
    path ? (s.buffers.get(path) ?? null) : null,
  );

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const editorRef = useRef<Editor<'file', unknown> | null>(null);

  const activePathRef = useRef(path);
  useEffect(() => {
    activePathRef.current = path;
  }, [path]);

  // Per-path markdown preview mode. Defaults to true (preview) for any .md.
  const previewModeRef = useRef(new Map<string, boolean>());

  const wrapText = useFileViewerStore((s) => s.wrapText);
  const showLineNumbers = useFileViewerStore((s) => s.showLineNumbers);
  const fontSize = useFileViewerStore((s) => s.fontSize);

  const outerRef = useRef<HTMLDivElement | null>(null);
  const savedScrollTop = useRef(0);
  const lastPathRef = useRef(path);

  useEffect(() => {
    const el = outerRef.current;
    if (!el) return;
    const onScroll = (e: Event) => {
      const t = e.target;
      if (t instanceof HTMLElement) {
        savedScrollTop.current = t.scrollTop;
      }
    };
    el.addEventListener('scroll', onScroll, {
      passive: true,
      capture: true,
    });
    return () => {
      el.removeEventListener('scroll', onScroll, { capture: true });
    };
  }, []);

  useEffect(() => {
    setSaveError(null);
    editorRef.current = null;
  }, [path]);

  useEffect(() => {
    if (!path) return;
    const cache = cacheRef.current;
    if (cache.files.has(path) || cache.errors.has(path)) return;

    let cancelled = false;
    socket
      .read(path)
      .then((result) => {
        if (cancelled) return;
        cache.files.set(path, {
          path,
          content: result.content,
          binary: result.binary,
          truncated: result.truncated,
          size: result.size,
          mtimeMs: result.mtimeMs,
          mimeType: result.mimeType,
        });
        if (result.content != null) {
          setDiskContent(path, result.content);
        }
        forceUpdate();
      })
      .catch((err) => {
        if (cancelled) return;
        cache.errors.set(
          path,
          err instanceof Error ? err.message : 'Failed to read file',
        );
        forceUpdate();
      });

    return () => {
      cancelled = true;
    };
  }, [path, socket, refreshKey, setDiskContent]);

  useEffect(() => {
    return () => {
      if (copyTimeout.current) clearTimeout(copyTimeout.current);
    };
  }, []);

  const file = path ? (cacheRef.current.files.get(path) ?? null) : null;
  const error = path ? (cacheRef.current.errors.get(path) ?? null) : null;
  const isLoading = path != null && file == null && error == null;

  const mediaKind = getMediaKind(file?.mimeType ?? null);
  const isImage = mediaKind === 'image';
  const editable = !!file && !file.binary && !mediaKind && !file.truncated;
  const currentContents = bufferedContent ?? file?.content ?? '';

  const isMarkdown = !!file && isMarkdownFile(file.path);
  const previewMode = isMarkdown
    ? (previewModeRef.current.get(file.path) ?? true)
    : false;

  const togglePreview = useCallback(() => {
    if (!file) return;
    const current = previewModeRef.current.get(file.path) ?? true;
    previewModeRef.current.set(file.path, !current);
    forceUpdate();
  }, [file]);

  const isDirty = useIsDirty(path);

  const mediaUrl = useMemo<{ url: string; isBlob: boolean } | null>(() => {
    if (!file || !mediaKind) return null;

    if (getFileUrl) {
      return { url: getFileUrl(file.path), isBlob: false };
    }

    if (!file.content || !file.mimeType || file.truncated) return null;
    return {
      url: URL.createObjectURL(base64ToBlob(file.content, file.mimeType)),
      isBlob: true,
    };
  }, [file, mediaKind, getFileUrl]);

  useEffect(() => {
    if (mediaUrl?.isBlob) URL.revokeObjectURL(mediaUrl.url);
  }, [mediaUrl]);

  const copyContent = useCallback(async () => {
    if (!file?.content) return;
    try {
      await navigator.clipboard.writeText(currentContents);
      setCopied(true);
      if (copyTimeout.current) clearTimeout(copyTimeout.current);
      copyTimeout.current = setTimeout(() => {
        setCopied(false);
        copyTimeout.current = null;
      }, 2000);
    } catch {
      /* clipboard permission denied */
    }
  }, [file, currentContents]);

  const refreshFile = useCallback(() => {
    if (!path) return;
    cacheRef.current.files.delete(path);
    cacheRef.current.errors.delete(path);
    clearBuffer(path);
    setSaveError(null);
    setRefreshKey((k) => k + 1);
  }, [path, clearBuffer]);

  const editorOptions = useMemo<FileEditorOptions>(
    () => ({
      onAttach(editor) {
        editorRef.current = editor;
      },
    }),
    [],
  );

  const handleEditChange = useCallback(
    (event: FileEditorChangeEvent) => {
      const p = activePathRef.current;
      if (!p) return;
      setBuffer(p, event.file.contents);
    },
    [setBuffer],
  );

  const save = useCallback(async () => {
    const p = path;
    if (!p) return;

    const buffer = useFileEditStore.getState().buffers.get(p);
    if (buffer == null) return;

    setSaving(true);
    setSaveError(null);

    let contents = buffer;
    if (activePathRef.current === p) {
      try {
        const live = editorRef.current?.getFile();
        if (live && typeof live.contents === 'string') {
          contents = live.contents;
        }
      } catch {
        /* editor not attached — use state */
      }
    }

    try {
      await socket.writeFile(p, contents);

      const cached = cacheRef.current.files.get(p);
      if (cached) {
        cacheRef.current.files.set(p, {
          ...cached,
          content: contents,
          size: contents.length,
          mtimeMs: Date.now(),
        });
      }

      setDiskContent(p, contents);
      clearBuffer(p);
      forceUpdate();
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }, [path, socket, setDiskContent, clearBuffer]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey) || e.key.toLowerCase() !== 's') return;
      if (!isDirty) return;
      e.preventDefault();
      void save();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isDirty, save]);

  const viewerKey = file
    ? `${file.path}:${resolvedTheme}:${file.mtimeMs}:${refreshKey}`
    : '';
  const layoutKey = file ? `${fontSize}:${showLineNumbers ? 'n' : ''}` : '';
  const renderKey = `${viewerKey}:${layoutKey}:${wrapText ? 'wrap' : 'scroll'}`;

  useLayoutEffect(() => {
    const el = outerRef.current;
    if (!el) return;

    const pathChanged = lastPathRef.current !== path;
    lastPathRef.current = path;
    if (pathChanged) savedScrollTop.current = 0;

    if (savedScrollTop.current <= 0) return;

    const nodes = el.querySelectorAll<HTMLElement>('*');
    for (const node of nodes) {
      if (node.scrollHeight > node.clientHeight + 1) {
        node.scrollTop = savedScrollTop.current;
        return;
      }
    }
  }, [path, renderKey]);

  if (!path) {
    return (
      <div className='text-muted flex h-full min-h-0 min-w-0 flex-1 items-center justify-center p-4 text-center text-sm @max-sm:break-all'>
        Select a file to view its contents.
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className='text-muted flex h-full min-h-0 min-w-0 flex-1 items-center justify-center p-4 text-center text-sm @max-sm:break-all'>
        Loading…
      </div>
    );
  }

  if (error) {
    return (
      <div className='text-danger flex h-full min-h-0 min-w-0 flex-1 items-center justify-center p-4 text-center text-sm @max-sm:break-all'>
        {error}
      </div>
    );
  }

  if (!file) return null;

  const fileName = getFileName(file.path);

  return (
    <div className='flex h-full min-h-0 min-w-0 flex-1 basis-0 flex-col overflow-hidden'>
      <FileToolbar
        filePath={file.path}
        fileName={fileName}
        isDirty={isDirty}
        saving={saving}
        copied={copied}
        editable={editable}
        showViewerControls={!file.binary && !mediaKind}
        isMarkdown={isMarkdown}
        previewMode={previewMode}
        isImage={isImage}
        onTogglePreview={togglePreview}
        onCopy={() => void copyContent()}
        onSave={() => void save()}
        onRefresh={refreshFile}
      />

      {saveError && (
        <div className='border-separator text-danger border-b px-3 py-1.5 text-xs'>
          {saveError}
        </div>
      )}

      <div
        ref={outerRef}
        className='min-h-0 min-w-0 flex-1 basis-0 overflow-hidden'
      >
        <FileViewer
          file={file}
          fileName={fileName}
          mediaKind={mediaKind}
          mediaUrl={mediaUrl?.url ?? null}
          editable={editable}
          currentContents={currentContents}
          isMarkdown={isMarkdown}
          previewMode={previewMode}
          viewerKey={viewerKey}
          layoutKey={layoutKey}
          renderKey={renderKey}
          editorOptions={editorOptions}
          onEditChange={handleEditChange}
          getFileUrl={getFileUrl}
          onOpenFile={onOpenFile}
        />
      </div>
    </div>
  );
});
