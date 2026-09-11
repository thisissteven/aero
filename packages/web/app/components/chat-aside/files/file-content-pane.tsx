import { Text } from '@gravity-ui/icons';
import { Icon } from '@gravity-ui/uikit';
import { File as PierreFile } from '@pierre/diffs/react';
import { useEffect, useMemo, useRef, useState } from 'react';

import { cn } from '@aero/ui';

import { FsSocket } from '@/app/components/chat-aside/files/fs-socket';
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

type MediaKind = 'image' | 'video' | 'audio' | 'pdf' | null;

const PIERRE_THEME_MAP: Partial<
  Record<ColorTheme, string | { light: string; dark: string }>
> = {
  aero: {
    light: 'github-light',
    dark: 'github-dark',
  },
  amoled: {
    light: 'github-light',
    dark: 'github-dark',
  },
  aura: 'aura',
  ayu: {
    light: 'ayu-light',
    dark: 'ayu-dark',
  },
  carbonfox: 'carbonfox',
  catppuccin: {
    light: 'catppuccin-latte',
    dark: 'catppuccin-mocha',
  },
  cursor: {
    light: 'github-light',
    dark: 'github-dark',
  },
  dracula: 'dracula',
  flexoki: {
    light: 'flexoki-light',
    dark: 'flexoki-dark',
  },
  github: {
    light: 'github-light',
    dark: 'github-dark',
  },
  gruvbox: {
    light: 'gruvbox-light-hard',
    dark: 'gruvbox-dark-hard',
  },
  kanagawa: 'kanagawa-lotus',
  monokai: 'monokai',
  nightowl: 'night-owl',
  nord: 'nord',
  rosepine: {
    light: 'rose-pine-dawn',
    dark: 'rose-pine',
  },
  shadesofpurple: 'shades-of-purple',
  solarized: {
    light: 'solarized-light',
    dark: 'solarized-dark',
  },
  tokyonight: {
    light: 'tokyo-night',
    dark: 'tokyo-night-storm',
  },
  vercel: {
    light: 'vercel-light',
    dark: 'vercel-dark',
  },
  vesper: 'vesper',
  vitesse: {
    light: 'vitesse-light',
    dark: 'vitesse-dark',
  },
  zenburn: 'zenburn',
};

function getPierreTheme(
  colorTheme: ColorTheme,
  resolvedTheme: 'light' | 'dark',
): string {
  const mapped = PIERRE_THEME_MAP[colorTheme];

  if (!mapped) {
    return resolvedTheme === 'dark' ? 'pierre-dark' : 'pierre-light';
  }

  return typeof mapped === 'string' ? mapped : mapped[resolvedTheme];
}

function getFileName(path: string): string {
  return path.split(/[\\/]/).pop() || path;
}

function getMediaKind(mimeType: string | null): MediaKind {
  if (!mimeType) return null;
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.startsWith('video/')) return 'video';
  if (mimeType.startsWith('audio/')) return 'audio';
  if (mimeType === 'application/pdf') return 'pdf';
  return null;
}

function base64ToBlob(base64: string, mimeType: string): Blob {
  const binary = atob(base64);
  const buffer = new ArrayBuffer(binary.length);
  const bytes = new Uint8Array(buffer);

  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }

  return new Blob([buffer], { type: mimeType });
}

export function FileContentPane({ socket, path }: FileContentPaneProps) {
  const { resolvedTheme, colorTheme } = useTheme();

  const cache = useRef(new Map<string, CachedFile>());

  const [state, setState] = useState<CachedFile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [wrapText, setWrapText] = useState(false);

  const pierreTheme = useMemo(
    () => getPierreTheme(colorTheme, resolvedTheme),
    [colorTheme, resolvedTheme],
  );

  useEffect(() => {
    setWrapText(false);
  }, [path]);

  useEffect(() => {
    if (!path) {
      setState(null);
      setError(null);
      return;
    }

    const cached = cache.current.get(path);

    if (cached) {
      setError(null);
      setState(cached);
      return;
    }

    let cancelled = false;

    setError(null);

    socket
      .read(path)
      .then((result) => {
        if (cancelled) return;

        const entry: CachedFile = {
          path,
          content: result.content,
          binary: result.binary,
          truncated: result.truncated,
          size: result.size,
          mtimeMs: result.mtimeMs,
          mimeType: result.mimeType,
        };

        cache.current.set(path, entry);
        setError(null);
        setState(entry);
      })
      .catch((err) => {
        if (cancelled) return;

        setError(err instanceof Error ? err.message : 'Failed to read file');
      });

    return () => {
      cancelled = true;
    };
  }, [path, socket]);

  const mediaKind = getMediaKind(state?.mimeType ?? null);

  const mediaUrl = useMemo(() => {
    if (!state?.content || !state.mimeType || !mediaKind || state.truncated) {
      return null;
    }

    return URL.createObjectURL(base64ToBlob(state.content, state.mimeType));
  }, [state, mediaKind]);

  useEffect(() => {
    return () => {
      if (mediaUrl) {
        URL.revokeObjectURL(mediaUrl);
      }
    };
  }, [mediaUrl]);

  if (!path && !state) {
    return (
      <div className='text-muted flex h-full min-h-0 min-w-0 items-center justify-center p-4 text-sm'>
        Select a file to view its contents.
      </div>
    );
  }

  if (!state) {
    return (
      <div className='text-muted flex h-full min-h-0 min-w-0 items-center justify-center p-4 text-sm'>
        Select a file to view its contents.
      </div>
    );
  }

  const displayedPath = state.path;
  const fileName = getFileName(displayedPath);

  return (
    <div className='flex h-full min-h-0 min-w-0 flex-1 basis-0 flex-col overflow-hidden'>
      <div className='bg-background border-separator dark:border-separator/50 sticky top-0 z-10 flex h-10 shrink-0 items-center justify-between border-b px-3 backdrop-blur'>
        <div
          className='text-foreground flex min-w-0 items-center gap-1 truncate text-xs font-medium'
          title={displayedPath}
        >
          <FileTypeIcon filePath={fileName} />
          {fileName}
        </div>

        {!state.binary && !mediaKind && (
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
            onClick={() => setWrapText((value) => !value)}
          >
            <Icon data={Text} size={16} />
          </button>
        )}
      </div>

      <div className='min-h-0 min-w-0 flex-1 basis-0 scrollbar-thin overflow-auto'>
        {error && state.path === path && (
          <div className='text-danger p-4 text-sm'>{error}</div>
        )}

        {!error && mediaKind && mediaUrl && !state.truncated && (
          <MediaPreview kind={mediaKind} src={mediaUrl} fileName={fileName} />
        )}

        {!error && mediaKind && state.truncated && (
          <div className='text-muted flex min-h-full flex-col items-center justify-center gap-2 p-6 text-center text-sm'>
            <span>File is too large to preview.</span>
            <span>{state.size.toLocaleString()} bytes</span>
          </div>
        )}

        {!error && state.binary && !mediaKind && (
          <div className='text-muted flex min-h-full items-center justify-center p-4 text-sm'>
            Binary file not shown ({state.size.toLocaleString()} bytes).
          </div>
        )}

        {!error && !state.binary && !mediaKind && (
          <div className='h-full min-w-max'>
            <PierreFile
              file={{
                name: displayedPath,
                contents: state.content ?? '',
                header: undefined,
              }}
              options={{
                theme: pierreTheme,
                overflow: wrapText ? 'wrap' : 'scroll',
                disableFileHeader: true,
              }}
              className='h-full'
            />
          </div>
        )}
      </div>
    </div>
  );
}

function MediaPreview({
  kind,
  src,
  fileName,
}: {
  kind: Exclude<MediaKind, null>;
  src: string;
  fileName: string;
}) {
  if (kind === 'image') {
    return (
      <div className='flex min-h-full items-start justify-center p-6'>
        <img
          src={src}
          alt={fileName}
          className='h-auto max-w-full object-contain'
        />
      </div>
    );
  }

  if (kind === 'pdf') {
    return (
      <div className='h-full min-h-[600px] w-full'>
        <iframe
          src={src}
          title={fileName}
          className='h-full min-h-[600px] w-full border-0'
        />
      </div>
    );
  }

  if (kind === 'audio') {
    return (
      <div className='flex min-h-full items-start justify-center p-6'>
        <audio
          src={src}
          controls
          preload='metadata'
          className='w-full max-w-2xl'
        />
      </div>
    );
  }

  return (
    <div className='flex min-h-full items-start justify-center p-6'>
      <video
        src={src}
        controls
        preload='metadata'
        className='h-auto max-h-[calc(100vh-6rem)] max-w-full'
      />
    </div>
  );
}
