export function buildBridgeScript(
  targetOrigin: string,
  bridgeNonce: string,
  proxyBasePath: string,
): string {
  const origin = JSON.stringify(targetOrigin);
  const proxyBase = JSON.stringify(proxyBasePath.replace(/\/+$/, ''));

  const script = `
(() => {
  if (window.__aeroPreviewBridgeInstalled) return;
  window.__aeroPreviewBridgeInstalled = true;

  const TARGET_ORIGIN = ${origin};
  const PROXY_BASE = ${proxyBase};

  const isPreviewPath = (pathname) =>
    pathname === PROXY_BASE ||
    pathname.startsWith(PROXY_BASE + '/');

  const proxyPath = (pathname) => {
    if (
      typeof pathname !== 'string' ||
      !pathname.startsWith('/') ||
      pathname.startsWith('//')
    ) {
      return pathname;
    }

    return isPreviewPath(pathname)
      ? pathname
      : PROXY_BASE + pathname;
  };

  const proxyUrl = (value) => {
    if (
      typeof value !== 'string' ||
      !value ||
      value.startsWith('#') ||
      /^(?:data|blob|javascript|mailto|tel|about):/i.test(value)
    ) {
      return value;
    }

    if (
      value === PROXY_BASE ||
      value.startsWith(PROXY_BASE + '/')
    ) {
      return value;
    }

    if (
      value.startsWith('/') &&
      !value.startsWith('//')
    ) {
      return proxyPath(value);
    }

    try {
      const parsed = new URL(
        value,
        window.location.href,
      );

      if (
        parsed.origin === TARGET_ORIGIN
      ) {
        return (
          proxyPath(parsed.pathname) +
          parsed.search +
          parsed.hash
        );
      }
    } catch {}

    return value;
  };

  /*
   * Keep the target application's router seeing its
   * real pathname instead of /api/preview/p/:id.
   */
  try {
    const current = new URL(window.location.href);

    if (isPreviewPath(current.pathname)) {
      const pathname =
        current.pathname.slice(PROXY_BASE.length) || '/';

      window.history.replaceState(
        window.history.state,
        '',
        pathname + current.search + current.hash,
      );
    }
  } catch {}

  if (typeof window.fetch === 'function') {
    const nativeFetch = window.fetch.bind(window);

    window.fetch = function(input, init) {
      if (typeof input === 'string') {
        return nativeFetch(proxyUrl(input), init);
      }

      if (input instanceof Request) {
        const next = proxyUrl(input.url);

        if (next !== input.url) {
          return nativeFetch(
            new Request(next, input),
            init,
          );
        }
      }

      return nativeFetch(input, init);
    };
  }

  if (window.XMLHttpRequest?.prototype) {
    const nativeOpen =
      window.XMLHttpRequest.prototype.open;

    window.XMLHttpRequest.prototype.open =
      function(method, url, ...rest) {
        return nativeOpen.call(
          this,
          method,
          typeof url === 'string'
            ? proxyUrl(url)
            : url,
          ...rest,
        );
      };
  }

  if (typeof window.EventSource === 'function') {
    const NativeEventSource = window.EventSource;

    const AeroEventSource = function(url, options) {
      return new NativeEventSource(
        proxyUrl(String(url)),
        options,
      );
    };

    AeroEventSource.prototype =
      NativeEventSource.prototype;

    Object.setPrototypeOf(
      AeroEventSource,
      NativeEventSource,
    );

    window.EventSource = AeroEventSource;
  }

  if (typeof window.WebSocket === 'function') {
    const NativeWebSocket = window.WebSocket;

    const AeroWebSocket = function(url, protocols) {
      try {
        const parsed = new URL(
          String(url),
          window.location.href,
        );

        if (parsed.origin === TARGET_ORIGIN) {
          parsed.pathname = proxyPath(
            parsed.pathname,
          );

          parsed.protocol =
            parsed.protocol === 'https:'
              ? 'wss:'
              : 'ws:';

          return protocols === undefined
            ? new NativeWebSocket(parsed.toString())
            : new NativeWebSocket(
                parsed.toString(),
                protocols,
              );
        }
      } catch {}

      return protocols === undefined
        ? new NativeWebSocket(url)
        : new NativeWebSocket(url, protocols);
    };

    AeroWebSocket.prototype =
      NativeWebSocket.prototype;

    Object.setPrototypeOf(
      AeroWebSocket,
      NativeWebSocket,
    );

    window.WebSocket = AeroWebSocket;
  }

  const rewriteNavigation = (value) => {
    if (
      typeof value !== 'string' ||
      !value
    ) {
      return value;
    }

    try {
      const parsed = new URL(
        value,
        window.location.href,
      );

      if (parsed.origin === TARGET_ORIGIN) {
        return (
          proxyPath(parsed.pathname) +
          parsed.search +
          parsed.hash
        );
      }

      return value;
    } catch {
      return value;
    }
  };

  if (window.history) {
    const pushState =
      window.history.pushState.bind(
        window.history,
      );

    const replaceState =
      window.history.replaceState.bind(
        window.history,
      );

    window.history.pushState =
      function(state, unused, url) {
        return pushState(
          state,
          unused,
          url == null
            ? url
            : rewriteNavigation(String(url)),
        );
      };

    window.history.replaceState =
      function(state, unused, url) {
        return replaceState(
          state,
          unused,
          url == null
            ? url
            : rewriteNavigation(String(url)),
        );
      };
  }

  const parentOrigin = (() => {
    try {
      return document.referrer
        ? new URL(document.referrer).origin
        : '';
    } catch {
      return '';
    }
  })();

  if (parentOrigin) {
    window.addEventListener('message', (event) => {
      if (
        event.source !== window.parent ||
        !event.data ||
        event.data.source !== 'aero-preview-parent' ||
        event.data.version !== 1
      ) {
        return;
      }

      if (event.data.type === 'set-inspect-mode') {
        document.documentElement.style.cursor =
          event.data.enabled
            ? 'crosshair'
            : '';
      }
    });

    try {
      window.parent.postMessage(
        {
          source: 'aero-preview-bridge',
          version: 1,
          type: 'ready',
          url: window.location.href,
          title: document.title || '',
        },
        parentOrigin,
      );
    } catch {}
  }
})();
`;

  return `<script nonce="${bridgeNonce}">${script}</script>`;
}
