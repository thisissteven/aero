export function buildBridgeScript(
  targetOrigin: string,
  _bridgeNonce: string,
  _previewBasePath: string,
): string {
  const serializedTargetOrigin = JSON.stringify(targetOrigin);

  const script = `
(() => {
  if (window.__aeroPreviewBridgeInstalled) {
    return;
  }

  window.__aeroPreviewBridgeInstalled = true;

  const SOURCE = 'aero-preview-bridge';
  const VERSION = 1;
  const TARGET_ORIGIN = ${serializedTargetOrigin};

  let inspectMode = false;
  let annotationMode = 'element';

  let lastHoverKey = '';

  let previewFrame = 0;
  let pendingPreview = null;

  /*
   * ----------------------------------------------------------
   * Messaging
   * ----------------------------------------------------------
   */

  const post = (payload) => {
    try {
      window.parent?.postMessage(
        {
          source: SOURCE,
          version: VERSION,
          ...payload,
        },
        '*',
      );
    } catch {}
  };

  const schedulePreview = (payload) => {
    pendingPreview = payload;

    if (previewFrame) {
      return;
    }

    previewFrame = requestAnimationFrame(() => {
      previewFrame = 0;

      const next = pendingPreview;
      pendingPreview = null;

      if (next) {
        post(next);
      }
    });
  };

  const clearPreview = () => {
    if (previewFrame) {
      cancelAnimationFrame(previewFrame);
      previewFrame = 0;
    }

    pendingPreview = null;
  };

  /*
   * ----------------------------------------------------------
   * Cursor
   * ----------------------------------------------------------
   */

  const updateCursor = () => {
    if (!inspectMode) {
      document.documentElement.style.cursor = '';
      return;
    }

    document.documentElement.style.cursor = 'pointer';
  };

  /*
   * ----------------------------------------------------------
   * URL helpers
   * ----------------------------------------------------------
   */

  const getPreviewOrigin = () => {
    try {
      return new URL(window.location.href).origin;
    } catch {
      return '';
    }
  };

  const isTargetOrigin = (value) => {
    try {
      const u = typeof value === 'string' ? new URL(value, window.location.href) : value;
      return u.origin === TARGET_ORIGIN;
    } catch {
      return false;
    }
  };

  const toPreviewUrl = (value) => {
    try {
      const parsed = new URL(value, window.location.href);

      if (!isTargetOrigin(parsed)) {
        return parsed.toString();
      }

      const previewOrigin = getPreviewOrigin();

      if (!previewOrigin) {
        return parsed.toString();
      }

      return (
        previewOrigin +
        parsed.pathname +
        parsed.search +
        parsed.hash
      );
    } catch {
      return value;
    }
  };

  /*
   * ----------------------------------------------------------
   * Metadata & Target Helpers
   * ----------------------------------------------------------
   */

  const clip = (value, max = 500) => {
    const text = String(value ?? '')
      .replace(/\\s+/g, ' ')
      .trim();

    return text.length > max ? text.slice(0, max) + '...' : text;
  };

  const escapeCss = (str) => {
    if (typeof CSS !== 'undefined' && typeof CSS.escape === 'function') {
      return CSS.escape(str);
    }
    return String(str).replace(/([^\\w-])/g, '\\\\$1');
  };

  const getClassName = (element) => {
    if (!element) return '';
    if (typeof element.className === 'string') return element.className;
    if (element.className && typeof element.className.baseVal === 'string') {
      return element.className.baseVal;
    }
    return element.getAttribute?.('class') || '';
  };

  const getClassList = (element) => {
    const str = getClassName(element);
    return str ? str.trim().split(/\\s+/).filter(Boolean) : [];
  };

  const selectorPart = (element) => {
    const tag = element.tagName.toLowerCase();

    if (
      element.id &&
      typeof element.id === 'string' &&
      /^[A-Za-z][\\w:.-]*$/.test(element.id)
    ) {
      return tag + '#' + escapeCss(element.id);
    }

    const testId =
      element.getAttribute?.('data-testid') ||
      element.getAttribute?.('data-test') ||
      element.getAttribute?.('data-cy');

    if (testId) {
      return tag + '[data-testid="' + escapeCss(testId) + '"]';
    }

    const classes = getClassList(element)
      .slice(0, 3)
      .map((entry) => '.' + escapeCss(entry))
      .join('');

    return tag + classes;
  };

  const buildSelector = (element) => {
    const parts = [];
    let current = element;

    while (
      current &&
      current.nodeType === Node.ELEMENT_NODE &&
      current !== document.documentElement
    ) {
      let part = selectorPart(current);
      const parent = current.parentElement;

      if (parent) {
        const siblings = Array.from(parent.children).filter(
          (child) => child.tagName === current.tagName,
        );

        if (
          siblings.length > 1 &&
          !part.includes('#') &&
          !part.includes('[data-testid=')
        ) {
          part +=
            ':nth-of-type(' +
            (siblings.indexOf(current) + 1) +
            ')';
        }
      }

      parts.unshift(part);

      if (part.includes('#')) {
        break;
      }

      current = parent;
    }

    return parts.join(' > ');
  };

  const metadataForElement = (element) => {
    if (!element || !(element instanceof Element)) {
      return null;
    }

    const rect = element.getBoundingClientRect();
    const style = window.getComputedStyle(element);
    const attributes = {};

    for (const name of [
      'id',
      'class',
      'role',
      'aria-label',
      'href',
      'src',
      'data-testid',
      'data-test',
      'data-cy',
    ]) {
      const value = element.getAttribute(name);
      if (value) {
        attributes[name] = clip(value, 300);
      }
    }

    const ancestry = [];
    let current = element;

    while (
      current &&
      current.nodeType === Node.ELEMENT_NODE &&
      ancestry.length < 6
    ) {
      ancestry.unshift({
        tag: current.tagName.toLowerCase(),
        id: current.id || undefined,
        className: clip(getClassName(current), 200) || undefined,
        selectorPart: selectorPart(current),
      });

      current = current.parentElement;
    }

    return {
      frame: 'top',
      tag: element.tagName.toLowerCase(),
      id: element.id || undefined,
      classes: getClassList(element),
      text: clip(element.innerText || element.textContent || ''),
      selector: buildSelector(element),
      path: ancestry.map((entry) => entry.tag).join(' > '),
      bounds: {
        x: rect.x,
        y: rect.y,
        width: rect.width,
        height: rect.height,
      },
      center: {
        x: rect.x + rect.width / 2,
        y: rect.y + rect.height / 2,
      },
      attributes,
      computedStyle: {
        display: style.display,
        position: style.position,
        color: style.color,
        backgroundColor: style.backgroundColor,
        fontFamily: style.fontFamily,
        fontSize: style.fontSize,
        fontWeight: style.fontWeight,
        lineHeight: style.lineHeight,
        zIndex: style.zIndex,
      },
      ancestry,
    };
  };

  const hoverKeyForTarget = (target) => {
    if (!target) {
      return '';
    }

    const bounds = target.bounds || {};

    return [
      target.selector,
      Math.round(bounds.x || 0),
      Math.round(bounds.y || 0),
      Math.round(bounds.width || 0),
      Math.round(bounds.height || 0),
    ].join('|');
  };

  /*
   * ----------------------------------------------------------
   * Hover
   * ----------------------------------------------------------
   */

  const sendHover = (event) => {
    if (!inspectMode || annotationMode !== 'element') {
      return;
    }

    const element = document.elementFromPoint(event.clientX, event.clientY);

    if (!element || !(element instanceof Element)) {
      if (lastHoverKey) {
        lastHoverKey = '';

        post({
          type: 'hover',
          target: null,
          pointer: {
            x: event.clientX,
            y: event.clientY,
          },
          ts: Date.now(),
        });
      }

      return;
    }

    const target = metadataForElement(element);
    const key = hoverKeyForTarget(target);

    if (key === lastHoverKey) {
      return;
    }

    lastHoverKey = key;

    post({
      type: 'hover',
      target,
      pointer: {
        x: event.clientX,
        y: event.clientY,
      },
      ts: Date.now(),
    });
  };

  document.addEventListener('mousemove', sendHover, true);

  /*
   * ----------------------------------------------------------
   * Element selection
   * ----------------------------------------------------------
   */

  document.addEventListener(
    'click',
    (event) => {
      if (!inspectMode || annotationMode !== 'element') {
        return;
      }

      if (event.button !== 0 || event.defaultPrevented) {
        return;
      }

      const element = document.elementFromPoint(
        event.clientX,
        event.clientY,
      );

      if (!element || !(element instanceof Element)) {
        return;
      }

      const target = metadataForElement(element);

      if (!target) {
        return;
      }

      const bounds = {
        x: target.bounds.x,
        y: target.bounds.y,
        width: target.bounds.width,
        height: target.bounds.height,
      };

      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();

      lastHoverKey = '';

      post({
        type: 'select',
        target,
        selection: {
          mode: 'element',
          target,
          bounds,
        },
        ts: Date.now(),
      });

      post({
        type: 'hover',
        target: null,
        pointer: {
          x: event.clientX,
          y: event.clientY,
        },
        ts: Date.now(),
      });
    },
    true,
  );

  /*
   * ----------------------------------------------------------
   * Inspect mode
   * ----------------------------------------------------------
   */

  const clearInteraction = () => {
    lastHoverKey = '';

    clearPreview();

    post({
      type: 'hover',
      target: null,
      pointer: {
        x: 0,
        y: 0,
      },
      ts: Date.now(),
    });

    post({
      type: 'selection-preview',
      selection: null,
      ts: Date.now(),
    });
  };

  const setInspectMode = (enabled) => {
    inspectMode = enabled === true;

    if (!inspectMode) {
      clearInteraction();
      updateCursor();
      return;
    }

    updateCursor();
  };

  /*
   * ----------------------------------------------------------
   * Parent communication
   * ----------------------------------------------------------
   */

  window.addEventListener('message', (event) => {
    if (event.source !== window.parent) {
      return;
    }

    const data = event.data;

    if (
      !data ||
      data.source !== 'aero-preview-parent' ||
      data.version !== VERSION
    ) {
      return;
    }

    if (data.type === 'set-inspect-mode') {
      setInspectMode(data.enabled === true);
      return;
    }

    if (data.type === 'set-annotation-mode') {
      const nextMode = data.mode;

      if (nextMode !== 'element') {
        return;
      }

      annotationMode = nextMode;

      clearPreview();
      lastHoverKey = '';

      updateCursor();

      post({
        type: 'hover',
        target: null,
        pointer: {
          x: 0,
          y: 0,
        },
        ts: Date.now(),
      });

      post({
        type: 'selection-preview',
        selection: null,
        ts: Date.now(),
      });

      return;
    }

    if (data.type === 'history-back') {
      window.history.back();
      return;
    }

    if (data.type === 'history-forward') {
      window.history.forward();
    }
  });

  /*
   * ----------------------------------------------------------
   * Scroll
   * ----------------------------------------------------------
   */

  window.addEventListener(
    'scroll',
    () => {
      if (!inspectMode) {
        return;
      }

      lastHoverKey = '';

      post({
        type: 'hover',
        target: null,
        pointer: {
          x: 0,
          y: 0,
        },
        ts: Date.now(),
      });
    },
    true,
  );

  /*
   * ----------------------------------------------------------
   * History
   * ----------------------------------------------------------
   */

  const historyEntries = [window.location.href];
  let historyIndex = 0;

  const notifyNavigation = () => {
    post({
      type: 'navigate-preview',
      url: window.location.href,
      title: document.title || '',
    });

    post({
      type: 'history-state',
      url: window.location.href,
      canGoBack: historyIndex > 0,
      canGoForward: historyIndex < historyEntries.length - 1,
    });
  };

  if (window.history) {
    const nativePushState = window.history.pushState.bind(window.history);
    const nativeReplaceState = window.history.replaceState.bind(
      window.history,
    );

    window.history.pushState = function (state, unused, url) {
      const nextUrl =
        url == null ? url : toPreviewUrl(String(url));

      const result = nativePushState(state, unused, nextUrl);

      historyEntries.splice(historyIndex + 1);
      historyEntries.push(window.location.href);
      historyIndex = historyEntries.length - 1;

      queueMicrotask(notifyNavigation);

      return result;
    };

    window.history.replaceState = function (state, unused, url) {
      const nextUrl =
        url == null ? url : toPreviewUrl(String(url));

      const result = nativeReplaceState(state, unused, nextUrl);

      historyEntries[historyIndex] = window.location.href;

      queueMicrotask(notifyNavigation);

      return result;
    };

    window.addEventListener('popstate', () => {
      const current = window.location.href;
      const existingIndex = historyEntries.indexOf(current);

      if (existingIndex >= 0) {
        historyIndex = existingIndex;
      } else {
        historyEntries.push(current);
        historyIndex = historyEntries.length - 1;
      }

      queueMicrotask(notifyNavigation);
    });

    window.addEventListener('hashchange', () => {
      historyEntries[historyIndex] = window.location.href;
      queueMicrotask(notifyNavigation);
    });
  }

  /*
   * ----------------------------------------------------------
   * Normal navigation
   * ----------------------------------------------------------
   */

  document.addEventListener(
    'click',
    (event) => {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      ) {
        return;
      }

      if (inspectMode) {
        return;
      }

      const target = event.target;

      if (!target || typeof target.closest !== 'function') {
        return;
      }

      const anchor = target.closest('a[href]');

      if (!anchor) {
        return;
      }

      if (anchor.target && anchor.target !== '_self') {
        return;
      }

      const rawHref = anchor.getAttribute('href');

      if (
        !rawHref ||
        rawHref.startsWith('#') ||
        /^(?:javascript|mailto|tel|blob|data):/i.test(rawHref)
      ) {
        return;
      }

      try {
        const resolved = new URL(anchor.href, window.location.href);

        if (resolved.origin !== TARGET_ORIGIN) {
          return;
        }

        const previewUrl = toPreviewUrl(resolved.toString());

        if (previewUrl === window.location.href) {
          return;
        }

        event.preventDefault();
        window.location.assign(previewUrl);
      } catch {}
    },
    true,
  );

  /*
   * ----------------------------------------------------------
   * fetch / XHR / EventSource
   * ----------------------------------------------------------
   */

  const proxyUrl = (value) => {
    if (
      typeof value !== 'string' ||
      !value ||
      value.startsWith('#') ||
      /^(?:data|blob|javascript|mailto|tel|about):/i.test(value)
    ) {
      return value;
    }

    try {
      const parsed = new URL(value, window.location.href);

      if (parsed.origin === TARGET_ORIGIN) {
        const previewOrigin = getPreviewOrigin();

        return (
          previewOrigin +
          parsed.pathname +
          parsed.search +
          parsed.hash
        );
      }
    } catch {}

    return value;
  };

  if (typeof window.fetch === 'function') {
    const nativeFetch = window.fetch.bind(window);

    window.fetch = function (input, init) {
      if (typeof input === 'string') {
        return nativeFetch(proxyUrl(input), init);
      }

      if (input instanceof Request) {
        const next = proxyUrl(input.url);

        if (next !== input.url) {
          return nativeFetch(new Request(next, input), init);
        }
      }

      return nativeFetch(input, init);
    };
  }

  if (window.XMLHttpRequest?.prototype) {
    const nativeOpen = window.XMLHttpRequest.prototype.open;

    window.XMLHttpRequest.prototype.open = function (method, url, ...rest) {
      return nativeOpen.call(
        this,
        method,
        typeof url === 'string' ? proxyUrl(url) : url,
        ...rest,
      );
    };
  }

  if (typeof window.EventSource === 'function') {
    const NativeEventSource = window.EventSource;

    const PreviewEventSource = function (url, options) {
      return new NativeEventSource(proxyUrl(String(url)), options);
    };

    PreviewEventSource.prototype = NativeEventSource.prototype;
    Object.setPrototypeOf(PreviewEventSource, NativeEventSource);

    window.EventSource = PreviewEventSource;
  }

  /*
   * ----------------------------------------------------------
   * WebSocket
   * ----------------------------------------------------------
   */

  if (typeof window.WebSocket === 'function') {
    const NativeWebSocket = window.WebSocket;

    const PreviewWebSocket = function (url, protocols) {
      try {
        const parsed = new URL(String(url), window.location.href);

        if (parsed.origin === TARGET_ORIGIN) {
          const preview = new URL(window.location.href);

          parsed.hostname = preview.hostname;
          parsed.port = preview.port;
          parsed.protocol = parsed.protocol === 'https:' ? 'wss:' : 'ws:';

          return protocols === undefined
            ? new NativeWebSocket(parsed.toString())
            : new NativeWebSocket(parsed.toString(), protocols);
        }
      } catch {}

      return protocols === undefined
        ? new NativeWebSocket(url)
        : new NativeWebSocket(url, protocols);
    };

    PreviewWebSocket.prototype = NativeWebSocket.prototype;
    Object.setPrototypeOf(PreviewWebSocket, NativeWebSocket);

    window.WebSocket = PreviewWebSocket;
  }

  /*
   * ----------------------------------------------------------
   * Ready
   * ----------------------------------------------------------
   */

  const postReady = () => {
    post({
      type: 'ready',
      url: window.location.href,
      title: document.title || '',
    });

    post({
      type: 'history-state',
      url: window.location.href,
      canGoBack: historyIndex > 0,
      canGoForward: historyIndex < historyEntries.length - 1,
    });
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', postReady, { once: true });
  } else {
    postReady();
  }
})();
`;

  return `<script nonce="${_bridgeNonce}">${script}</script>`;
}
