'use client';

import { cn } from '@aero/ui';
import { Hashtag } from '@gravity-ui/icons';
import { File as PierreFile, Virtualizer } from '@pierre/diffs/react';
import { IconWordWrap } from '@pierre/icons';
import type { CSSProperties } from 'react';
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
  base64ToBlob,
  getFileName,
  getMediaKind,
} from '@/app/components/chat-aside/files/file-helpers';
import { useFileViewerStore } from '@/app/components/chat-aside/files/file-viewer-store';
import { FsSocket } from '@/app/components/chat-aside/files/fs-socket';
import { MediaPreview } from '@/app/components/chat-aside/files/media-preview';
import { RefreshButton } from '@/app/components/chat-aside/files/refresh-button';
import { FileTypeIcon } from '@/app/components/file-type-icon';
import { ColorTheme, useTheme } from '@/app/providers';

export interface FileContentPaneProps {
  socket: FsSocket;
  path: string | null;
}

interface CachedFile {
  path: string;
  content: string | null;
  binary: boolean;
  truncated: boolean;
  size: number;
  mtimeMs: number;
  mimeType: string | null;
}

const PIERRE_THEME_MAP: Partial<
  Record<ColorTheme, string | { light: string; dark: string }>
> = {
  aero: { light: 'github-light', dark: 'github-dark' },
  amoled: { light: 'github-light', dark: 'github-dark' },
  aura: 'aura',
  ayu: { light: 'ayu-light', dark: 'ayu-dark' },
  carbonfox: 'carbonfox',
  catppuccin: { light: 'catppuccin-latte', dark: 'catppuccin-mocha' },
  cursor: { light: 'github-light', dark: 'github-dark' },
  dracula: 'dracula',
  flexoki: { light: 'flexoki-light', dark: 'flexoki-dark' },
  github: { light: 'github-light', dark: 'github-dark' },
  gruvbox: { light: 'gruvbox-light-hard', dark: 'gruvbox-dark-hard' },
  kanagawa: 'kanagawa-lotus',
  monokai: 'monokai',
  nightowl: 'night-owl',
  nord: 'nord',
  rosepine: { light: 'rose-pine-dawn', dark: 'rose-pine' },
  shadesofpurple: 'shades-of-purple',
  solarized: { light: 'solarized-light', dark: 'solarized-dark' },
  tokyonight: { light: 'tokyo-night', dark: 'tokyo-night-storm' },
  vercel: { light: 'vercel-light', dark: 'vercel-dark' },
  vesper: 'vesper',
  vitesse: { light: 'vitesse-light', dark: 'vitesse-dark' },
  zenburn: 'zenburn',
};

type PierreThemeValue = { dark: string; light: string };

function getPierreTheme(
  colorTheme: ColorTheme,
  resolvedTheme: 'light' | 'dark',
): PierreThemeValue {
  const mapped = PIERRE_THEME_MAP[colorTheme];
  if (!mapped) {
    return { dark: 'pierre-dark', light: 'pierre-light' };
  }
  if (typeof mapped === 'string') {
    return { dark: mapped, light: mapped };
  }
  return { dark: mapped.dark, light: mapped.light };
}

function getPierreShadowCss(fontSize: number): string {
  return `
:host {
  --diffs-dark-bg: transparent !important;
  --diffs-light-bg: transparent !important;
  --diffs-font-family: var(--font-mono, ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace);
  --diffs-font-size: ${fontSize}px;
  --diffs-line-height: 1.65;
}

[data-gutter],
[data-column-number] {
  background-color: color-mix(in oklab, var(--surface) 30%, transparent) !important;
  backdrop-filter: blur(4px) !important;
  -webkit-backdrop-filter: blur(4px) !important;
}

[data-code] {
  padding-top: 0 !important;
  padding-bottom: 0 !important;
}

[data-gutter-buffer] {
  opacity: 0.4 !important;
}

* {
  scrollbar-width: thin;
  scrollbar-color: color-mix(in oklab, currentColor 15%, transparent) transparent;
}

*::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}

*::-webkit-scrollbar-track {
  background: transparent;
}

*::-webkit-scrollbar-thumb {
  background-color: color-mix(in oklab, currentColor 15%, transparent);
  border-radius: 9999px;
}

*::-webkit-scrollbar-thumb:hover {
  background-color: color-mix(in oklab, currentColor 30%, transparent);
}
`;
}

const PIERRE_FILE_STYLE: CSSProperties = {
  flex: '1 1 auto',
  minWidth: '100%',
  minHeight: '100%',
  background: 'transparent',
};

function CopyIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      fill='none'
      height='16'
      viewBox='0 0 16 16'
      width='16'
      xmlns='http://www.w3.org/2000/svg'
      {...props}
    >
      <path
        clipRule='evenodd'
        d='M12 2.5H8A1.5 1.5 0 0 0 6.5 4v1H8a3 3 0 0 1 3 3v1.5h1A1.5 1.5 0 0 0 13.5 8V4A1.5 1.5 0 0 0 12 2.5M11 11h1a3 3 0 0 0 3-3V4a3 3 0 0 0-3-3H8a3 3 0 0 0-3 3v1H4a3 3 0 0 0-3 3v4a3 3 0 0 0 3 3h4a3 3 0 0 0 3-3zM4 6.5h4A1.5 1.5 0 0 1 9.5 8v4A1.5 1.5 0 0 1 8 13.5H4A1.5 1.5 0 0 1 2.5 12V8A1.5 1.5 0 0 1 4 6.5'
        fill='currentColor'
        fillRule='evenodd'
      />
    </svg>
  );
}

function CheckIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      fill='none'
      height='16'
      viewBox='0 0 16 16'
      width='16'
      xmlns='http://www.w3.org/2000/svg'
      {...props}
    >
      <path
        clipRule='evenodd'
        d='M13.488 3.43a.75.75 0 0 1 .081 1.058l-6 7a.75.75 0 0 1-1.1.042l-3.5-3.5A.75.75 0 0 1 4.03 6.97l2.928 2.927 5.473-6.385a.75.75 0 0 1 1.057-.081'
        fill='currentColor'
        fillRule='evenodd'
      />
    </svg>
  );
}

function ToolbarButton({
  label,
  active,
  onClick,
  children,
}: {
  label: string;
  active?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type='button'
      aria-label={label}
      aria-pressed={active}
      title={label}
      onClick={onClick}
      className={cn(
        'flex h-7 w-7 shrink-0 items-center justify-center rounded-md',
        'text-muted hover:bg-surface-hover hover:text-foreground transition-colors',
        active && 'bg-surface-hover text-foreground',
      )}
    >
      {children}
    </button>
  );
}

export const FileContentPane = memo(function FileContentPane({
  socket,
  path,
}: FileContentPaneProps) {
  const { resolvedTheme, colorTheme } = useTheme();

  const cacheRef = useRef<{
    files: Map<string, CachedFile>;
    errors: Map<string, string>;
  }>({ files: new Map(), errors: new Map() });

  const [, forceUpdate] = useReducer((n: number) => n + 1, 0);

  const [copied, setCopied] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const copyTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Per-user viewer preferences. Persisted to localStorage via zustand so a
  // font-size bump or wrap toggle survives reloads and follows the user
  // across files and sessions. Granular selectors keep re-renders scoped to
  // the value that actually changed.
  const wrapText = useFileViewerStore((s) => s.wrapText);
  const showLineNumbers = useFileViewerStore((s) => s.showLineNumbers);
  const fontSize = useFileViewerStore((s) => s.fontSize);
  const increaseFontSize = useFileViewerStore((s) => s.increaseFontSize);
  const decreaseFontSize = useFileViewerStore((s) => s.decreaseFontSize);
  const toggleWrapText = useFileViewerStore((s) => s.toggleWrapText);
  const toggleLineNumbers = useFileViewerStore((s) => s.toggleLineNumbers);

  // Scroll preservation across PierreFile remounts.
  //
  // The Virtualizer and the plain scroll container both own a scrollable
  // element that changes whenever `renderKey` changes. Before the remount
  // we capture the current scrollTop; after the remount we write it back to
  // whichever descendant is the active scroll container. This is what keeps
  // word-wrap / font-size toggles from jumping to the top.
  const outerRef = useRef<HTMLDivElement | null>(null);
  const savedScrollTop = useRef(0);
  const lastPathRef = useRef(path);

  useEffect(() => {
    const el = outerRef.current;
    if (!el) return;
    // Scroll events don't bubble out of shadow DOM, but the inner scroll
    // container is a regular element here — capture phase guarantees we see
    // it regardless of nesting.
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
  }, [path, socket, refreshKey]);

  useEffect(() => {
    return () => {
      if (copyTimeout.current) clearTimeout(copyTimeout.current);
    };
  }, []);

  const file = path ? (cacheRef.current.files.get(path) ?? null) : null;
  const error = path ? (cacheRef.current.errors.get(path) ?? null) : null;
  const isLoading = path != null && file == null && error == null;

  const pierreTheme = useMemo(
    () => getPierreTheme(colorTheme, resolvedTheme),
    [colorTheme, resolvedTheme],
  );

  const shadowCss = useMemo(() => getPierreShadowCss(fontSize), [fontSize]);

  const mediaKind = getMediaKind(file?.mimeType ?? null);

  const mediaUrl = useMemo(() => {
    if (!file?.content || !file.mimeType || !mediaKind || file.truncated) {
      return null;
    }
    return URL.createObjectURL(base64ToBlob(file.content, file.mimeType));
  }, [file, mediaKind]);

  useEffect(() => {
    return () => {
      if (mediaUrl) URL.revokeObjectURL(mediaUrl);
    };
  }, [mediaUrl]);

  const copyContent = useCallback(async () => {
    if (!file?.content) return;
    try {
      await navigator.clipboard.writeText(file.content);
      setCopied(true);
      if (copyTimeout.current) clearTimeout(copyTimeout.current);
      copyTimeout.current = setTimeout(() => {
        setCopied(false);
        copyTimeout.current = null;
      }, 2000);
    } catch {
      /* clipboard permission denied */
    }
  }, [file]);

  const refreshFile = useCallback(() => {
    if (!path) return;
    cacheRef.current.files.delete(path);
    cacheRef.current.errors.delete(path);
    setRefreshKey((k) => k + 1);
  }, [path]);

  // `viewerKey` is the file identity. `layoutKey` carries every option that
  // affects Pierre's line measurement (font size and line-number gutter).
  // Including it in the PierreFile cacheKey and the Virtualizer key forces a
  // clean prepare+render on every toggle. Without this, Pierre compares a
  // stale prepared layout against the fresh render and throws the
  // "rendered a different file than its prepared layout" error — which also
  // manifested as blank content on short files like `.txt` and `.lock`.
  const viewerKey = file
    ? `${file.path}:${resolvedTheme}:${file.mtimeMs}:${refreshKey}`
    : '';
  const layoutKey = file ? `${fontSize}:${showLineNumbers ? 'n' : ''}` : '';
  const renderKey = `${viewerKey}:${layoutKey}:${wrapText ? 'wrap' : 'scroll'}`;

  // Restore scroll after the remount. Reset on path change so opening a new
  // file starts at the top.
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

  const pierreFile = (
    <PierreFile
      style={PIERRE_FILE_STYLE}
      file={{
        name: file.path,
        contents: file.content ?? '',
        header: undefined,
        cacheKey: `${viewerKey}:${layoutKey}`,
      }}
      options={{
        theme: pierreTheme,
        themeType: resolvedTheme,
        overflow: wrapText ? 'wrap' : 'scroll',
        disableFileHeader: true,
        disableLineNumbers: !showLineNumbers,
        enableLineSelection: true,
        unsafeCSS: shadowCss,
      }}
    />
  );

  return (
    <div className='flex h-full min-h-0 min-w-0 flex-1 basis-0 flex-col overflow-hidden'>
      <div className='border-separator sticky top-0 z-10 flex h-10 shrink-0 items-center justify-between border-b px-3'>
        <div
          className='text-foreground flex min-w-0 items-center gap-1 truncate text-xs font-medium'
          title={file.path}
        >
          <FileTypeIcon filePath={fileName} />
          {fileName}
        </div>

        <div className='flex items-center gap-0.5'>
          {!file.binary && !mediaKind && (
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

              <ToolbarButton
                label={copied ? 'Copied' : 'Copy contents'}
                active={copied}
                onClick={copyContent}
              >
                {copied ? (
                  <CheckIcon className='h-3.5 w-3.5' />
                ) : (
                  <CopyIcon className='h-3.5 w-3.5' />
                )}
              </ToolbarButton>
            </>
          )}

          <RefreshButton label='Reload file' onClick={refreshFile} />
        </div>
      </div>

      <div
        ref={outerRef}
        className='min-h-0 min-w-0 flex-1 basis-0 overflow-hidden'
      >
        {mediaKind && mediaUrl && !file.truncated && (
          <MediaPreview kind={mediaKind} src={mediaUrl} fileName={fileName} />
        )}

        {mediaKind && file.truncated && (
          <div className='text-muted flex min-h-full flex-col items-center justify-center gap-2 p-6 text-center text-sm'>
            <span>File is too large to preview.</span>
            <span>{file.size.toLocaleString()} bytes</span>
          </div>
        )}

        {file.binary && !mediaKind && (
          <div className='text-muted flex min-h-full items-center justify-center p-4 text-sm'>
            Binary file not shown ({file.size.toLocaleString()} bytes).
          </div>
        )}

        {!file.binary && !mediaKind && wrapText && (
          <div key={renderKey} className='scrollbar-thin h-full overflow-auto'>
            {pierreFile}
          </div>
        )}

        {!file.binary && !mediaKind && !wrapText && (
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
        )}
      </div>
    </div>
  );
});
