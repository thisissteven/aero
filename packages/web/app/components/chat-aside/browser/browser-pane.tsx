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

import { toast } from '@aero/ui';

import { honoClient } from '@/app/lib';

import { useBrowserActions, useBrowserTab } from './browser-store';

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
  bounds: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

interface PreviewBridgeMessage {
  source: string;
  version: number;
  type: 'ready' | 'hover' | 'select' | 'navigate-preview' | 'history-state';
  url?: string;
  title?: string;
  target?: unknown;
  canGoBack?: boolean;
  canGoForward?: boolean;
}

function isPreviewElementMetadata(
  value: unknown,
): value is PreviewElementMetadata {
  return (
    !!value &&
    typeof value === 'object' &&
    typeof (value as any).tag === 'string' &&
    typeof (value as any).selector === 'string' &&
    !!(value as any).bounds &&
    typeof (value as any).bounds.x === 'number' &&
    typeof (value as any).bounds.y === 'number' &&
    typeof (value as any).bounds.width === 'number' &&
    typeof (value as any).bounds.height === 'number'
  );
}

function getBrowserProxyTargetKey(url: string): string {
  try {
    const parsed = new URL(url);

    if (parsed.protocol === 'file:') {
      return `file:${parsed.href}`;
    }

    return `${parsed.origin}${parsed.pathname}`;
  } catch {
    return url;
  }
}

interface CachedProxyTarget {
  previewOrigin: string;
  expiresAt: number;
}

const previewProxyTargetCache = new Map<string, CachedProxyTarget>();

function getCachedProxyTarget(key: string): CachedProxyTarget | null {
  const cached = previewProxyTargetCache.get(key);

  if (!cached) {
    return null;
  }

  if (Date.now() > cached.expiresAt - 5000) {
    previewProxyTargetCache.delete(key);
    return null;
  }

  return cached;
}

function normalizeBrowserUrl(input: string): string {
  const trimmed = input.trim();

  if (!trimmed) {
    return 'about:blank';
  }

  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed)) {
    return trimmed;
  }

  if (/^(about|chrome|edge|javascript|mailto):/i.test(trimmed)) {
    return trimmed;
  }

  /*
   * Windows absolute path:
   *
   * C:\Users\Steven\file.html
   */
  if (/^[a-zA-Z]:[\\/]/.test(trimmed)) {
    const normalizedPath = trimmed.replace(/\\/g, '/');

    return encodeURI(`file:///${normalizedPath}`);
  }

  /*
   * Windows UNC:
   *
   * \\server\share\file.html
   */
  if (/^\\\\/.test(trimmed)) {
    const normalizedPath = trimmed.replace(/\\/g, '/');

    return encodeURI(`file:${normalizedPath}`);
  }

  /*
   * Unix absolute path.
   */
  if (/^\//.test(trimmed)) {
    return encodeURI(`file://${trimmed}`);
  }

  /*
   * Localhost.
   */
  if (
    /^(localhost|127\.0\.0\.1|\[::1\]|0\.0\.0\.0)(:\d+)?(?:\/.*)?$/i.test(
      trimmed,
    )
  ) {
    return `http://${trimmed}`;
  }

  /*
   * IPv6.
   */
  if (/^\[[a-f0-9:]+\](?::\d+)?(?:\/.*)?$/i.test(trimmed)) {
    return `https://${trimmed}`;
  }

  /*
   * Domain / IPv4.
   */
  if (
    /^([\w-]+(?:\.[\w-]+)+|\d{1,3}(?:\.\d{1,3}){3})(?::\d+)?(?:\/.*)?$/i.test(
      trimmed,
    )
  ) {
    return `https://${trimmed}`;
  }

  /*
   * Relative/local paths.
   */
  if (
    /^\.{0,2}[\\/]/.test(trimmed) ||
    /^[^\\/:*?"<>|]+(?:[\\/][^\\/:*?"<>|]+)*$/.test(trimmed)
  ) {
    return encodeURI(`file://${trimmed.replace(/\\/g, '/')}`);
  }

  return `https://www.google.com/search?q=${encodeURIComponent(trimmed)}`;
}

function formatAgentationContext(pageUrl: string, target: any): string {
  const lines = [
    `Element from ${pageUrl}`,
    `- Selector: \`${target.selector}\``,
    `- Tag: <${target.tag}${target.id ? ` id="${target.id}"` : ''}>`,
  ];

  if (target.classes?.length) {
    lines.push(`- Classes: ${target.classes.join(' ')}`);
  }

  if (target.text) {
    lines.push(`- Text: "${target.text}"`);
  }

  return lines.join('\n');
}

export function BrowserPane({
  tabId,
  active,
  onAttachToChat,
}: BrowserPaneProps) {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);

  const tab = useBrowserTab(tabId);

  const {
    setDraftUrl,
    navigate,
    syncNavigation,
    reload,
    setLoading,
    setProxyState,
    setInspecting,
    setHoverTarget,
    updateTab,
    setIframeHistoryState,
  } = useBrowserActions();

  const [iframeSrc, setIframeSrc] = useState('');

  const iframeNavigationRef = useRef(false);

  /*
   * ----------------------------------------------------------
   * Create/reuse preview target
   * ----------------------------------------------------------
   */

  useEffect(() => {
    if (!tab?.loadedUrl) {
      setProxyState(tabId, {
        status: 'idle',
      });

      return;
    }

    const key = getBrowserProxyTargetKey(tab.loadedUrl);

    const cached = getCachedProxyTarget(key);

    if (cached) {
      setProxyState(tabId, {
        status: 'ready',
        ...cached,
      });

      return;
    }

    let cancelled = false;

    setProxyState(tabId, {
      status: 'loading',
    });

    setLoading(tabId, true);

    void (async () => {
      try {
        const response = await honoClient.api.preview.targets.$post({
          json: {
            url: tab.loadedUrl,
          },
        });

        if (!response.ok) {
          const body = await response.json().catch(() => ({}) as any);

          const message =
            typeof body?.error === 'string'
              ? body.error
              : `HTTP ${response.status}`;

          if (!cancelled) {
            setProxyState(tabId, {
              status: 'error',
              message,
            });
          }

          return;
        }

        const body = (await response.json()) as {
          previewOrigin: string;
          expiresAt: number;
        };

        const cacheEntry: CachedProxyTarget = {
          previewOrigin: body.previewOrigin,
          expiresAt: body.expiresAt,
        };

        previewProxyTargetCache.set(key, cacheEntry);

        if (!cancelled) {
          setProxyState(tabId, {
            status: 'ready',
            ...cacheEntry,
          });
        }
      } catch (error) {
        if (!cancelled) {
          setProxyState(tabId, {
            status: 'error',
            message: error instanceof Error ? error.message : String(error),
          });
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [tabId, tab?.loadedUrl, setLoading, setProxyState]);

  /*
   * ----------------------------------------------------------
   * Build iframe source
   * ----------------------------------------------------------
   *
   * HTTP pages:
   *
   *   previewOrigin + upstream pathname
   *
   * Local files:
   *
   *   previewOrigin + local filename/path
   *
   * The server's local target root is the directory
   * containing the original file.
   */

  useEffect(() => {
    if (!tab || tab.proxyState.status !== 'ready') {
      return;
    }

    const url = tab.currentUrl || tab.loadedUrl;

    if (!url) {
      setIframeSrc('');
      return;
    }

    try {
      const parsed = new URL(url);

      const previewOrigin = tab.proxyState.previewOrigin.replace(/\/+$/, '');

      let nextSrc: string;

      if (parsed.protocol === 'file:') {
        const filePath = decodeURIComponent(parsed.pathname);

        const fileName = filePath.split('/').pop() || '';

        nextSrc = `${previewOrigin}/${encodeURIComponent(
          fileName,
        )}${parsed.search}${parsed.hash}`;
      } else {
        nextSrc = `${previewOrigin}${
          parsed.pathname || '/'
        }${parsed.search}${parsed.hash}`;
      }

      iframeNavigationRef.current = true;

      setIframeSrc(nextSrc);
    } catch {
      setIframeSrc('');
    }
  }, [
    tab?.loadedUrl,
    tab?.proxyState.status,
    tab?.proxyState.status === 'ready' ? tab.proxyState.previewOrigin : '',
    tab?.reloadNonce,
  ]);

  const isProxied = tab?.proxyState.status === 'ready';

  /*
   * ----------------------------------------------------------
   * Preview URL -> original URL
   * ----------------------------------------------------------
   */

  const getCurrentUrlFromFrameUrl = useCallback(
    (frameUrl: string): string => {
      if (!frameUrl || !tab?.loadedUrl || tab.proxyState.status !== 'ready') {
        return '';
      }

      try {
        const frame = new URL(frameUrl);

        const preview = new URL(tab.proxyState.previewOrigin);

        const upstream = new URL(tab.loadedUrl);

        if (frame.origin !== preview.origin) {
          return '';
        }

        /*
         * Local file preview.
         *
         * Preview root:
         *
         *   C:\foo\bar.html
         *   -> C:\foo\
         *
         * So:
         *
         *   /bar.html
         *   -> file:///C:/foo/bar.html
         *
         * and:
         *
         *   /pages/about.html
         *   -> file:///C:/foo/pages/about.html
         */
        if (upstream.protocol === 'file:') {
          const originalPath = decodeURIComponent(upstream.pathname);

          const lastSlash = originalPath.lastIndexOf('/');

          const originalDirectory =
            lastSlash >= 0 ? originalPath.slice(0, lastSlash + 1) : '/';

          const previewPath = decodeURIComponent(frame.pathname).replace(
            /^\/+/,
            '',
          );

          const nextPath = `${originalDirectory}${previewPath}`;

          const nextUrl = new URL(upstream.toString());

          nextUrl.pathname = nextPath;

          nextUrl.search = frame.search;

          nextUrl.hash = frame.hash;

          return nextUrl.toString();
        }

        /*
         * HTTP/HTTPS preview.
         */
        return new URL(
          `${frame.pathname}${frame.search}${frame.hash}`,
          upstream.origin,
        ).toString();
      } catch {
        return '';
      }
    },
    [tab?.loadedUrl, tab?.proxyState],
  );

  const goBackInFrame = useCallback(() => {
    iframeRef.current?.contentWindow?.postMessage(
      {
        source: 'aero-preview-parent',
        version: 1,
        type: 'history-back',
      },
      '*',
    );
  }, []);

  const goForwardInFrame = useCallback(() => {
    iframeRef.current?.contentWindow?.postMessage(
      {
        source: 'aero-preview-parent',
        version: 1,
        type: 'history-forward',
      },
      '*',
    );
  }, []);

  const postInspectMode = useCallback((enabled: boolean) => {
    iframeRef.current?.contentWindow?.postMessage(
      {
        source: 'aero-preview-parent',
        version: 1,
        type: 'set-inspect-mode',
        enabled,
      },
      '*',
    );
  }, []);

  const attachContext = useCallback(
    (target: any) => {
      if (!tab) {
        return;
      }

      onAttachToChat?.(formatAgentationContext(tab.url, target));
    },
    [tab, onAttachToChat],
  );

  const cancelInspect = useCallback(() => {
    setHoverTarget(tabId, null);

    postInspectMode(false);
  }, [tabId, setHoverTarget, postInspectMode]);

  useEffect(() => {
    if (!tab?.isInspecting) {
      return;
    }

    const handler = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') {
        return;
      }

      event.preventDefault();

      setInspecting(tabId, false);

      cancelInspect();
    };

    window.addEventListener('keydown', handler, true);

    return () => window.removeEventListener('keydown', handler, true);
  }, [tab?.isInspecting, tabId, setInspecting, cancelInspect]);

  useEffect(() => {
    return () => {
      setInspecting(tabId, false);

      setHoverTarget(tabId, null);
    };
  }, [tabId, setInspecting, setHoverTarget]);

  /*
   * ----------------------------------------------------------
   * Bridge messages
   * ----------------------------------------------------------
   */

  useEffect(() => {
    const handler = (event: MessageEvent<PreviewBridgeMessage>) => {
      if (event.source !== iframeRef.current?.contentWindow) {
        return;
      }

      const data = event.data;

      if (
        !data ||
        data.source !== 'aero-preview-bridge' ||
        data.version !== 1
      ) {
        return;
      }

      if (data.type === 'history-state') {
        setIframeHistoryState(tabId, {
          canGoBack: data.canGoBack === true,
          canGoForward: data.canGoForward === true,
        });

        return;
      }

      if (data.type === 'ready' || data.type === 'navigate-preview') {
        const frameUrl = typeof data.url === 'string' ? data.url : '';

        const nextUrl = getCurrentUrlFromFrameUrl(frameUrl);

        if (nextUrl && nextUrl !== tab?.currentUrl) {
          syncNavigation(tabId, nextUrl);
        }

        if (typeof data.title === 'string' && data.title) {
          updateTab(tabId, {
            title: data.title,
          });
        }

        if (data.type === 'ready') {
          setLoading(tabId, false);

          iframeNavigationRef.current = false;
        }

        return;
      }

      if (data.type === 'hover') {
        setHoverTarget(
          tabId,
          isPreviewElementMetadata(data.target) ? data.target : null,
        );

        return;
      }

      if (data.type === 'select' && isPreviewElementMetadata(data.target)) {
        setHoverTarget(tabId, null);

        setInspecting(tabId, false);

        postInspectMode(false);

        if (tab) {
          const context = formatAgentationContext(tab.url, data.target);
          void navigator.clipboard.writeText(context);
          toast.success('Context copied to clipboard');
        }

        attachContext(data.target);
      }
    };

    window.addEventListener('message', handler);

    return () => window.removeEventListener('message', handler);
  }, [
    tabId,
    tab?.currentUrl,
    getCurrentUrlFromFrameUrl,
    syncNavigation,
    setIframeHistoryState,
    updateTab,
    setLoading,
    setHoverTarget,
    setInspecting,
    postInspectMode,
    attachContext,
  ]);

  const handleInspect = () => {
    if (!tab || !isProxied) {
      return;
    }

    if (tab.isInspecting) {
      setInspecting(tabId, false);

      cancelInspect();

      return;
    }

    setHoverTarget(tabId, null);

    setInspecting(tabId, true);

    postInspectMode(true);
  };

  const handleReload = () => {
    if (!tab?.currentUrl) {
      return;
    }

    setLoading(tabId, true);

    reload(tabId);
  };

  const handleSubmit = () => {
    if (!tab) {
      return;
    }

    const normalized = normalizeBrowserUrl(tab.draftUrl);

    const nextUrl = normalized === 'about:blank' ? '' : normalized;

    navigate(tabId, nextUrl);
  };

  if (!tab) {
    return null;
  }

  return (
    <div
      className='absolute inset-0 flex flex-col overflow-hidden'
      style={{
        visibility: active ? 'visible' : 'hidden',
        pointerEvents: active ? 'auto' : 'none',
      }}
    >
      <div className='border-border flex items-center gap-1 border-b px-2 py-1'>
        <IconBtn disabled={!tab.canGoBack} onClick={goBackInFrame} title='Back'>
          <Icon data={ArrowLeft} size={14} />
        </IconBtn>

        <IconBtn
          disabled={!tab.canGoForward}
          onClick={goForwardInFrame}
          title='Forward'
        >
          <Icon data={ArrowRight} size={14} />
        </IconBtn>

        <IconBtn
          disabled={!tab.currentUrl}
          onClick={handleReload}
          title='Reload'
        >
          <Icon data={ArrowsRotateRight} size={14} />
        </IconBtn>

        <form
          className='min-w-0 flex-1'
          onSubmit={(event) => {
            event.preventDefault();
            handleSubmit();
          }}
        >
          <input
            value={tab.draftUrl}
            onChange={(event) => setDraftUrl(tabId, event.target.value)}
            placeholder='Search or enter address'
            className='border-border bg-default h-7 w-full rounded-md border px-2 text-sm outline-none'
          />
        </form>

        <IconBtn
          active={tab.isInspecting}
          disabled={!tab.currentUrl || !isProxied}
          onClick={handleInspect}
          title={
            isProxied ? 'Select an element' : 'Unavailable for un-proxied pages'
          }
        >
          <Icon data={LayoutHeaderCursor} size={14} />
        </IconBtn>

        <IconBtn
          disabled={!tab.currentUrl}
          onClick={() =>
            tab.currentUrl && window.open(tab.currentUrl, '_blank')
          }
          title='Open externally'
        >
          <Icon data={ArrowUpRightFromSquare} size={14} />
        </IconBtn>
      </div>

      <div className='relative min-h-0 flex-1'>
        {iframeSrc ? (
          <div className='absolute inset-0'>
            <iframe
              key={`${iframeSrc}:${tab.reloadNonce}`}
              ref={iframeRef}
              src={iframeSrc}
              title='Browser preview'
              className='absolute inset-0 h-full w-full border-0'
              allow='clipboard-read; clipboard-write; fullscreen'
              onLoad={() => setLoading(tabId, false)}
            />

            {tab.isInspecting && tab.hoverTarget && (
              <div
                className='border-accent bg-accent/15 pointer-events-none absolute rounded-sm border-2'
                style={{
                  left: tab.hoverTarget.bounds.x,
                  top: tab.hoverTarget.bounds.y,
                  width: tab.hoverTarget.bounds.width,
                  height: tab.hoverTarget.bounds.height,
                }}
              >
                <div className='bg-default absolute -top-6 left-0 max-w-64 truncate rounded px-2 py-0.5 text-xs shadow'>
                  {tab.hoverTarget.tag}
                  {tab.hoverTarget.text ? ` · ${tab.hoverTarget.text}` : ''}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className='text-muted flex h-full items-center justify-center text-sm'>
            Enter a URL above to start browsing
          </div>
        )}

        {tab.isLoading && (
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
