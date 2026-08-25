export function buildBridgeScript(
  targetOrigin: string,
  bridgeNonce: string,
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
  let lastHoverKey = '';

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

  /*
   * ------------------------------------------------------------
   * URL helpers
   * ------------------------------------------------------------
   */

  const getPreviewOrigin = () => {
    try {
      return new URL(
        window.location.href,
      ).origin;
    } catch {
      return '';
    }
  };

  const isSameOrigin = (
    a,
    b,
  ) => {
    try {
      return (
        new URL(a).origin ===
        new URL(b).origin
      );
    } catch {
      return false;
    }
  };

  const isTargetOrigin = (value) => {
    try {
      return (
        new URL(value, window.location.href)
          .origin === TARGET_ORIGIN
      );
    } catch {
      return false;
    }
  };

  /*
   * Convert a target-origin URL into a URL on the
   * current preview origin.
   *
   * Example:
   *
   * http://localhost:3000/sessions/foo
   *
   * becomes:
   *
   * http://abc.preview.localhost:5173/sessions/foo
   */
  const toPreviewUrl = (value) => {
    try {
      const parsed = new URL(
        value,
        window.location.href,
      );

      if (!isTargetOrigin(parsed)) {
        return parsed.toString();
      }

      const previewOrigin =
        getPreviewOrigin();

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
   * ------------------------------------------------------------
   * Agentation metadata
   * ------------------------------------------------------------
   */

  const clip = (
    value,
    max = 500,
  ) => {
    const text = String(
      value ?? '',
    )
      .replace(/\\s+/g, ' ')
      .trim();

    return text.length > max
      ? text.slice(0, max) + '...'
      : text;
  };

  const selectorPart = (
    element,
  ) => {
    const tag =
      element.tagName.toLowerCase();

    if (
      element.id &&
      /^[A-Za-z][\\w:.-]*$/.test(
        element.id,
      )
    ) {
      return (
        tag +
        '#' +
        CSS.escape(element.id)
      );
    }

    const testId =
      element.getAttribute(
        'data-testid',
      ) ||
      element.getAttribute(
        'data-test',
      ) ||
      element.getAttribute(
        'data-cy',
      );

    if (testId) {
      return (
        tag +
        '[data-testid="' +
        CSS.escape(testId) +
        '"]'
      );
    }

    const classes =
      Array.from(
        element.classList || [],
      )
        .slice(0, 3)
        .map(
          (entry) =>
            '.' +
            CSS.escape(entry),
        )
        .join('');

    return tag + classes;
  };

  const buildSelector = (
    element,
  ) => {
    const parts = [];
    let current = element;

    while (
      current &&
      current.nodeType ===
        Node.ELEMENT_NODE &&
      current !==
        document.documentElement
    ) {
      let part =
        selectorPart(current);

      const parent =
        current.parentElement;

      if (parent) {
        const siblings =
          Array.from(
            parent.children,
          ).filter(
            (child) =>
              child.tagName ===
              current.tagName,
          );

        if (
          siblings.length > 1 &&
          !part.includes('#') &&
          !part.includes(
            '[data-testid=',
          )
        ) {
          part +=
            ':nth-of-type(' +
            (siblings.indexOf(
              current,
            ) +
              1) +
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

  const metadataForElement = (
    element,
  ) => {
    if (
      !element ||
      element.nodeType !==
        Node.ELEMENT_NODE
    ) {
      return null;
    }

    const rect =
      element.getBoundingClientRect();

    const style =
      window.getComputedStyle(
        element,
      );

    const attributes = {};

    for (
      const name of [
        'id',
        'class',
        'role',
        'aria-label',
        'href',
        'src',
        'data-testid',
        'data-test',
        'data-cy',
      ]
    ) {
      const value =
        element.getAttribute(
          name,
        );

      if (value) {
        attributes[name] =
          clip(value, 300);
      }
    }

    const ancestry = [];
    let current = element;

    while (
      current &&
      current.nodeType ===
        Node.ELEMENT_NODE &&
      ancestry.length < 6
    ) {
      ancestry.unshift({
        tag:
          current.tagName.toLowerCase(),
        id:
          current.id || undefined,
        className:
          clip(
            current.className || '',
            200,
          ) || undefined,
        selectorPart:
          selectorPart(current),
      });

      current =
        current.parentElement;
    }

    return {
      frame: 'top',
      tag:
        element.tagName.toLowerCase(),
      id:
        element.id || undefined,
      classes:
        Array.from(
          element.classList || [],
        ),
      text: clip(
        element.innerText ||
          element.textContent ||
          '',
      ),
      selector:
        buildSelector(element),
      path: ancestry
        .map(
          (entry) => entry.tag,
        )
        .join(' > '),
      bounds: {
        x: rect.x,
        y: rect.y,
        width: rect.width,
        height: rect.height,
      },
      center: {
        x:
          rect.x +
          rect.width / 2,
        y:
          rect.y +
          rect.height / 2,
      },
      attributes,
      computedStyle: {
        display: style.display,
        position: style.position,
        color: style.color,
        backgroundColor:
          style.backgroundColor,
        fontFamily:
          style.fontFamily,
        fontSize:
          style.fontSize,
        fontWeight:
          style.fontWeight,
        lineHeight:
          style.lineHeight,
        zIndex:
          style.zIndex,
      },
      ancestry,
    };
  };

  const hoverKeyForTarget = (
    target,
  ) => {
    if (!target) {
      return '';
    }

    const bounds =
      target.bounds || {};

    return [
      target.selector,
      Math.round(
        bounds.x || 0,
      ),
      Math.round(
        bounds.y || 0,
      ),
      Math.round(
        bounds.width || 0,
      ),
      Math.round(
        bounds.height || 0,
      ),
    ].join('|');
  };

  const sendHover = (
    event,
  ) => {
    if (!inspectMode) {
      return;
    }

    const element =
      document.elementFromPoint(
        event.clientX,
        event.clientY,
      );

    const target =
      metadataForElement(
        element,
      );

    const key =
      hoverKeyForTarget(target);

    if (
      key === lastHoverKey
    ) {
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

  const setInspectMode = (
    enabled,
  ) => {
    inspectMode =
      enabled === true;

    lastHoverKey = '';

    document.documentElement.style.cursor =
      inspectMode
        ? 'crosshair'
        : '';

    if (!inspectMode) {
      post({
        type: 'hover',
        target: null,
        pointer: {
          x: 0,
          y: 0,
        },
        ts: Date.now(),
      });
    }
  };

  /*
   * ------------------------------------------------------------
   * History synchronization
   * ------------------------------------------------------------
   */

  const historyEntries = [
    window.location.href,
  ];

  let historyIndex = 0;

  const notifyNavigation = () => {
    post({
      type: 'navigate-preview',
      url: window.location.href,
      title:
        document.title || '',
    });

    post({
      type: 'history-state',
      url: window.location.href,
      canGoBack:
        historyIndex > 0,
      canGoForward:
        historyIndex <
        historyEntries.length - 1,
    });
  };

  if (window.history) {
    const nativePushState =
      window.history.pushState.bind(
        window.history,
      );

    const nativeReplaceState =
      window.history.replaceState.bind(
        window.history,
      );

    window.history.pushState =
      function (
        state,
        unused,
        url,
      ) {
        /*
         * If the application's router gives us
         * an absolute target-origin URL, convert it
         * to the preview origin before letting the
         * browser process it.
         */
        const nextUrl =
          url == null
            ? url
            : toPreviewUrl(
                String(url),
              );

        const result =
          nativePushState(
            state,
            unused,
            nextUrl,
          );

        historyEntries.splice(
          historyIndex + 1,
        );

        historyEntries.push(
          window.location.href,
        );

        historyIndex =
          historyEntries.length - 1;

        queueMicrotask(
          notifyNavigation,
        );

        return result;
      };

    window.history.replaceState =
      function (
        state,
        unused,
        url,
      ) {
        const nextUrl =
          url == null
            ? url
            : toPreviewUrl(
                String(url),
              );

        const result =
          nativeReplaceState(
            state,
            unused,
            nextUrl,
          );

        historyEntries[
          historyIndex
        ] = window.location.href;

        queueMicrotask(
          notifyNavigation,
        );

        return result;
      };

    window.addEventListener(
      'popstate',
      () => {
        const current =
          window.location.href;

        const existingIndex =
          historyEntries.indexOf(
            current,
          );

        if (
          existingIndex >= 0
        ) {
          historyIndex =
            existingIndex;
        } else {
          /*
           * Browser performed a real history
           * navigation that our mirror did not
           * previously observe.
           */
          historyEntries.push(
            current,
          );

          historyIndex =
            historyEntries.length - 1;
        }

        queueMicrotask(
          notifyNavigation,
        );
      },
    );

    window.addEventListener(
      'hashchange',
      () => {
        historyEntries[
          historyIndex
        ] = window.location.href;

        queueMicrotask(
          notifyNavigation,
        );
      },
    );
  }

  /*
   * ------------------------------------------------------------
   * Normal link navigation
   * ------------------------------------------------------------
   *
   * This is the important missing part.
   *
   * History.pushState() only catches SPA routers.
   * A plain <a href="http://localhost:5173/foo">
   * performs a real browser navigation.
   *
   * Convert same-target-origin links to the
   * preview origin before the browser follows them.
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

      const target =
        event.target;

      if (
        !target ||
        typeof target.closest !==
          'function'
      ) {
        return;
      }

      const anchor =
        target.closest(
          'a[href]',
        );

      if (!anchor) {
        return;
      }

      if (
        anchor.target &&
        anchor.target !==
          '_self'
      ) {
        return;
      }

      const rawHref =
        anchor.getAttribute(
          'href',
        );

      if (
        !rawHref ||
        rawHref.startsWith(
          '#',
        ) ||
        /^(?:javascript|mailto|tel|blob|data):/i.test(
          rawHref,
        )
      ) {
        return;
      }

      try {
        const resolved =
          new URL(
            anchor.href,
            window.location.href,
          );

        if (
          resolved.origin !==
          TARGET_ORIGIN
        ) {
          return;
        }

        const previewUrl =
          toPreviewUrl(
            resolved.toString(),
          );

        if (
          previewUrl ===
          window.location.href
        ) {
          return;
        }

        event.preventDefault();

        /*
         * Setting location to the preview-origin
         * URL means the iframe remains on the
         * preview hostname.
         *
         * The proxy then serves the target path.
         */
        window.location.assign(
          previewUrl,
        );
      } catch {}
    },
    true,
  );

  /*
   * ------------------------------------------------------------
   * fetch / XHR / EventSource
   * ------------------------------------------------------------
   */

  const proxyUrl = (
    value,
  ) => {
    if (
      typeof value !==
        'string' ||
      !value ||
      value.startsWith(
        '#',
      ) ||
      /^(?:data|blob|javascript|mailto|tel|about):/i.test(
        value,
      )
    ) {
      return value;
    }

    try {
      const parsed =
        new URL(
          value,
          window.location.href,
        );

      if (
        parsed.origin ===
        TARGET_ORIGIN
      ) {
        const previewOrigin =
          getPreviewOrigin();

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

  if (
    typeof window.fetch ===
    'function'
  ) {
    const nativeFetch =
      window.fetch.bind(
        window,
      );

    window.fetch =
      function (
        input,
        init,
      ) {
        if (
          typeof input ===
          'string'
        ) {
          return nativeFetch(
            proxyUrl(input),
            init,
          );
        }

        if (
          input instanceof
          Request
        ) {
          const next =
            proxyUrl(
              input.url,
            );

          if (
            next !==
            input.url
          ) {
            return nativeFetch(
              new Request(
                next,
                input,
              ),
              init,
            );
          }
        }

        return nativeFetch(
          input,
          init,
        );
      };
  }

  if (
    window.XMLHttpRequest?.prototype
  ) {
    const nativeOpen =
      window.XMLHttpRequest
        .prototype.open;

    window.XMLHttpRequest.prototype.open =
      function (
        method,
        url,
        ...rest
      ) {
        return nativeOpen.call(
          this,
          method,
          typeof url ===
            'string'
            ? proxyUrl(url)
            : url,
          ...rest,
        );
      };
  }

  if (
    typeof window.EventSource ===
    'function'
  ) {
    const NativeEventSource =
      window.EventSource;

    const PreviewEventSource =
      function (
        url,
        options,
      ) {
        return new NativeEventSource(
          proxyUrl(
            String(url),
          ),
          options,
        );
      };

    PreviewEventSource.prototype =
      NativeEventSource.prototype;

    Object.setPrototypeOf(
      PreviewEventSource,
      NativeEventSource,
    );

    window.EventSource =
      PreviewEventSource;
  }

  /*
   * ------------------------------------------------------------
   * WebSocket
   * ------------------------------------------------------------
   */

  if (
    typeof window.WebSocket ===
    'function'
  ) {
    const NativeWebSocket =
      window.WebSocket;

    const PreviewWebSocket =
      function (
        url,
        protocols,
      ) {
        try {
          const parsed =
            new URL(
              String(url),
              window.location.href,
            );

          if (
            parsed.origin ===
            TARGET_ORIGIN
          ) {
            const preview =
              new URL(
                window.location.href,
              );

            parsed.hostname =
              preview.hostname;

            parsed.port =
              preview.port;

            parsed.protocol =
              parsed.protocol ===
              'https:'
                ? 'wss:'
                : 'ws:';

            return protocols ===
              undefined
              ? new NativeWebSocket(
                  parsed.toString(),
                )
              : new NativeWebSocket(
                  parsed.toString(),
                  protocols,
                );
          }
        } catch {}

        return protocols ===
          undefined
          ? new NativeWebSocket(
              url,
            )
          : new NativeWebSocket(
              url,
              protocols,
            );
      };

    PreviewWebSocket.prototype =
      NativeWebSocket.prototype;

    Object.setPrototypeOf(
      PreviewWebSocket,
      NativeWebSocket,
    );

    window.WebSocket =
      PreviewWebSocket;
  }

  /*
   * ------------------------------------------------------------
   * Agentation
   * ------------------------------------------------------------
   */

  window.addEventListener(
    'mousemove',
    sendHover,
    true,
  );

  window.addEventListener(
    'mouseleave',
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

  window.addEventListener(
    'click',
    (event) => {
      if (!inspectMode) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();

      const element =
        document.elementFromPoint(
          event.clientX,
          event.clientY,
        );

      const metadata =
        metadataForElement(
          element,
        );

      if (metadata) {
        post({
          type: 'select',
          target: metadata,
          pointer: {
            x: event.clientX,
            y: event.clientY,
          },
          ts: Date.now(),
        });
      }
    },
    true,
  );

  /*
   * ------------------------------------------------------------
   * Parent communication
   * ------------------------------------------------------------
   */

  window.addEventListener(
    'message',
    (event) => {
      if (
        event.source !==
        window.parent
      ) {
        return;
      }

      const data =
        event.data;

      if (
        !data ||
        data.source !==
          'aero-preview-parent' ||
        data.version !== VERSION
      ) {
        return;
      }

      if (
        data.type ===
        'set-inspect-mode'
      ) {
        setInspectMode(
          data.enabled === true,
        );

        return;
      }

      if (
        data.type ===
        'history-back'
      ) {
        window.history.back();
        return;
      }

      if (
        data.type ===
        'history-forward'
      ) {
        window.history.forward();
        return;
      }
    },
  );

  /*
   * ------------------------------------------------------------
   * Initial ready
   * ------------------------------------------------------------
   */

  const postReady = () => {
    post({
      type: 'ready',
      url: window.location.href,
      title:
        document.title || '',
    });

    post({
      type: 'history-state',
      url: window.location.href,
      canGoBack:
        historyIndex > 0,
      canGoForward:
        historyIndex <
        historyEntries.length - 1,
    });
  };

  if (
    document.readyState ===
    'loading'
  ) {
    document.addEventListener(
      'DOMContentLoaded',
      postReady,
      { once: true },
    );
  } else {
    postReady();
  }
})();
`;

  return `<script nonce="${bridgeNonce}">${script}</script>`;
}
