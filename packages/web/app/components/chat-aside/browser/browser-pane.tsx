/* eslint-disable @typescript-eslint/no-explicit-any */

import {
  ArrowLeft,
  ArrowRight,
  ArrowsRotateRight,
  ArrowUpRightFromSquare,
  LayoutHeaderCursor,
  Paperclip,
} from '@gravity-ui/icons';
import { Icon } from '@gravity-ui/uikit';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { Button, cn, toast } from '@aero/ui';

import {
  CachedProxyTarget,
  formatAgentationContext,
  getBrowserProxyTargetKey,
  getCachedProxyTarget,
  isPreviewElementMetadata,
  normalizeBrowserUrl,
  PreviewBridgeMessage,
  previewProxyTargetCache,
  PreviewSelection,
  PreviewSelectionPreview,
} from '@/app/components/chat-aside/browser/browser-helpers';
import { IconBtn } from '@/app/components/chat-aside/browser/icon-btn';
import { LocalhostPorts } from '@/app/components/chat-aside/browser/localhost-ports';
import { honoClient } from '@/app/lib';

import { useBrowserActions, useBrowserTab } from './browser-store';

interface BrowserPaneProps {
  tabId: string;
  active: boolean;
  onAttachToChat?: (text: string) => void;
}

export function BrowserPane({
  tabId,
  active,
  onAttachToChat,
}: BrowserPaneProps) {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const lastHoverTargetRef = useRef<PreviewSelection['target'] | null>(null);
  const bridgeReadyRef = useRef(false);
  const inspectAttemptRef = useRef(0);

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
  const [pendingSelection, setPendingSelection] =
    useState<PreviewSelection | null>(null);
  const [selectionPreview, setSelectionPreview] =
    useState<PreviewSelectionPreview | null>(null);
  const [annotationNote, setAnnotationNote] = useState('');
  const [bridgeReady, setBridgeReady] = useState(false);

  // ---------------------------------------------------------------------------
  // Proxy Target Resolution
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!tab?.loadedUrl) {
      setProxyState(tabId, { status: 'idle' });
      return;
    }

    const normalizedLoadedUrl = normalizeBrowserUrl(tab.loadedUrl);
    const key = getBrowserProxyTargetKey(normalizedLoadedUrl);
    const cached = getCachedProxyTarget(key);

    if (cached) {
      setProxyState(tabId, {
        status: 'ready',
        ...cached,
      });
      return;
    }

    let cancelled = false;

    setProxyState(tabId, { status: 'loading' });
    setLoading(tabId, true);

    void (async () => {
      try {
        const response = await honoClient.api.preview.targets.$post({
          json: { url: normalizedLoadedUrl },
        });

        if (!response.ok) {
          const body = await response.json().catch(() => ({}) as any);
          const message =
            typeof body?.error === 'string'
              ? body.error
              : `HTTP ${response.status}`;

          if (!cancelled) {
            setProxyState(tabId, { status: 'error', message });
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
  }, [setLoading, setProxyState, tab?.loadedUrl, tabId]);

  // ---------------------------------------------------------------------------
  // Build Iframe Source
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!tab || tab.proxyState.status !== 'ready') {
      return;
    }

    const rawUrl = tab.currentUrl || tab.loadedUrl;
    const url = rawUrl ? normalizeBrowserUrl(rawUrl) : '';

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
        nextSrc = `${previewOrigin}/${encodeURIComponent(fileName)}${parsed.search}${parsed.hash}`;
      } else {
        nextSrc = `${previewOrigin}${parsed.pathname || '/'}${parsed.search}${parsed.hash}`;
      }

      bridgeReadyRef.current = false;
      setBridgeReady(false);
      lastHoverTargetRef.current = null;

      setPendingSelection(null);
      setSelectionPreview(null);
      setAnnotationNote('');
      setHoverTarget(tabId, null);

      setIframeSrc(nextSrc);
    } catch {
      setIframeSrc('');
    }
  }, [
    setHoverTarget,
    tab?.loadedUrl,
    tab?.proxyState,
    tab?.proxyState,
    tab?.reloadNonce,
    tabId,
  ]);

  const isProxied = tab?.proxyState.status === 'ready';

  // ---------------------------------------------------------------------------
  // Preview URL -> Original URL Conversion
  // ---------------------------------------------------------------------------
  const getCurrentUrlFromFrameUrl = useCallback(
    (frameUrl: string): string => {
      if (!frameUrl || !tab?.loadedUrl || tab.proxyState.status !== 'ready') {
        return '';
      }

      try {
        const frame = new URL(frameUrl);
        const preview = new URL(tab.proxyState.previewOrigin);
        const normalizedLoadedUrl = normalizeBrowserUrl(tab.loadedUrl);
        const upstream = new URL(normalizedLoadedUrl);

        if (frame.origin !== preview.origin) {
          return '';
        }

        if (upstream.protocol === 'file:') {
          const originalPath = decodeURIComponent(upstream.pathname);
          const lastSlash = originalPath.lastIndexOf('/');
          const originalDirectory =
            lastSlash >= 0 ? originalPath.slice(0, lastSlash + 1) : '/';
          const previewPath = decodeURIComponent(frame.pathname).replace(
            /^\/+/,
            '',
          );

          const nextUrl = new URL(upstream.toString());
          nextUrl.pathname = `${originalDirectory}${previewPath}`;
          nextUrl.search = frame.search;
          nextUrl.hash = frame.hash;

          return nextUrl.toString();
        }

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

  // ---------------------------------------------------------------------------
  // Parent -> Iframe Communication
  // ---------------------------------------------------------------------------
  const postToFrame = useCallback((message: Record<string, any>) => {
    iframeRef.current?.contentWindow?.postMessage(
      {
        source: 'aero-preview-parent',
        version: 1,
        ...message,
      },
      '*',
    );
  }, []);

  const postInspectMode = useCallback(
    (enabled: boolean) => {
      postToFrame({ type: 'set-inspect-mode', enabled });
    },
    [postToFrame],
  );

  // ---------------------------------------------------------------------------
  // Selection & Annotation Management
  // ---------------------------------------------------------------------------
  const clearSelection = useCallback(() => {
    setPendingSelection(null);
    setSelectionPreview(null);
    setAnnotationNote('');
  }, []);

  const cancelInspect = useCallback(() => {
    clearSelection();
    lastHoverTargetRef.current = null;
    setHoverTarget(tabId, null);
    postInspectMode(false);
    setInspecting(tabId, false);
  }, [clearSelection, postInspectMode, setHoverTarget, setInspecting, tabId]);

  const createAnnotation = useCallback(async () => {
    if (!tab || !pendingSelection) {
      return;
    }

    const annotation = {
      id: `ann_${Math.random().toString(36).slice(2)}_${Date.now().toString(36)}`,
      mode: pendingSelection.mode,
      note: annotationNote.trim(),
      createdAt: Date.now(),
      url: tab.url,
      target: pendingSelection.target,
      bounds: {
        x: pendingSelection.bounds.x,
        y: pendingSelection.bounds.y,
        width: pendingSelection.bounds.width,
        height: pendingSelection.bounds.height,
      },
      points: pendingSelection.points?.map((point) => ({
        x: point.x,
        y: point.y,
      })),
    };

    const text = formatAgentationContext(
      tab.url,
      annotation.target,
      annotation,
    );

    void navigator.clipboard
      .writeText(text)
      .then(() => {
        toast.success('Annotation context copied to clipboard');
      })
      .catch((error) => {
        console.error('[Agentation] Clipboard write failed', error);
        toast.danger('Failed to copy annotation context');
      });

    // const iframe = iframeRef.current;

    // if (iframe) {
    //   const blob = await captureIframeContent(iframe);
    //   const url = URL.createObjectURL(blob);
    //   window.open(url, '_blank');
    // }

    onAttachToChat?.(text);

    clearSelection();
    lastHoverTargetRef.current = null;
    setHoverTarget(tabId, null);
    setInspecting(tabId, false);
    postInspectMode(false);
  }, [
    annotationNote,
    clearSelection,
    onAttachToChat,
    pendingSelection,
    postInspectMode,
    setHoverTarget,
    setInspecting,
    tab,
    tabId,
  ]);

  const handleInspect = useCallback(() => {
    if (!tab || !isProxied) {
      return;
    }

    if (tab.isInspecting) {
      cancelInspect();
      return;
    }

    clearSelection();
    lastHoverTargetRef.current = null;
    setHoverTarget(tabId, null);
    setInspecting(tabId, true);

    postInspectMode(true);

    inspectAttemptRef.current += 1;
    const attempt = inspectAttemptRef.current;

    if (!bridgeReadyRef.current) {
      window.setTimeout(() => {
        if (attempt !== inspectAttemptRef.current || bridgeReadyRef.current) {
          return;
        }
        toast.danger(
          'Annotations are unavailable for this preview. The page may be preventing injected scripts from running.',
        );
      }, 1800);
    }
  }, [
    cancelInspect,
    clearSelection,
    isProxied,
    postInspectMode,
    setHoverTarget,
    setInspecting,
    tab,
    tabId,
  ]);

  // Keybindings
  useEffect(() => {
    if (!tab?.isInspecting) {
      return;
    }

    const handler = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') {
        return;
      }

      event.preventDefault();
      event.stopPropagation();

      if (pendingSelection) {
        clearSelection();
        return;
      }

      cancelInspect();
    };

    window.addEventListener('keydown', handler, true);
    return () => {
      window.removeEventListener('keydown', handler, true);
    };
  }, [cancelInspect, clearSelection, pendingSelection, tab?.isInspecting]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      bridgeReadyRef.current = false;
      lastHoverTargetRef.current = null;
      setInspecting(tabId, false);
      setHoverTarget(tabId, null);
    };
  }, [setHoverTarget, setInspecting, tabId]);

  // ---------------------------------------------------------------------------
  // Editor Positioning Calculation
  // ---------------------------------------------------------------------------
  const editorPosition = useMemo(() => {
    if (!pendingSelection) {
      return null;
    }

    const container = iframeRef.current?.parentElement;
    const width = container?.clientWidth ?? 0;
    const height = container?.clientHeight ?? 0;

    const editorWidth = 320;
    const editorHeight = 44;
    const gap = 8;
    const margin = 8;

    let top = pendingSelection.bounds.y + pendingSelection.bounds.height + gap;

    if (top + editorHeight > height - margin) {
      top = pendingSelection.bounds.y - editorHeight - gap;
    }

    top = Math.max(margin, top);

    let left =
      pendingSelection.bounds.x +
      (pendingSelection.bounds.width - editorWidth) / 2;

    left = Math.max(
      margin,
      Math.min(left, Math.max(margin, width - editorWidth - margin)),
    );

    return { left, top };
  }, [pendingSelection]);

  // ---------------------------------------------------------------------------
  // Navigation Controls
  // ---------------------------------------------------------------------------
  const goBackInFrame = useCallback(() => {
    postToFrame({ type: 'history-back' });
  }, [postToFrame]);

  const goForwardInFrame = useCallback(() => {
    postToFrame({ type: 'history-forward' });
  }, [postToFrame]);

  const handleReload = useCallback(() => {
    if (!tab?.currentUrl) {
      return;
    }
    setLoading(tabId, true);
    reload(tabId);
  }, [reload, setLoading, tab?.currentUrl, tabId]);

  const handleSubmit = useCallback(() => {
    if (!tab) {
      return;
    }
    const normalized = normalizeBrowserUrl(tab.draftUrl);
    navigate(tabId, normalized === 'about:blank' ? '' : normalized);
  }, [navigate, tab, tabId]);

  const getExternalUrl = useCallback(() => {
    if (!tab?.currentUrl || tab.proxyState.status !== 'ready') {
      return null;
    }

    try {
      const url = new URL(normalizeBrowserUrl(tab.currentUrl));
      const previewOrigin = tab.proxyState.previewOrigin.replace(/\/+$/, '');

      if (url.protocol === 'file:') {
        const filePath = decodeURIComponent(url.pathname);
        const fileName = filePath.split('/').pop() || '';
        return `${previewOrigin}/${encodeURIComponent(fileName)}${url.search}${url.hash}`;
      }

      return `${previewOrigin}${url.pathname || '/'}${url.search}${url.hash}`;
    } catch {
      return null;
    }
  }, [tab]);

  // ---------------------------------------------------------------------------
  // Bridge Message Handlers
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const handler = (event: MessageEvent) => {
      if (event.source !== iframeRef.current?.contentWindow) {
        return;
      }

      const data = event.data as PreviewBridgeMessage;

      if (
        !data ||
        data.source !== 'aero-preview-bridge' ||
        data.version !== 1
      ) {
        return;
      }

      switch (data.type) {
        case 'ready': {
          bridgeReadyRef.current = true;
          setBridgeReady(true);

          const frameUrl = typeof data.url === 'string' ? data.url : '';
          const nextUrl = getCurrentUrlFromFrameUrl(frameUrl);

          if (nextUrl && nextUrl !== tab?.currentUrl) {
            syncNavigation(tabId, nextUrl);
          }

          if (typeof data.title === 'string' && data.title) {
            updateTab(tabId, { title: data.title });
          }

          setLoading(tabId, false);

          if (tab?.isInspecting) {
            postInspectMode(true);
          }
          break;
        }

        case 'history-state': {
          setIframeHistoryState(tabId, {
            canGoBack: data.canGoBack === true,
            canGoForward: data.canGoForward === true,
          });
          break;
        }

        case 'navigate-preview': {
          const frameUrl = typeof data.url === 'string' ? data.url : '';
          const nextUrl = getCurrentUrlFromFrameUrl(frameUrl);

          if (nextUrl && nextUrl !== tab?.currentUrl) {
            syncNavigation(tabId, nextUrl);
          }

          if (typeof data.title === 'string' && data.title) {
            updateTab(tabId, { title: data.title });
          }
          break;
        }

        case 'hover': {
          const target = isPreviewElementMetadata(data.target)
            ? data.target
            : null;

          if (target) {
            lastHoverTargetRef.current = target;
          }

          setHoverTarget(tabId, target);
          break;
        }

        case 'selection-preview': {
          if (!data.selection) {
            setSelectionPreview(null);
            return;
          }

          setSelectionPreview({
            mode: data.selection.mode,
            bounds: data.selection.bounds,
            points: data.selection.points,
          });
          break;
        }

        case 'select': {
          const selection = data.selection;
          if (!selection?.bounds) {
            return;
          }

          const target = isPreviewElementMetadata(selection.target)
            ? selection.target
            : isPreviewElementMetadata(data.target)
              ? data.target
              : (lastHoverTargetRef.current ?? undefined);

          setHoverTarget(tabId, null);
          setSelectionPreview(null);

          setPendingSelection({
            mode: selection.mode,
            target,
            bounds: selection.bounds,
            points: selection.points,
          });

          setAnnotationNote('');
          break;
        }
      }
    };

    window.addEventListener('message', handler);
    return () => {
      window.removeEventListener('message', handler);
    };
  }, [
    getCurrentUrlFromFrameUrl,
    postInspectMode,
    setHoverTarget,
    setIframeHistoryState,
    setLoading,
    syncNavigation,
    tab?.currentUrl,
    tab?.isInspecting,
    tabId,
    updateTab,
  ]);

  if (!tab) {
    return null;
  }

  const activeSelection = pendingSelection ?? selectionPreview;

  return (
    <div
      className='absolute inset-0 flex flex-col overflow-hidden'
      style={{
        visibility: active ? 'visible' : 'hidden',
        pointerEvents: active ? 'auto' : 'none',
      }}
    >
      {/* Navigation & Address Bar */}
      <div className='border-separator dark:border-separator:40 flex items-center gap-1 border-b px-2 py-1'>
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

        <form className='min-w-0 flex-1'>
          <input
            value={tab.draftUrl}
            onChange={(event) => setDraftUrl(tabId, event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                event.stopPropagation();
                handleSubmit();
              }
            }}
            placeholder='Search or enter address'
            className='border-separator dark:border-separator:40 bg-default h-7 w-full rounded-md border px-2 text-sm outline-none'
          />
        </form>

        <IconBtn
          active={tab.isInspecting}
          disabled={!tab.currentUrl || !isProxied}
          onClick={handleInspect}
          title={
            isProxied ? 'Annotate preview' : 'Unavailable for un-proxied pages'
          }
        >
          <Icon data={LayoutHeaderCursor} size={14} />
        </IconBtn>

        <IconBtn
          disabled={!tab.currentUrl}
          onClick={() => {
            const url = getExternalUrl();
            if (url) {
              window.open(url, '_blank', 'noopener,noreferrer');
            }
          }}
          title='Open externally'
        >
          <Icon data={ArrowUpRightFromSquare} size={14} />
        </IconBtn>
      </div>

      {/* Main Content Area */}
      <div
        className={cn(
          'relative min-h-0 flex-1',
          !iframeSrc && 'scrollbar-thin overflow-y-auto',
        )}
      >
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

            {/* Annotation Overlays */}
            {tab.isInspecting && (
              <div className='pointer-events-none absolute inset-0'>
                {/* Hover Target Overlay */}
                {tab.hoverTarget && !pendingSelection && (
                  <div
                    className='border-accent bg-accent/15 absolute rounded-sm border-2'
                    style={{
                      left: tab.hoverTarget.bounds.x,
                      top: tab.hoverTarget.bounds.y,
                      width: tab.hoverTarget.bounds.width,
                      height: tab.hoverTarget.bounds.height,
                    }}
                  >
                    <div className='bg-default text-muted absolute -top-6 left-0 max-w-72 truncate rounded px-2 py-0.5 text-xs font-medium shadow'>
                      <span className='text-foreground'>
                        {tab.hoverTarget.tag}
                      </span>
                      {tab.hoverTarget.text && (
                        <span>
                          {' · '}
                          {tab.hoverTarget.text}
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {/* Selection Box Overlay */}
                {activeSelection?.bounds && (
                  <div
                    className='border-accent bg-accent/15 absolute rounded-sm border-2'
                    style={{
                      left: activeSelection.bounds.x,
                      top: activeSelection.bounds.y,
                      width: activeSelection.bounds.width,
                      height: activeSelection.bounds.height,
                    }}
                  >
                    {pendingSelection?.target && (
                      <div className='bg-default text-muted absolute -top-6 left-0 max-w-72 truncate rounded px-2 py-0.5 text-xs font-medium shadow'>
                        <span className='text-foreground'>
                          {pendingSelection.target.tag}
                        </span>
                        {pendingSelection.target.text && (
                          <span>
                            {' · '}
                            {pendingSelection.target.text}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Note Editor Popover */}
            {tab.isInspecting && pendingSelection && editorPosition && (
              <div
                className='border-separator dark:border-separator/50 bg-surface pointer-events-auto absolute flex w-80 items-center gap-1 rounded-full border p-1.5 shadow-xl'
                style={{
                  left: editorPosition.left,
                  top: editorPosition.top,
                }}
                onPointerDown={(event) => event.stopPropagation()}
                onClick={(event) => event.stopPropagation()}
              >
                <input
                  autoFocus
                  value={annotationNote}
                  onChange={(event) => setAnnotationNote(event.target.value)}
                  onKeyDown={(event) => {
                    event.stopPropagation();
                    if (event.key === 'Enter') {
                      event.preventDefault();
                      createAnnotation();
                    } else if (event.key === 'Escape') {
                      event.preventDefault();
                      clearSelection();
                    }
                  }}
                  placeholder='Add a note'
                  className='placeholder:text-muted min-w-0 flex-1 bg-transparent px-2 py-1.5 text-sm outline-none'
                />

                <Button
                  isIconOnly
                  type='button'
                  aria-label='Submit comment'
                  size='sm'
                  onPress={createAnnotation}
                >
                  <Paperclip />
                </Button>
              </div>
            )}

            {/* Connecting Toast Indicator */}
            {!bridgeReady && tab.isInspecting && (
              <div className='border-separator dark:border-separator:40 bg-default/95 text-muted pointer-events-auto absolute bottom-3 left-1/2 -translate-x-1/2 rounded-md border px-3 py-1.5 text-xs shadow-lg'>
                Connecting to preview…
              </div>
            )}
          </div>
        ) : (
          <LocalhostPorts
            onSelect={(url) => {
              setDraftUrl(tabId, url);
              const normalized = normalizeBrowserUrl(url);
              navigate(tabId, normalized === 'about:blank' ? '' : normalized);
            }}
          />
        )}

        {/* Global Loading Overlay */}
        {tab.isLoading && (
          <div className='bg-background/70 text-muted absolute inset-0 flex items-center justify-center text-sm'>
            Loading...
          </div>
        )}
      </div>
    </div>
  );
}
