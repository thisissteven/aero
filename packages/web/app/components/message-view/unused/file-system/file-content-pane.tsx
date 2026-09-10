import { File as PierreFile } from '@pierre/diffs/react';
import { useEffect, useRef, useState } from 'react';

import { FsSocket } from '@/app/components/message-view/unused/file-system/fs-socket';

export interface FileContentPaneProps {
  socket: FsSocket;
  path: string | null;
  /** e.g. 'pierre-dark' / 'pierre-light', or { dark, light } — matches
   * BaseCodeOptions['theme'] from @pierre/diffs. Pass the same theme you
   * used for `themeToTreeStyles` so the sidebar and code pane match. */
  theme?: string | { dark: string; light: string };
}

interface CachedFile {
  content: string | null;
  binary: boolean;
  truncated: boolean;
  size: number;
  mtimeMs: number;
}

export function FileContentPane({ socket, path, theme }: FileContentPaneProps) {
  const cache = useRef(new Map<string, CachedFile>());
  const [state, setState] = useState<CachedFile | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!path) {
      setState(null);
      setError(null);
      return;
    }

    const cached = cache.current.get(path);
    if (cached) {
      setState(cached);
      setError(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);
    socket
      .read(path)
      .then((result) => {
        if (cancelled) return;
        const entry: CachedFile = {
          content: result.content,
          binary: result.binary,
          truncated: result.truncated,
          size: result.size,
          mtimeMs: result.mtimeMs,
        };
        cache.current.set(path, entry);
        setState(entry);
      })
      .catch((err) => {
        if (!cancelled)
          setError(err instanceof Error ? err.message : 'Failed to read file');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [path, socket]);

  if (!path) {
    return (
      <div style={{ padding: 16, opacity: 0.6 }}>
        Select a file to view its contents.
      </div>
    );
  }
  if (loading) {
    return <div style={{ padding: 16, opacity: 0.6 }}>Loading {path}…</div>;
  }
  if (error) {
    return (
      <div style={{ padding: 16, color: 'var(--danger, #d33)' }}>{error}</div>
    );
  }
  if (!state) return null;
  if (state.binary) {
    return (
      <div style={{ padding: 16, opacity: 0.6 }}>
        Binary file not shown ({state.size.toLocaleString()} bytes).
      </div>
    );
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {state.truncated && (
        <div style={{ padding: '4px 8px', fontSize: 12, opacity: 0.7 }}>
          File truncated — showing the first {state.size.toLocaleString()}{' '}
          bytes.
        </div>
      )}
      <div style={{ flex: 1, minHeight: 0 }}>
        <PierreFile
          file={{ name: path, contents: state.content ?? '' }}
          options={{ theme }}
        />
      </div>
    </div>
  );
}
