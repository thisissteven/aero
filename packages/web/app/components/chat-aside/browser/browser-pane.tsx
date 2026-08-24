/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  ArrowLeft,
  ArrowRight,
  ArrowsRotateRight,
  ArrowUpRightFromSquare,
  LayoutHeaderCursor,
} from '@gravity-ui/icons';
import { Icon } from '@gravity-ui/uikit';
import { useCallback, useEffect, useRef, useState } from 'react';

import { honoClient } from '@/app/lib';

import { useBrowserActions } from './browser-store';

interface BrowserPaneProps {
  tabId: string;
  active: boolean;
  onAttachToChat?: (text: string) => void;
}

interface PreviewElementMetadata {
  tag: string;
  id?: string;
  classes: string[];
  text: string;
  selector: string;
  bounds: { x: number; y: number; width: number; height: number };
}

function isPreviewElementMetadata(v: unknown): v is PreviewElementMetadata {
  return (
    !!v &&
    typeof v === 'object' &&
    typeof (v as any).tag === 'string' &&
    typeof (v as any).selector === 'string' &&
    !!(v as any).bounds
  );
}

interface PreviewBridgeMessage {
  source: string;
  version: number;
  type: 'ready' | 'hover' | 'select' | 'navigate-preview';
  url?: string;
  title?: string;
  target?: unknown;
}

type PreviewProxyState =
  | { status: 'idle' }
  | { status: 'loading' }
  | {
      status: 'ready';
      proxyBasePath: string;
      previewToken: string;
      expiresAt: number;
    }
  | { status: 'error'; message: string };

interface CachedProxyTarget {
  proxyBasePath: string;
  previewToken: string;
  expiresAt: number;
}

const previewProxyTargetCache = new Map<string, CachedProxyTarget>();

function getBrowserProxyTargetKey(url: string): string {
  try {
    const parsed = new URL(url);
    return `${parsed.origin}${parsed.pathname}`;
  } catch {
    return url;
  }
}

function getCachedProxyTarget(key: string): CachedProxyTarget | null {
  const cached = previewProxyTargetCache.get(key);
  if (!cached) return null;
  if (Date.now() > cached.expiresAt - 5000) {
    previewProxyTargetCache.delete(key);
    return null;
  }
  return cached;
}

function normalizeBrowserUrl(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) return 'about:blank';

  // 1. Full URI schemes (e.g., https://, http://, file://)
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed)) {
    return trimmed;
  }

  // 2. Special browser/action schemes
  if (/^(about|chrome|edge|javascript|mailto):/i.test(trimmed)) {
    return trimmed;
  }

  // 3. Local network development addresses -> default to HTTP
  const isLocalHost = /^(localhost|127\.0\.0\.1|\[::1\])(:\d+)?(\/.*)?$/i.test(
    trimmed,
  );

  if (isLocalHost) {
    return `http://${trimmed}`;
  }

  // 4. Standard domains and public IPs -> default to HTTPS
  const isIpv6 = /^\[[a-f0-9:]+\](:\d+)?(\/.*)?$/i.test(trimmed);
  const isHostOrDomain =
    /^([\w-]+(\.[\w-]+)+|\d{1,3}(\.\d{1,3}){3})(:\d+)?(\/.*)?$/i.test(trimmed);

  if (isIpv6 || isHostOrDomain) {
    return `https://${trimmed}`;
  }

  // 5. Default fallback to search engine
  return `https://www.google.com/search?q=${encodeURIComponent(trimmed)}`;
}

function stripPreviewQueryParams(url: string): string {
  try {
    const parsed = new URL(url);
    parsed.searchParams.delete('oc_preview_token');
    parsed.searchParams.delete('ocPreview');
    const search = parsed.searchParams.toString();
    return `${parsed.origin}${parsed.pathname}${search ? `?${search}` : ''}${parsed.hash}`;
  } catch {
    return url;
  }
}

function formatAgentationContext(
  pageUrl: string,
  target: PreviewElementMetadata,
): string {
  const lines = [
    `Element from ${pageUrl}`,
    `- Selector: \`${target.selector}\``,
    `- Tag: <${target.tag}>${target.id ? ` id="${target.id}"` : ''}`,
  ];
  if (target.classes.length)
    lines.push(`- Classes: ${target.classes.join(' ')}`);
  if (target.text) lines.push(`- Text: "${target.text}"`);
  return lines.join('\n');
}

export function BrowserPane({
  tabId,
  active,
  onAttachToChat,
}: BrowserPaneProps) {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const { updateTab } = useBrowserActions();

  const [urlInput, setUrlInput] = useState('');
  const [currentUrl, setCurrentUrl] = useState('');
  const [loadedUrl, setLoadedUrl] = useState('');
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [reloadNonce, setReloadNonce] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isInspecting, setIsInspecting] = useState(false);
  const [hoverTarget, setHoverTarget] = useState<PreviewElementMetadata | null>(
    null,
  );
  const [proxyState, setProxyState] = useState<PreviewProxyState>({
    status: 'idle',
  });

  // Track parent origin for postMessage target
  const parentOriginRef = useRef<string>(window.location.origin);

  const applyUrl = useCallback(
    (
      url: string,
      options?: { replaceHistory?: boolean; inFrame?: boolean },
    ) => {
      const normalizedUrl = normalizeBrowserUrl(url);
      const nextUrl = normalizedUrl !== 'about:blank' ? normalizedUrl : '';
      setCurrentUrl(nextUrl);
      setUrlInput(nextUrl);
      if (!options?.inFrame) {
        setLoadedUrl(nextUrl);
        setIsLoading(Boolean(nextUrl));
      } else {
        setIsLoading(false);
      }
      updateTab(tabId, { url: nextUrl, title: nextUrl || 'New Tab' });

      setHistory((current) => {
        if (!nextUrl) {
          setHistoryIndex(-1);
          return [];
        }
        if (options?.replaceHistory) return current;

        const kept =
          historyIndex >= 0 ? current.slice(0, historyIndex + 1) : [];
        if (kept[kept.length - 1] === nextUrl) {
          setHistoryIndex(kept.length - 1);
          return kept;
        }
        const next = [...kept, nextUrl];
        setHistoryIndex(next.length - 1);
        return next;
      });
    },
    [historyIndex, tabId, updateTab],
  );

  const goToHistory = useCallback(
    (nextIndex: number) => {
      const nextUrl = history[nextIndex];
      if (!nextUrl) return;
      setHistoryIndex(nextIndex);
      setCurrentUrl(nextUrl);
      setLoadedUrl(nextUrl);
      setUrlInput(nextUrl);
      setIsLoading(true);
      updateTab(tabId, { url: nextUrl });
    },
    [history, tabId, updateTab],
  );

  const handleReload = useCallback(() => {
    if (!currentUrl) return;
    setIsLoading(true);
    try {
      iframeRef.current?.contentWindow?.location.reload();
    } catch {
      setReloadNonce((n) => n + 1);
    }
  }, [currentUrl]);

  useEffect(() => {
    if (!loadedUrl) {
      setProxyState({ status: 'idle' });
      return;
    }

    const key = getBrowserProxyTargetKey(loadedUrl);
    const cached = getCachedProxyTarget(key);
    if (cached) {
      setProxyState({ status: 'ready', ...cached });
      return;
    }

    let cancelled = false;
    setProxyState({ status: 'loading' });
    setIsLoading(true);

    void (async () => {
      try {
        const response = await honoClient.api.preview.targets.$post({
          json: { url: loadedUrl },
        });

        if (!response.ok) {
          const body = await response.json().catch(() => ({}) as any);
          const message =
            typeof body?.error === 'string'
              ? body.error
              : `HTTP ${response.status}`;
          if (!cancelled) setProxyState({ status: 'error', message });
          return;
        }

        const body = (await response.json()) as {
          proxyBasePath: string;
          previewToken: string;
          expiresAt: number;
        };

        previewProxyTargetCache.set(key, body);
        if (!cancelled) setProxyState({ status: 'ready', ...body });
      } catch (error) {
        if (!cancelled) {
          setProxyState({
            status: 'error',
            message: error instanceof Error ? error.message : String(error),
          });
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [loadedUrl]);

  const iframeSrc =
    proxyState.status === 'ready'
      ? (() => {
          try {
            const parsed = new URL(loadedUrl);
            const search = new URLSearchParams(parsed.search);
            search.set('ocPreview', String(reloadNonce));
            search.set('oc_preview_token', proxyState.previewToken);
            const qs = search.toString();
            return `${proxyState.proxyBasePath}${parsed.pathname}${qs ? `?${qs}` : ''}${parsed.hash}`;
          } catch {
            return '';
          }
        })()
      : proxyState.status === 'error'
        ? loadedUrl
        : '';

  const isProxied = proxyState.status === 'ready';

  const getCurrentUrlFromFrameUrl = useCallback(
    (frameUrl: string): string => {
      if (!frameUrl || !loadedUrl || proxyState.status !== 'ready') return '';
      try {
        const parsedFrame = new URL(frameUrl, window.location.origin);
        const base = proxyState.proxyBasePath.endsWith('/')
          ? proxyState.proxyBasePath.slice(0, -1)
          : proxyState.proxyBasePath;
        if (
          parsedFrame.origin !== window.location.origin ||
          !parsedFrame.pathname.startsWith(base)
        ) {
          return '';
        }
        const rest = parsedFrame.pathname.slice(base.length) || '/';
        const upstreamOrigin = new URL(loadedUrl).origin;
        return stripPreviewQueryParams(
          new URL(
            `${rest}${parsedFrame.search}${parsedFrame.hash}`,
            upstreamOrigin,
          ).toString(),
        );
      } catch {
        return '';
      }
    },
    [loadedUrl, proxyState],
  );

  // Use specific origin for postMessage instead of '*'
  const postInspectMode = useCallback((enabled: boolean) => {
    const targetOrigin = parentOriginRef.current;
    iframeRef.current?.contentWindow?.postMessage(
      {
        source: 'aero-preview-parent',
        version: 1,
        type: 'set-inspect-mode',
        enabled,
      },
      targetOrigin,
    );
  }, []);

  const attachContext = useCallback(
    (target: PreviewElementMetadata) => {
      const context = formatAgentationContext(currentUrl, target);
      onAttachToChat?.(context);
    },
    [currentUrl, onAttachToChat],
  );

  const cancelInspect = useCallback(() => {
    setHoverTarget(null);
    postInspectMode(false);
  }, [postInspectMode]);

  useEffect(() => {
    if (!isInspecting) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      e.preventDefault();
      setIsInspecting(false);
      cancelInspect();
    };
    window.addEventListener('keydown', handler, true);
    return () => window.removeEventListener('keydown', handler, true);
  }, [cancelInspect, isInspecting]);

  useEffect(() => () => cancelInspect(), [cancelInspect]);

  useEffect(() => {
    const handler = (event: MessageEvent<PreviewBridgeMessage>) => {
      if (event.source !== iframeRef.current?.contentWindow) return;
      const data = event.data;
      if (!data || data.source !== 'aero-preview-bridge' || data.version !== 1)
        return;

      if (data.type === 'ready') {
        const frameUrl = typeof data.url === 'string' ? data.url : '';
        const nextUrl = getCurrentUrlFromFrameUrl(frameUrl);
        if (nextUrl && nextUrl !== currentUrl)
          applyUrl(nextUrl, { inFrame: true });
        if (typeof data.title === 'string' && data.title) {
          updateTab(tabId, { title: data.title });
        }
        setIsLoading(false);
        if (isInspecting) postInspectMode(true);
        return;
      }

      if (data.type === 'hover') {
        setHoverTarget(
          isPreviewElementMetadata(data.target) ? data.target : null,
        );
        return;
      }

      if (data.type === 'select' && isPreviewElementMetadata(data.target)) {
        setHoverTarget(null);
        setIsInspecting(false);
        postInspectMode(false);
        attachContext(data.target);
        return;
      }
    };

    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [
    applyUrl,
    attachContext,
    currentUrl,
    getCurrentUrlFromFrameUrl,
    isInspecting,
    postInspectMode,
    tabId,
    updateTab,
  ]);

  // Retry mechanism: if iframe loads but we don't get 'ready', try enabling inspect mode anyway
  useEffect(() => {
    if (!isProxied || !isInspecting) return;
    const timer = setTimeout(() => {
      postInspectMode(true);
    }, 500);
    return () => clearTimeout(timer);
  }, [isProxied, isInspecting, postInspectMode]);

  const handleInspect = () => {
    if (!currentUrl || !isProxied) return;
    if (isInspecting) {
      setIsInspecting(false);
      cancelInspect();
      return;
    }
    setHoverTarget(null);
    setIsInspecting(true);
    postInspectMode(true);
  };

  const handleIframeLoad = () => {
    try {
      const frameUrl = iframeRef.current?.contentWindow?.location.href || '';
      void frameUrl;
    } catch {
      /* cross-origin direct fallback */
    }
    setIsLoading(false);
  };

  return (
    <div
      className='absolute inset-0 flex flex-col overflow-hidden'
      style={{
        visibility: active ? 'visible' : 'hidden',
        pointerEvents: active ? 'auto' : 'none',
      }}
    >
      <div className='border-border flex items-center gap-1 border-b px-2 py-1'>
        <IconBtn
          disabled={historyIndex <= 0}
          onClick={() => goToHistory(historyIndex - 1)}
        >
          <Icon data={ArrowLeft} size={14} />
        </IconBtn>
        <IconBtn
          disabled={historyIndex < 0 || historyIndex >= history.length - 1}
          onClick={() => goToHistory(historyIndex + 1)}
        >
          <Icon data={ArrowRight} size={14} />
        </IconBtn>
        <IconBtn disabled={!currentUrl} onClick={handleReload}>
          <Icon data={ArrowsRotateRight} size={14} />
        </IconBtn>
        <form
          className='min-w-0 flex-1'
          onSubmit={(e) => {
            e.preventDefault();
            applyUrl(urlInput);
          }}
        >
          <input
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            placeholder='Search or enter address'
            className='border-border bg-default h-7 w-full rounded-md border px-2 text-sm outline-none'
          />
        </form>
        <IconBtn
          active={isInspecting}
          disabled={!currentUrl || !isProxied}
          onClick={handleInspect}
          title={
            isProxied ? 'Select an element' : 'Unavailable for un-proxied pages'
          }
        >
          <Icon data={LayoutHeaderCursor} size={14} />
        </IconBtn>
        <IconBtn
          disabled={!currentUrl}
          onClick={() => currentUrl && window.open(currentUrl, '_blank')}
        >
          <Icon data={ArrowUpRightFromSquare} size={14} />
        </IconBtn>
      </div>

      <div className='relative min-h-0 flex-1'>
        {iframeSrc ? (
          <div className='absolute inset-0'>
            <iframe
              key={`${tabId}:${reloadNonce}`}
              ref={iframeRef}
              src={iframeSrc}
              title='Browser preview'
              className='absolute inset-0 h-full w-full border-0'
              allow='clipboard-read; clipboard-write; fullscreen'
              onLoad={handleIframeLoad}
            />
            {isInspecting && hoverTarget && (
              <div
                className='border-accent bg-accent/15 pointer-events-none absolute rounded-sm border-2'
                style={{
                  left: hoverTarget.bounds.x,
                  top: hoverTarget.bounds.y,
                  width: hoverTarget.bounds.width,
                  height: hoverTarget.bounds.height,
                }}
              >
                <div className='bg-default absolute -top-6 left-0 max-w-64 truncate rounded px-2 py-0.5 text-xs shadow'>
                  {hoverTarget.tag}
                  {hoverTarget.text ? ` · ${hoverTarget.text}` : ''}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className='text-muted flex h-full flex-col items-center justify-center gap-2 p-6 text-center text-sm'>
            <span>Enter a URL above to start browsing</span>
            {proxyState.status === 'error' && (
              <span className='text-danger text-xs'>{proxyState.message}</span>
            )}
          </div>
        )}
        {isLoading && (
          <div className='bg-background/70 text-muted absolute inset-0 flex items-center justify-center text-sm'>
            Loading…
          </div>
        )}
      </div>
    </div>
  );
}

function IconBtn({
  children,
  onClick,
  disabled,
  active,
  title,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  active?: boolean;
  title?: string;
}) {
  return (
    <button
      type='button'
      disabled={disabled}
      onClick={onClick}
      title={title}
      className={`flex h-7 w-7 items-center justify-center rounded-md transition disabled:opacity-30 ${
        active ? 'bg-default text-accent-soft-foreground' : 'hover:bg-default'
      }`}
    >
      {children}
    </button>
  );
}
