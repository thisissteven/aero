/* eslint-disable @typescript-eslint/no-explicit-any */

import {
  Button,
  cn,
  Dropdown,
  Label,
  Separator,
  Spinner,
  toast,
} from '@aero/ui';
import {
  ArrowLeft,
  ArrowRight,
  ArrowsRotateRight,
  ArrowUpRightFromSquare,
  Check,
  EllipsisVertical,
  Frame,
  Frames,
  LayoutHeaderCursor,
  Minus,
  Paperclip,
  Plus,
  TrashBin,
} from '@gravity-ui/icons';
import { Icon } from '@gravity-ui/uikit';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { registerBrowserPaneController } from '@/app/components/chat-aside/browser/browser-agent-controller';
import {
  CachedProxyTarget,
  formatAgentationContext,
  getBrowserProxyTargetKey,
  getCachedProxyTarget,
  isPreviewElementMetadata,
  normalizeBrowserUrl,
  openUrl,
  PreviewBridgeMessage,
  PreviewSelection,
  PreviewSelectionPreview,
  previewProxyTargetCache,
} from '@/app/components/chat-aside/browser/browser-helpers';
import { IconBtn } from '@/app/components/chat-aside/browser/icon-btn';
import { LocalhostPorts } from '@/app/components/chat-aside/browser/localhost-ports';
import { useExternalPartsStore } from '@/app/features/chat-page/chat-input/external-parts-store';
import { useI18n } from '@/app/hooks/i18n';
import { honoClient } from '@/app/lib';
import { useOptionalSessionId } from '@/app/providers/SessionIdProvider';

import {
  BROWSER_VIEWPORT_WIDTHS,
  type BrowserViewport,
  useBrowserActions,
  useBrowserTab,
} from './browser-store';

interface BrowserPaneProps {
  tabId: string;
  active: boolean;
}

interface PendingFrameRequest {
  resolve: (value: any) => void;
  reject: (error: Error) => void;
  timeout: number;
}

function toDimension(value: unknown): number | null {
  const size = typeof value === 'number' ? value : Number(value);

  if (!Number.isFinite(size) || size <= 0) {
    return null;
  }

  return Math.round(Math.min(size, 10_000));
}

function toDpr(value: unknown): number | null {
  const dpr = typeof value === 'number' ? value : Number(value);

  if (!Number.isFinite(dpr) || dpr <= 0) {
    return null;
  }

  return Math.min(Math.max(dpr, 0.5), 4);
}

/**
 * Copy a captured screenshot to the system clipboard as an image. Requires a
 * secure context and a user gesture; the screenshot menu item provides both.
 */
async function copyImageToClipboard(
  dataUrl: string,
  mime: string,
): Promise<void> {
  if (typeof ClipboardItem === 'undefined' || !navigator.clipboard?.write) {
    throw new Error('Image clipboard is unavailable');
  }

  const response = await fetch(dataUrl);
  const blob = await response.blob();
  const type = blob.type || mime || 'image/png';

  await navigator.clipboard.write([new ClipboardItem({ [type]: blob })]);
}

export function BrowserPane({ tabId, active }: BrowserPaneProps) {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const lastHoverTargetRef = useRef<PreviewSelection['target'] | null>(null);
  const bridgeReadyRef = useRef(false);
  const inspectAttemptRef = useRef(0);
  const pendingRequestsRef = useRef(new Map<string, PendingFrameRequest>());

  const tab = useBrowserTab(tabId);
  // New-session pages have no route session id yet; the composer stores its
  // external parts under the literal `'undefined'` key in that case.
  const sessionId = useOptionalSessionId() ?? 'undefined';
  const addBrowserAnnotation = useExternalPartsStore(
    (state) => state.addBrowserAnnotation,
  );
  const { t } = useI18n();

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
    goToHistory,
    setViewport,
    setCustomSize,
    setZoom,
  } = useBrowserActions();

  const [iframeSrc, setIframeSrc] = useState('');
  const [pendingSelection, setPendingSelection] =
    useState<PreviewSelection | null>(null);
  const [selectionPreview, setSelectionPreview] =
    useState<PreviewSelectionPreview | null>(null);
  const [annotationNote, setAnnotationNote] = useState('');
  const [bridgeReady, setBridgeReady] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);

  const viewportContainerRef = useRef<HTMLDivElement | null>(null);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });

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
            setLoading(tabId, false);
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
          setLoading(tabId, false);
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
      setIframeSrc('');
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

  /*
   * Track the panel content box so an oversized custom viewport can be scaled
   * down to fit for display while its layout size — and therefore any capture —
   * stays exactly what the agent asked for.
   */
  useEffect(() => {
    const element = viewportContainerRef.current;

    if (!element) {
      return;
    }

    const update = () => {
      setContainerSize({
        width: element.clientWidth,
        height: element.clientHeight,
      });
    };

    update();

    if (typeof ResizeObserver === 'undefined') {
      return;
    }

    const observer = new ResizeObserver(update);
    observer.observe(element);

    return () => observer.disconnect();
  }, [iframeSrc]);

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

  const waitForBridgeReady = useCallback(
    (timeoutMs = 3000): Promise<boolean> => {
      if (bridgeReadyRef.current) return Promise.resolve(true);

      return new Promise((resolve) => {
        const deadline = Date.now() + timeoutMs;

        const tick = () => {
          if (bridgeReadyRef.current) {
            resolve(true);
            return;
          }

          if (Date.now() >= deadline) {
            resolve(false);
            return;
          }

          window.setTimeout(tick, 100);
        };

        tick();
      });
    },
    [],
  );

  const sendFrameRequest = useCallback(
    async (
      type: string,
      payload: Record<string, any> = {},
      timeoutMs = 15000,
    ): Promise<any> => {
      const ready = await waitForBridgeReady();

      if (!ready || !bridgeReadyRef.current) {
        throw new Error(
          'The preview is not ready. The page may still be loading or has not been proxied.',
        );
      }

      const requestId = `req_${Date.now().toString(36)}_${Math.random()
        .toString(36)
        .slice(2)}`;

      return new Promise((resolve, reject) => {
        const timeout = window.setTimeout(() => {
          pendingRequestsRef.current.delete(requestId);
          reject(new Error(`Preview action timed out: ${type}`));
        }, timeoutMs);

        pendingRequestsRef.current.set(requestId, {
          resolve,
          reject,
          timeout,
        });

        postToFrame({ type, requestId, ...payload });
      });
    },
    [postToFrame, waitForBridgeReady],
  );

  /**
   * Ask the bridge (inside the cross-origin iframe) to snapshot the visible
   * viewport. Resolves with null on timeout or when the bridge is unavailable,
   * so the annotation still works without an image.
   */
  const requestCapture = useCallback(
    async (
      payload: Record<string, unknown> = {},
    ): Promise<{
      dataUrl: string;
      mime: string;
    } | null> => {
      try {
        const result = await sendFrameRequest('capture', payload, 15_000);

        if (result?.dataUrl) {
          return { dataUrl: result.dataUrl, mime: result.mime ?? 'image/png' };
        }

        return null;
      } catch {
        return null;
      }
    },
    [sendFrameRequest],
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
    if (!tab || !pendingSelection || isCapturing) {
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

    setIsCapturing(true);

    try {
      // Capture before leaving inspect mode: the bridge highlights the
      // selection it is currently tracking, and clearing inspect mode drops
      // that state.
      const capture = await requestCapture();

      addBrowserAnnotation(sessionId, {
        imageUrl: capture?.dataUrl ?? '',
        imageMime: capture?.mime ?? 'image/png',
        text,
        pageUrl: tab.url,
        pageTitle: tab.title,
      });

      toast.success(t.browser.annotationAdded);
    } finally {
      setIsCapturing(false);
      clearSelection();
      lastHoverTargetRef.current = null;
      setHoverTarget(tabId, null);
      setInspecting(tabId, false);
      postInspectMode(false);
    }
  }, [
    addBrowserAnnotation,
    annotationNote,
    clearSelection,
    isCapturing,
    pendingSelection,
    postInspectMode,
    requestCapture,
    sessionId,
    setHoverTarget,
    setInspecting,
    tab,
    tabId,
    t,
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
        toast.danger(t.browser.annotationsUnavailable);
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
    t,
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
    const pendingRequests = pendingRequestsRef.current;

    return () => {
      bridgeReadyRef.current = false;
      lastHoverTargetRef.current = null;
      setInspecting(tabId, false);
      setHoverTarget(tabId, null);

      for (const pending of pendingRequests.values()) {
        window.clearTimeout(pending.timeout);
        pending.reject(new Error('The browser pane was closed'));
      }
      pendingRequests.clear();
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
  /*
   * Back/forward are driven entirely from this pane's own tab history and
   * reload the iframe source. Previously they called the iframe's
   * `window.history.back()`, which can fall through to the top-level browsing
   * context (and therefore Aero's page history) when the frame has no entry
   * of its own. Rebuilding the iframe src can never touch the parent history.
   */
  const canGoBack = (tab?.historyIndex ?? -1) > 0;
  const canGoForward =
    !!tab && tab.historyIndex >= 0 && tab.historyIndex < tab.history.length - 1;

  const goBackInFrame = useCallback(() => {
    if (!tab) {
      return;
    }

    const nextIndex = tab.historyIndex - 1;

    if (nextIndex >= 0) {
      setLoading(tabId, true);
      goToHistory(tabId, nextIndex);
    }
  }, [goToHistory, setLoading, tab, tabId]);

  const goForwardInFrame = useCallback(() => {
    if (!tab) {
      return;
    }

    const nextIndex = tab.historyIndex + 1;

    if (nextIndex < tab.history.length) {
      setLoading(tabId, true);
      goToHistory(tabId, nextIndex);
    }
  }, [goToHistory, setLoading, tab, tabId]);

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

        case 'capture-result': {
          const requestId =
            typeof data.requestId === 'string' ? data.requestId : '';
          const pending = pendingRequestsRef.current.get(requestId);

          if (!pending) {
            break;
          }

          pendingRequestsRef.current.delete(requestId);
          window.clearTimeout(pending.timeout);

          if (data.dataUrl) {
            pending.resolve({
              dataUrl: data.dataUrl,
              mime: data.mime ?? 'image/png',
            });
          } else {
            pending.resolve(null);
          }
          break;
        }

        case 'action-result': {
          const requestId =
            typeof data.requestId === 'string' ? data.requestId : '';
          const pending = pendingRequestsRef.current.get(requestId);

          if (!pending) {
            break;
          }

          pendingRequestsRef.current.delete(requestId);
          window.clearTimeout(pending.timeout);

          if (data.ok === true) {
            pending.resolve(data.data);
          } else {
            pending.reject(new Error(data.error || 'Preview action failed'));
          }
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

        case 'open-url': {
          const nextUrl = typeof data.url === 'string' ? data.url : '';

          if (!nextUrl) {
            break;
          }

          setDraftUrl(tabId, nextUrl);

          if (data.newTab === true) {
            openUrl(nextUrl);
          } else {
            navigate(tabId, normalizeBrowserUrl(nextUrl));
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
    navigate,
    postInspectMode,
    setDraftUrl,
    setHoverTarget,
    setIframeHistoryState,
    setLoading,
    syncNavigation,
    tab?.currentUrl,
    tab?.isInspecting,
    tabId,
    updateTab,
  ]);

  const handleHardReload = useCallback(async () => {
    try {
      await sendFrameRequest('clear-cache', {}, 6000);
    } catch {
      // The bridge may be unavailable; a plain reload still helps.
    }
    reload(tabId);
    setLoading(tabId, true);
  }, [reload, sendFrameRequest, setLoading, tabId]);

  const handleClearStorage = useCallback(async () => {
    try {
      await sendFrameRequest('clear-storage', {}, 6000);
    } catch {
      // ignore — the reload below still resets the panel
    }
    previewProxyTargetCache.clear();
    reload(tabId);
    setLoading(tabId, true);
  }, [reload, sendFrameRequest, setLoading, tabId]);

  const handleOpenExternal = useCallback(() => {
    const url = getExternalUrl();
    if (url) {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  }, [getExternalUrl]);

  const handleScreenshot = useCallback(
    async (fullPage: boolean) => {
      if (!tab || tab.proxyState.status !== 'ready') {
        return;
      }

      try {
        const capture = await requestCapture(
          fullPage ? { fullPage: true } : {},
        );

        if (!capture) {
          throw new Error('The capture came back empty');
        }

        await copyImageToClipboard(capture.dataUrl, capture.mime);
        toast.success(t.browser.screenshotCopied);
      } catch {
        toast.danger(t.browser.screenshotFailed);
      }
    },
    [requestCapture, t, tab],
  );

  // Expose this pane to the agent bridge client so `aero_web` actions can drive
  // the live preview. Registered for every tab; the client picks the active one.
  useEffect(() => {
    const controller = {
      snapshot: (params: Record<string, any>) =>
        sendFrameRequest('snapshot', params),
      click: (params: Record<string, any>) => sendFrameRequest('click', params),
      type: (params: Record<string, any>) => sendFrameRequest('type', params),
      scroll: (params: Record<string, any>) =>
        sendFrameRequest('scroll', params),
      inspect: (params: Record<string, any>) =>
        sendFrameRequest('inspect', params),
      capture: async (params: Record<string, unknown> = {}) => {
        const width = toDimension(params.width);
        const height = toDimension(params.height);
        const requestedDpr = toDpr(params.dpr);

        const exact = Boolean(width && height);

        if (width && height) {
          setCustomSize(tabId, { width, height });

          // Let React commit the resize and the iframe reflow before the bridge
          // snapshots its (now exact-size) viewport.
          await new Promise<void>((resolve) =>
            requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
          );
          await new Promise((resolve) => setTimeout(resolve, 150));
        }

        // When an exact size is requested, pin the raster scale to 1 so the
        // image is exactly `width` x `height`, not multiplied by the host DPR.
        const dpr = requestedDpr ?? (exact ? 1 : undefined);

        const capture = await requestCapture(dpr ? { dpr } : {});

        if (!capture) {
          throw new Error('Failed to capture the page');
        }

        return {
          ...capture,
          ...(width && height ? { width, height } : {}),
          ...(dpr !== undefined ? { dpr } : {}),
          pageUrl: tab?.url ?? '',
          pageTitle: tab?.title ?? '',
        };
      },
      clearCache: async () => {
        await handleHardReload();
        return { cleared: true };
      },
      clearStorage: async () => {
        await handleClearStorage();
        return { cleared: true };
      },
      back: async () => {
        goBackInFrame();
        return {};
      },
      forward: async () => {
        goForwardInFrame();
        return {};
      },
    };

    return registerBrowserPaneController(tabId, controller);
  }, [
    tabId,
    sendFrameRequest,
    requestCapture,
    setCustomSize,
    goBackInFrame,
    goForwardInFrame,
    handleHardReload,
    handleClearStorage,
    tab?.url,
    tab?.title,
  ]);

  if (!tab) {
    return null;
  }

  const activeSelection = pendingSelection ?? selectionPreview;

  const viewportWidth =
    tab.viewport === 'fill' ? null : BROWSER_VIEWPORT_WIDTHS[tab.viewport];

  /*
   * An agent-set exact size lays the page out at that many CSS pixels
   * regardless of the panel, then scale-to-fits for display. `transform`
   * (unlike `zoom`) does not change the iframe's internal viewport, so a
   * capture still comes back at the requested dimensions.
   */
  const customSize = tab.customSize;

  const customScale =
    customSize && containerSize.width > 0 && containerSize.height > 0
      ? Math.min(
          1,
          containerSize.width / customSize.width,
          containerSize.height / customSize.height,
        )
      : 1;

  const viewportItems: { value: BrowserViewport; label: string }[] = [
    { value: 'fill', label: t.browser.viewportResponsive },
    { value: 'mobile', label: t.browser.viewportMobile },
    { value: 'tablet', label: t.browser.viewportTablet },
    { value: 'desktop', label: t.browser.viewportDesktop },
  ];

  return (
    <div
      className='absolute inset-0 flex flex-col overflow-hidden'
      style={{
        visibility: active ? 'visible' : 'hidden',
        pointerEvents: active ? 'auto' : 'none',
      }}
    >
      {/* Navigation & Address Bar */}
      <div className='border-separator flex items-center border-b px-1 py-1'>
        <IconBtn
          disabled={!canGoBack}
          onClick={goBackInFrame}
          title={t.common.back}
        >
          <Icon data={ArrowLeft} size={14} />
        </IconBtn>
        <IconBtn
          disabled={!canGoForward}
          onClick={goForwardInFrame}
          title={t.common.forward}
        >
          <Icon data={ArrowRight} size={14} />
        </IconBtn>
        <IconBtn
          disabled={!tab.currentUrl}
          onClick={handleReload}
          title={t.browser.reload}
        >
          <Icon data={ArrowsRotateRight} size={14} />
        </IconBtn>

        <form className='min-w-0 flex-1 mx-1'>
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
            placeholder={t.browser.searchOrEnterAddress}
            className='border-separator bg-default h-7 w-full rounded-md border px-2 text-sm outline-none'
          />
        </form>

        <IconBtn
          active={tab.isInspecting}
          disabled={!tab.currentUrl || !isProxied}
          onClick={handleInspect}
          title={
            isProxied
              ? t.browser.annotatePreview
              : t.browser.unavailableForUnproxiedPages
          }
        >
          <Icon data={LayoutHeaderCursor} size={14} />
        </IconBtn>

        <IconBtn
          disabled={!tab.currentUrl}
          onClick={handleOpenExternal}
          title={t.browser.openExternally}
        >
          <Icon data={ArrowUpRightFromSquare} size={14} />
        </IconBtn>

        <Dropdown size='sm'>
          <Dropdown.Trigger
            aria-label={t.browser.menu}
            className='grid place-items-center h-7 w-7 rounded-md p-0 hover:bg-default'
          >
            <Icon data={EllipsisVertical} size={14} />
          </Dropdown.Trigger>
          <Dropdown.Popover
            className='w-56 !bg-overlay backdrop-blur-none'
            placement='bottom end'
            crossOffset={6}
          >
            <div className='border-separator flex items-center justify-between gap-2 border-b px-3 py-1.5'>
              <span className='text-muted text-xs'>{t.browser.zoom}</span>
              <div className='flex items-center gap-1'>
                <button
                  type='button'
                  aria-label={t.browser.zoomOut}
                  className='text-muted hover:bg-default hover:text-foreground grid size-5 place-items-center rounded'
                  onClick={() => setZoom(tabId, tab.zoom - 0.1)}
                >
                  <Icon data={Minus} size={12} />
                </button>
                <button
                  type='button'
                  aria-label={t.browser.zoomReset}
                  className='text-foreground hover:bg-default min-w-10 rounded px-1 py-0.5 text-center text-xs tabular-nums'
                  onClick={() => setZoom(tabId, 1)}
                >
                  {Math.round(tab.zoom * 100)}%
                </button>
                <button
                  type='button'
                  aria-label={t.browser.zoomIn}
                  className='text-muted hover:bg-default hover:text-foreground grid size-5 place-items-center rounded'
                  onClick={() => setZoom(tabId, tab.zoom + 0.1)}
                >
                  <Icon data={Plus} size={12} />
                </button>
              </div>
            </div>
            <Dropdown.Menu aria-label={t.browser.menu}>
              {viewportItems.map((item) => (
                <Dropdown.Item
                  key={item.value}
                  className='gap-1'
                  onPress={() => setViewport(tabId, item.value)}
                >
                  <span className='flex size-3.5 items-center justify-center'>
                    {tab.viewport === item.value && (
                      <Icon data={Check} size={12} />
                    )}
                  </span>
                  <Label>{item.label}</Label>
                </Dropdown.Item>
              ))}

              <Separator className='my-0.5' />

              <Dropdown.Item
                className='gap-1'
                onPress={() => void handleScreenshot(false)}
              >
                <Icon data={Frame} size={14} />
                <Label>{t.browser.screenshotFrame}</Label>
              </Dropdown.Item>
              <Dropdown.Item
                className='gap-1'
                onPress={() => void handleScreenshot(true)}
              >
                <Icon data={Frames} size={14} />
                <Label>{t.browser.screenshotFullPage}</Label>
              </Dropdown.Item>

              <Separator className='my-0.5' />

              <Dropdown.Item
                className='gap-1'
                onPress={() => void handleHardReload()}
              >
                <Icon data={ArrowsRotateRight} size={14} />
                <Label>{t.browser.clearCache}</Label>
              </Dropdown.Item>
              <Dropdown.Item
                className='gap-1'
                onPress={() => void handleClearStorage()}
              >
                <Icon data={TrashBin} size={14} />
                <Label>{t.browser.clearStorage}</Label>
              </Dropdown.Item>
            </Dropdown.Menu>
          </Dropdown.Popover>
        </Dropdown>
      </div>

      {/* Main Content Area */}
      <div
        className={cn(
          'relative min-h-0 flex-1',
          !iframeSrc && 'scrollbar-thin overflow-y-auto',
        )}
      >
        {iframeSrc ? (
          <div
            ref={viewportContainerRef}
            className='absolute inset-0 flex justify-center overflow-hidden'
          >
            <div
              className={cn(
                'relative h-full',
                viewportWidth && !customSize && 'border-separator border-x',
              )}
              style={
                customSize
                  ? {
                      position: 'absolute',
                      top: 0,
                      left: '50%',
                      width: `${customSize.width}px`,
                      height: `${customSize.height}px`,
                      marginLeft: `${-customSize.width / 2}px`,
                      transform:
                        customScale !== 1 ? `scale(${customScale})` : undefined,
                      transformOrigin: 'top center',
                    }
                  : {
                      width: viewportWidth ? `${viewportWidth}px` : '100%',
                      maxWidth: '100%',
                      zoom: tab.zoom === 1 ? undefined : tab.zoom,
                    }
              }
            >
              <iframe
                key={`${iframeSrc}:${tab.reloadNonce}`}
                ref={iframeRef}
                src={iframeSrc}
                title={t.browser.browserPreview}
                className='absolute inset-0 h-full w-full border-0'
                allow='clipboard-read; clipboard-write; fullscreen; autoplay; encrypted-media; picture-in-picture; web-share; geolocation; microphone; camera; midi; payment; usb; display-capture; accelerometer; gyroscope; magnetometer; xr-spatial-tracking'
                allowFullScreen
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
                  className='border-separator bg-surface pointer-events-auto absolute flex w-80 items-center gap-1 rounded-xl border p-1.5 shadow-xl'
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
                    placeholder={t.browser.addNote}
                    className='placeholder:text-muted min-w-0 flex-1 bg-transparent px-2 py-1.5 text-sm outline-none'
                  />

                  <Button
                    isIconOnly
                    type='button'
                    aria-label={t.selectionPopover.submitComment}
                    size='sm'
                    isDisabled={isCapturing}
                    onPress={createAnnotation}
                  >
                    {isCapturing ? (
                      <Spinner size='sm' color='current' />
                    ) : (
                      <Paperclip />
                    )}
                  </Button>
                </div>
              )}

              {/* Connecting Toast Indicator */}
              {!bridgeReady && tab.isInspecting && (
                <div className='border-separator bg-default/95 text-muted pointer-events-auto absolute bottom-3 left-1/2 -translate-x-1/2 rounded-md border px-3 py-1.5 text-xs shadow-lg'>
                  {t.browser.connectingToPreview}
                </div>
              )}
            </div>
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
          <div className='bg-overlay/60 text-muted absolute inset-0 flex items-center justify-center text-sm'>
            {t.common.loading}
          </div>
        )}
      </div>
    </div>
  );
}
