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
import {
  useFileVersion,
  usePendingWrites,
} from '@/app/components/chat-aside/files/file-invalidation-store';
import { FileToolbar } from '@/app/components/chat-aside/files/file-toolbar';
import { FileViewer } from '@/app/components/chat-aside/files/file-viewer';
import {
  useActivePath,
  useFileViewerStore,
} from '@/app/components/chat-aside/files/file-viewer-store';
import { FsSocket } from '@/app/components/chat-aside/files/fs-socket';
import {
  type CachedFile,
  type FileEditorChangeEvent,
  type FileEditorOptions,
} from '@/app/components/chat-aside/files/pierre-editor-view';
import { useI18n } from '@/app/hooks/i18n';
import { useTheme } from '@/app/providers';

export interface FileContentPaneProps {
  socket: FsSocket;
  path?: string | null;
  getFileUrl?: (path: string) => string;
  onOpenFile?: (path: string) => void;
}

const MARKDOWN_RE = /\.(md|markdown|mdx)$/i;

function isMarkdownFile(filePath: string): boolean {
  return MARKDOWN_RE.test(filePath);
}

// The editor's scrollable surface. `data-file-scroll-root` marks surfaces the
// viewer owns directly (wrap mode, markdown); `data-file-scroll-region > *`
// catches the Pierre virtualizer, which does not forward arbitrary props to
// its scroll container.
const SCROLL_ROOT_SELECTOR =
  '[data-file-scroll-root], [data-file-scroll-region] > *';

function resolveScrollRoot(container: HTMLElement): HTMLElement | null {
  return container.querySelector<HTMLElement>(SCROLL_ROOT_SELECTOR);
}

export const FileContentPane = memo(function FileContentPane({
  socket,
  path: pathProp,
  getFileUrl,
  onOpenFile: onOpenFileProp,
}: FileContentPaneProps) {
  const { resolvedTheme } = useTheme();
  const { t } = useI18n();

  const storePath = useActivePath();
  const storeOpenFile = useFileViewerStore((s) => s.openFile);

  const path = pathProp !== undefined ? pathProp : storePath;
  const onOpenFile = onOpenFileProp ?? storeOpenFile;

  const cacheRef = useRef<{
    files: Map<string, CachedFile>;
    errors: Map<string, string>;
  }>({ files: new Map(), errors: new Map() });

  // Tracks which version each path was last read at, so a version bump
  // evicts the cache exactly once instead of on every render.
  const lastVersionRef = useRef(new Map<string, number>());

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

  const previewModeRef = useRef(new Map<string, boolean>());

  const wrapText = useFileViewerStore((s) => s.wrapText);
  const showLineNumbers = useFileViewerStore((s) => s.showLineNumbers);
  const fontSize = useFileViewerStore((s) => s.fontSize);

  const outerRef = useRef<HTMLDivElement | null>(null);
  // Last known scroll offset per path, so switching tabs and coming back
  // restores where the user was instead of jumping to the top. Lives in a ref
  // (not the persisted viewer store) because it's session-scoped.
  const scrollTopByPath = useRef(new Map<string, number>());

  // The scrolling element only exists in the loaded/rendered branch, and the
  // pane first mounts with no active path (or while loading), so a plain
  // mount-time effect would attach to a null ref and never re-run. A callback
  // ref attaches whenever the container actually enters the tree.
  const scrollCleanupRef = useRef<(() => void) | null>(null);
  const attachOuter = useCallback((node: HTMLDivElement | null) => {
    scrollCleanupRef.current?.();
    scrollCleanupRef.current = null;
    outerRef.current = node;
    if (!node) return;

    const onScroll = (e: Event) => {
      const target = e.target;
      if (!(target instanceof HTMLElement)) return;
      if (!target.matches(SCROLL_ROOT_SELECTOR)) return;
      const current = activePathRef.current;
      if (!current) return;
      scrollTopByPath.current.set(current, target.scrollTop);
    };

    node.addEventListener('scroll', onScroll, { passive: true, capture: true });
    scrollCleanupRef.current = () => {
      node.removeEventListener('scroll', onScroll, { capture: true });
    };
  }, []);

  useEffect(() => () => scrollCleanupRef.current?.(), []);

  useEffect(() => {
    setSaveError(null);
    editorRef.current = null;
  }, [path]);

  // ── Invalidation subscriptions ─────────────────────────────────────
  //
  // `fileVersion` bumps whenever the file's on-disk contents may have
  // changed. `pendingWrites` is > 0 while a write is in flight — reading
  // during that window races the write and caches a bogus ENOENT, so we
  // hold off and show the loading state instead.

  const fileVersion = useFileVersion(path);
  const pendingWrites = usePendingWrites(path);

  useEffect(() => {
    if (!path) return;
    const cache = cacheRef.current;

    // Evict stale entries first. A version bump means whatever is cached for
    // this path is from a previous life — this includes errors. Doing this
    // before the pending-write gate means a fresh create evicts the prior
    // create's cached ENOENT instead of showing it while the write is armed.
    const lastVersion = lastVersionRef.current.get(path);
    if (fileVersion !== (lastVersion ?? -1)) {
      cache.files.delete(path);
      cache.errors.delete(path);
      lastVersionRef.current.set(path, fileVersion);
    }

    if (pendingWrites > 0) return;
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
        lastVersionRef.current.set(path, fileVersion);
        forceUpdate();
      })
      .catch((err) => {
        if (cancelled) return;
        cache.errors.set(
          path,
          err instanceof Error ? err.message : t.fileExplorer.failedToReadFile,
        );
        lastVersionRef.current.set(path, fileVersion);
        forceUpdate();
      });

    return () => {
      cancelled = true;
    };
  }, [path, socket, refreshKey, setDiskContent, fileVersion, pendingWrites, t]);

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
        });
      }

      setDiskContent(p, contents);
      clearBuffer(p);
      forceUpdate();
    } catch (err) {
      setSaveError(
        err instanceof Error ? err.message : t.fileExplorer.saveFailed,
      );
    } finally {
      setSaving(false);
    }
  }, [path, socket, setDiskContent, clearBuffer, t]);

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
    if (!el || !path) return;

    const saved = scrollTopByPath.current.get(path);
    if (saved == null || saved <= 0) return;

    let raf = 0;
    let attempts = 0;

    // Content can mount before it is tall enough to reach `saved`, in which
    // case the browser clamps `scrollTop` to the current max. Retry across a
    // few frames and stop as soon as the offset sticks.
    const restore = () => {
      const root = resolveScrollRoot(el);
      if (root) {
        root.scrollTop = saved;
        if (root.scrollTop === saved) return;
      }
      if (attempts < 10) {
        attempts += 1;
        raf = requestAnimationFrame(restore);
      }
    };

    restore();
    return () => {
      if (raf) cancelAnimationFrame(raf);
    };
  }, [path, renderKey]);

  if (!path) {
    return (
      <div className='text-muted flex h-full min-h-0 min-w-0 flex-1 items-center justify-center p-4 text-center text-sm @max-sm:break-all'>
        {t.fileExplorer.selectFileToView}
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className='text-muted flex h-full min-h-0 min-w-0 flex-1 items-center justify-center p-4 text-center text-sm @max-sm:break-all'>
        {t.common.loadingEllipsis}
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
        ref={attachOuter}
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
          getFileUrl={getFileUrl}
          onOpenFile={onOpenFile}
          onEditChange={handleEditChange}
        />
      </div>
    </div>
  );
});
