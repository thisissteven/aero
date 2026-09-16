'use client';

import { cn } from '@aero/ui';
import { Text } from '@gravity-ui/icons';
import { Icon } from '@gravity-ui/uikit';
import { File as PierreFile, Virtualizer } from '@pierre/diffs/react';
import type { CSSProperties } from 'react';
import { memo, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import {
  base64ToBlob,
  getFileName,
  getMediaKind,
} from '@/app/components/chat-aside/files/file-helpers';
import { FsSocket } from '@/app/components/chat-aside/files/fs-socket';
import { MediaPreview } from '@/app/components/chat-aside/files/media-preview';
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

const PIERRE_SHADOW_CSS = `
:host {
  --diffs-dark-bg: transparent !important;
  --diffs-light-bg: transparent !important;
  --diffs-font-family: var(--font-mono, ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace);
  --diffs-font-size: 12.5px;
  --diffs-line-height: 1.65;
}

pre {
  padding-top: 4px !important;
  padding-bottom: 4px !important;
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

const PIERRE_FILE_STYLE: CSSProperties = {
  flex: '1 1 auto',
  minWidth: '100%',
  background: 'transparent',
};

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
  const [wrapText, setWrapText] = useState(false);

  useEffect(() => {
    setWrapText(false);
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
  }, [path, socket]);

  const file = path ? (cacheRef.current.files.get(path) ?? null) : null;
  const error = path ? (cacheRef.current.errors.get(path) ?? null) : null;
  const isLoading = path != null && file == null && error == null;

  const pierreTheme = useMemo(
    () => getPierreTheme(colorTheme, resolvedTheme),
    [colorTheme, resolvedTheme],
  );

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

  if (!path) {
    return (
      <div className='text-muted flex h-full min-h-0 min-w-0 flex-1 items-center justify-center p-4 text-sm @max-sm:break-all text-center'>
        Select a file to view its contents.
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className='text-muted flex h-full min-h-0 min-w-0 flex-1 items-center justify-center p-4 text-sm @max-sm:break-all text-center'>
        Loading…
      </div>
    );
  }

  if (error) {
    return (
      <div className='text-danger flex h-full min-h-0 min-w-0 flex-1 items-center justify-center p-4 text-sm @max-sm:break-all text-center'>
        {error}
      </div>
    );
  }

  if (!file) return null;

  const fileName = getFileName(file.path);
  const viewerKey = `${file.path}:${resolvedTheme}:${file.mtimeMs}`;
  // Remount scope for the Pierre surface. Includes wrap mode because the
  // virtualizer cannot be reused across a scroll↔wrap switch — it prepares
  // a layout for one mode and throws when the other tries to render under it.
  const renderKey = `${viewerKey}:${wrapText ? 'wrap' : 'scroll'}`;

  const pierreFile = (
    <PierreFile
      style={PIERRE_FILE_STYLE}
      file={{
        name: file.path,
        contents: file.content ?? '',
        header: undefined,
        cacheKey: viewerKey,
      }}
      options={{
        theme: pierreTheme,
        themeType: resolvedTheme,
        overflow: wrapText ? 'wrap' : 'scroll',
        disableFileHeader: true,
        unsafeCSS: PIERRE_SHADOW_CSS,
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

        {!file.binary && !mediaKind && (
          <button
            type='button'
            aria-label={
              wrapText ? 'Disable text wrapping' : 'Enable text wrapping'
            }
            aria-pressed={wrapText}
            title={wrapText ? 'Disable text wrapping' : 'Enable text wrapping'}
            className={cn(
              'flex h-7 w-7 shrink-0 items-center justify-center rounded-md',
              'text-muted hover:bg-surface-hover hover:text-foreground transition-colors',
              wrapText && 'bg-surface-hover text-foreground',
            )}
            onClick={() => setWrapText((v) => !v)}
          >
            <Icon data={Text} size={16} />
          </button>
        )}
      </div>

      <div className='min-h-0 min-w-0 flex-1 basis-0'>
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

        {/*
          Two rendering paths, picked by wrap mode:

          - Wrap OFF → Virtualizer. Every line is one row tall, so the
            virtualizer's math is exact and only the visible slice is
            mounted. This is the fast path for large files.

          - Wrap ON  → plain scroll container. Wrapped lines have variable
            heights that the virtualizer cannot predict; letting it try
            triggers "rendered a different file than its prepared layout"
            and breaks scrolling. Non-virtualized wrap is still fine for
            the file sizes that typically need wrapping.

          The wrapper carries `renderKey`, not PierreFile. If the key sat on
          PierreFile, React would remount just the inner component and leave
          a stale Virtualizer parent that prepared for the previous file.
        */}
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
            }}
          >
            {pierreFile}
          </Virtualizer>
        )}
      </div>
    </div>
  );
});
