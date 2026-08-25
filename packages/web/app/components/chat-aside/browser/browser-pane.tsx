/* eslint-disable @typescript-eslint/no-explicit-any */

import {
  ArrowLeft,
  ArrowRight,
  ArrowsRotateRight,
  ArrowUpRightFromSquare,
  LayoutHeaderCursor,
} from '@gravity-ui/icons';
import { Icon } from '@gravity-ui/uikit';
import { useCallback, useEffect, useRef } from 'react';

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
  type: 'ready' | 'hover' | 'select' | 'navigate-preview';
  url?: string;
  title?: string;
  target?: unknown;
}

function isPreviewElementMetadata(
  value: unknown,
): value is PreviewElementMetadata {
  return (
    !!value &&
    typeof value === 'object' &&
    typeof (value as any).tag === 'string' &&
    typeof (value as any).selector === 'string' &&
    !!(value as any).bounds
  );
}

function getBrowserProxyTargetKey(url: string): string {
  try {
    const parsed = new URL(url);

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

  if (
    /^(localhost|127\.0\.0\.1|\[::1\]|0\.0\.0\.0)(:\d+)?(?:\/.*)?$/i.test(
      trimmed,
    )
  ) {
    return `http://${trimmed}`;
  }

  if (/^\[[a-f0-9:]+\](?::\d+)?(?:\/.*)?$/i.test(trimmed)) {
    return `https://${trimmed}`;
  }

  if (
    /^([\w-]+(?:\.[\w-]+)+|\d{1,3}(?:\.\d{1,3}){3})(?::\d+)?(?:\/.*)?$/i.test(
      trimmed,
    )
  ) {
    return `https://${trimmed}`;
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
    goToHistory,
    reload,
    setLoading,
    setProxyState,
    setInspecting,
    setHoverTarget,
    updateTab,
  } = useBrowserActions();

  const parentOriginRef = useRef(window.location.origin);

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

        const cacheEntry = {
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

  const iframeSrc =
    tab?.proxyState.status === 'ready'
      ? (() => {
          try {
            const parsed = new URL(tab.loadedUrl);

            const base = tab.proxyState.previewOrigin.replace(/\/+$/, '');

            return (
              `${base}${parsed.pathname || '/'}` +
              `${parsed.search}${parsed.hash}`
            );
          } catch {
            return '';
          }
        })()
      : '';

  const isProxied = tab?.proxyState.status === 'ready';

  const getCurrentUrlFromFrameUrl = useCallback(
    (frameUrl: string): string => {
      if (!frameUrl || !tab?.loadedUrl || tab.proxyState.status !== 'ready') {
        return '';
      }

      try {
        const frame = new URL(frameUrl);

        const previewHost = new URL(tab.proxyState.previewOrigin).hostname;

        if (frame.hostname !== previewHost) {
          return '';
        }

        const upstream = new URL(tab.loadedUrl);

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

  const postInspectMode = useCallback((enabled: boolean) => {
    iframeRef.current?.contentWindow?.postMessage(
      {
        source: 'aero-preview-parent',
        version: 1,
        type: 'set-inspect-mode',
        enabled,
      },
      parentOriginRef.current,
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
    const handler = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') {
        return;
      }

      event.preventDefault();

      setInspecting(tabId, false);

      cancelInspect();
    };

    if (tab?.isInspecting) {
      window.addEventListener('keydown', handler, true);
    }

    return () => window.removeEventListener('keydown', handler, true);
  }, [tab?.isInspecting, tabId, setInspecting, cancelInspect]);

  useEffect(() => {
    return () => {
      setInspecting(tabId, false);
      setHoverTarget(tabId, null);
    };
  }, [tabId, setInspecting, setHoverTarget]);

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

      if (data.type === 'ready') {
        const nextUrl =
          typeof data.url === 'string'
            ? getCurrentUrlFromFrameUrl(data.url)
            : '';

        if (nextUrl && nextUrl !== tab?.url) {
          navigate(tabId, nextUrl, {
            inFrame: true,
          });
        }

        if (data.title) {
          updateTab(tabId, {
            title: data.title,
          });
        }

        setLoading(tabId, false);

        if (tab?.isInspecting) {
          postInspectMode(true);
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

        attachContext(data.target);
      }
    };

    window.addEventListener('message', handler);

    return () => window.removeEventListener('message', handler);
  }, [
    tabId,
    tab?.url,
    tab?.isInspecting,
    getCurrentUrlFromFrameUrl,
    navigate,
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
    if (!tab?.url) {
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

    navigate(tabId, normalized === 'about:blank' ? '' : normalized);
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
        <IconBtn
          disabled={tab.historyIndex <= 0}
          onClick={() => goToHistory(tabId, tab.historyIndex - 1)}
        >
          <Icon data={ArrowLeft} size={14} />
        </IconBtn>

        <IconBtn
          disabled={
            tab.historyIndex < 0 || tab.historyIndex >= tab.history.length - 1
          }
          onClick={() => goToHistory(tabId, tab.historyIndex + 1)}
        >
          <Icon data={ArrowRight} size={14} />
        </IconBtn>

        <IconBtn disabled={!tab.url} onClick={handleReload}>
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
          disabled={!tab.url || !isProxied}
          onClick={handleInspect}
        >
          <Icon data={LayoutHeaderCursor} size={14} />
        </IconBtn>

        <IconBtn
          disabled={!tab.url}
          onClick={() => tab.url && window.open(tab.url, '_blank')}
        >
          <Icon data={ArrowUpRightFromSquare} size={14} />
        </IconBtn>
      </div>

      <div className='relative min-h-0 flex-1'>
        {iframeSrc ? (
          <div className='absolute inset-0'>
            <iframe
              key={`${tabId}:${tab.reloadNonce}`}
              ref={iframeRef}
              src={iframeSrc}
              title='Browser preview'
              className='absolute inset-0 h-full w-full border-0'
              allow='clipboard-read; clipboard-write; fullscreen'
              onLoad={() => setLoading(tabId, false)}
            />
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
