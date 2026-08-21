// server/lib/preview/bridge-script.ts

export function buildBridgeScript(
  targetOrigin: string,
  nonce?: string,
): string {
  const nonceAttr = nonce ? ` nonce="${nonce}"` : '';
  return `<script${nonceAttr}>window.__aeroPreviewTargetOrigin=${JSON.stringify(targetOrigin)};</script>
<script id="aero-preview-bridge"${nonceAttr}>${BRIDGE_SCRIPT_BODY}</script>`;
}

const BRIDGE_SCRIPT_BODY = String.raw`(() => {
  if (window.__aeroPreviewBridgeInstalled) return;
  window.__aeroPreviewBridgeInstalled = true;

  const SOURCE = 'aero-preview-bridge';
  const PARENT_SOURCE = 'aero-preview-parent';
  const VERSION = 1;
  const TARGET_ORIGIN = typeof window.__aeroPreviewTargetOrigin === 'string' ? window.__aeroPreviewTargetOrigin : '';
  let inspecting = false;

  // More robust parent origin detection
  const parentOrigin = (() => {
    try {
      // Try ancestorOrigins first (most reliable for iframes)
      const ancestorOrigins = window.location.ancestorOrigins;
      if (ancestorOrigins && ancestorOrigins.length > 0) {
        const ao = ancestorOrigins[0];
        if (ao && ao !== 'null') return ao;
      }
    } catch {}

    try {
      // Fallback to document.referrer
      const ref = document.referrer ? new URL(document.referrer).origin : '';
      if (ref && ref !== 'null') return ref;
    } catch {}

    try {
      // Last resort: if we're in an iframe, parent is same-origin or we can try window.parent
      if (window.parent && window.parent !== window) {
        // We can't read parent.location cross-origin, but we can try
        return window.parent.location.origin;
      }
    } catch {}

    return '';
  })();

  // Store parentOrigin globally so late-registered handlers can use it
  window.__aeroPreviewParentOrigin = parentOrigin;

  const post = (payload) => {
    try {
      const origin = window.__aeroPreviewParentOrigin || parentOrigin;
      if (origin && window.parent && window.parent !== window) {
        window.parent.postMessage(Object.assign({ source: SOURCE, version: VERSION }, payload), origin);
      }
    } catch {}
  };

  // ---- proxy path resolution -------------------------------------------
  const proxyMatch = window.location.pathname.match(/^(\/api\/preview\/p\/[A-Za-z0-9_-]{6,32})(?:\/|$)/);
  const proxyBase = proxyMatch ? proxyMatch[1] : '';
  const searchParams = new URL(window.location.href).searchParams;
  const previewToken = searchParams.get('oc_preview_token') || '';

  const shouldProxyPath = (pathname) =>
    typeof pathname === 'string' && pathname.startsWith('/') && !pathname.startsWith('//') && !pathname.startsWith(proxyBase);

  const withProxyAuth = (value) => {
    if (!previewToken) return value;
    try {
      const parsed = new URL(value, window.location.origin);
      parsed.searchParams.set('oc_preview_token', previewToken);
      return parsed.pathname + parsed.search + parsed.hash;
    } catch { return value; }
  };

  const proxiedUrl = (value) => {
    if (typeof value !== 'string' || !proxyBase) return value;
    if (value.startsWith('/')) {
      if (value.startsWith(proxyBase)) return withProxyAuth(value);
      if (!shouldProxyPath(value)) return value;
      return withProxyAuth(proxyBase + value);
    }
    try {
      const parsed = new URL(value, window.location.href);
      if (parsed.origin === window.location.origin && shouldProxyPath(parsed.pathname)) {
        return withProxyAuth(proxyBase + parsed.pathname + parsed.search + parsed.hash);
      }
    } catch {}
    return value;
  };

  const proxiedWsUrl = (value) => {
    if (typeof value !== 'string' || !proxyBase) return value;
    try {
      const parsed = new URL(value, window.location.href);
      const current = new URL(window.location.href);
      const isWs = parsed.protocol === 'ws:' || parsed.protocol === 'wss:';
      if (isWs && parsed.host === current.host && shouldProxyPath(parsed.pathname)) {
        parsed.pathname = proxyBase + parsed.pathname;
        if (previewToken) parsed.searchParams.set('oc_preview_token', previewToken);
        return parsed.toString();
      }
    } catch {}
    return value;
  };

  const proxiedNavUrl = (value) => {
    if (typeof value !== 'string') return value;
    try {
      const parsed = new URL(value, window.location.href);
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return value;
      if (parsed.origin === window.location.origin && shouldProxyPath(parsed.pathname)) {
        return withProxyAuth(proxyBase + parsed.pathname + parsed.search + parsed.hash);
      }
      const host = parsed.hostname;
      const isLoopback = host === 'localhost' || host === '127.0.0.1' || host === '0.0.0.0' || host === '::1';
      if ((isLoopback || parsed.origin !== window.location.origin) && TARGET_ORIGIN) return value;
      return proxiedUrl(value);
    } catch { return value; }
  };

  // ---- patch the five API surfaces almost everything funnels through ----
  if (proxyBase) {
    if (window.history) {
      const nativePush = window.history.pushState.bind(window.history);
      window.history.pushState = (state, unused, url) =>
        nativePush(state, unused, url === undefined ? url : proxiedNavUrl(String(url)));
      const nativeReplace = window.history.replaceState.bind(window.history);
      window.history.replaceState = (state, unused, url) =>
        nativeReplace(state, unused, url === undefined ? url : proxiedNavUrl(String(url)));
    }

    if (typeof window.fetch === 'function') {
      const nativeFetch = window.fetch.bind(window);
      window.fetch = (input, init) => {
        if (typeof input === 'string') return nativeFetch(proxiedUrl(input), init);
        if (input instanceof Request) {
          try {
            const parsed = new URL(input.url);
            if (parsed.origin === window.location.origin && shouldProxyPath(parsed.pathname)) {
              return nativeFetch(new Request(withProxyAuth(proxyBase + parsed.pathname + parsed.search + parsed.hash), input), init);
            }
          } catch {}
        }
        return nativeFetch(input, init);
      };
    }

    if (window.XMLHttpRequest) {
      const nativeOpen = window.XMLHttpRequest.prototype.open;
      window.XMLHttpRequest.prototype.open = function (method, url, ...rest) {
        return nativeOpen.call(this, method, typeof url === 'string' ? proxiedUrl(url) : url, ...rest);
      };
    }

    if (typeof window.EventSource === 'function') {
      const NativeES = window.EventSource;
      window.EventSource = function (url, opts) { return new NativeES(proxiedUrl(String(url)), opts); };
      window.EventSource.prototype = NativeES.prototype;
    }

    if (typeof window.WebSocket === 'function') {
      const NativeWS = window.WebSocket;
      function PatchedWebSocket(url, protocols) {
        const nextUrl = proxiedWsUrl(String(url));
        return arguments.length === 1 ? new NativeWS(nextUrl) : new NativeWS(nextUrl, protocols);
      }
      PatchedWebSocket.prototype = NativeWS.prototype;
      window.WebSocket = PatchedWebSocket;
    }
  }

  // ---- agentation: hover/select for element picking ----------------------
  const selectorPart = (el) => {
    const tag = el.tagName.toLowerCase();
    if (el.id && /^[A-Za-z][\w:.-]*$/.test(el.id)) return tag + '#' + CSS.escape(el.id);
    const classes = Array.from(el.classList || []).slice(0, 3).map((c) => '.' + CSS.escape(c)).join('');
    return tag + classes;
  };
  const buildSelector = (el) => {
    const parts = [];
    let cur = el;
    while (cur && cur.nodeType === 1 && cur !== document.documentElement && parts.length < 6) {
      parts.unshift(selectorPart(cur));
      if (parts[0].includes('#')) break;
      cur = cur.parentElement;
    }
    return parts.join(' > ');
  };
  const clip = (v, max = 300) => String(v || '').replace(/\s+/g, ' ').trim().slice(0, max);
  const describe = (el) => {
    const r = el.getBoundingClientRect();
    return {
      tag: el.tagName.toLowerCase(),
      id: el.id || undefined,
      classes: Array.from(el.classList || []),
      text: clip(el.innerText || el.textContent || '', 140),
      selector: buildSelector(el),
      bounds: { x: r.x, y: r.y, width: r.width, height: r.height },
    };
  };

  document.addEventListener('mousemove', (e) => {
    if (!inspecting) return;
    const el = document.elementFromPoint(e.clientX, e.clientY);
    if (el) post({ type: 'hover', target: describe(el) });
  }, true);

  document.addEventListener('click', (e) => {
    const anchor = e.target && e.target.closest ? e.target.closest('a[href]') : null;
    if (anchor && !inspecting) {
      const href = proxiedNavUrl(anchor.href);
      if (href !== anchor.href) {
        e.preventDefault(); e.stopPropagation();
        post({ type: 'navigate-preview', url: href });
      }
      return;
    }
    if (!inspecting) return;
    e.preventDefault(); e.stopPropagation();
    const el = document.elementFromPoint(e.clientX, e.clientY);
    if (el) post({ type: 'select', target: describe(el) });
  }, true);

  window.addEventListener('message', (e) => {
    const d = e.data;
    if (!d || d.source !== PARENT_SOURCE || d.version !== VERSION) return;
    if (d.type === 'set-inspect-mode') inspecting = !!d.enabled;
  });

  // Debounce ready events — only fire once, and wait a tick to ensure parent is listening
  let readyFired = false;
  const fireReady = () => {
    if (readyFired) return;
    readyFired = true;
    post({ type: 'ready', url: location.href, title: document.title });
  };

  // Fire on DOMContentLoaded, or immediately if already loaded
  if (document.readyState === 'loading') {
    window.addEventListener('DOMContentLoaded', fireReady);
  } else {
    // Small delay to ensure parent's message listener is set up
    setTimeout(fireReady, 50);
  }
})();`;
