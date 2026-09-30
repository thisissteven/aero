export function buildBridgeScript(
  targetOrigin: string,
  bridgeNonce: string,
  previewBasePath: string,
): string {
  const serializedTargetOrigin = JSON.stringify(targetOrigin);

  const normalizedBasePath = (previewBasePath || '').replace(/\/+$/, '');

  // Same-origin to the iframe: served by the proxy itself, not the upstream.
  const reservedModuleUrl = `${normalizedBasePath}/__aero_internal__/snapdom.mjs`;

  // Same-origin redirector that turns an arbitrary absolute URL into its own
  // proxied preview target. Used for cross-origin iframes so their framing and
  // CSP headers are stripped by the proxy.
  const embedUrl = `${normalizedBasePath}/__aero_internal__/embed`;

  const serializedReservedModuleUrl = JSON.stringify(reservedModuleUrl);

  const serializedEmbedUrl = JSON.stringify(embedUrl);

  const script = `
(() => {
  if (window.__aeroPreviewBridgeInstalled) {
    return;
  }

  window.__aeroPreviewBridgeInstalled = true;

  /*
   * A service worker registered by the previewed app would serve its own
   * app-shell cache for this origin and bypass the proxy, breaking requests
   * and the bridge. Preview pages must not own a service worker.
   *
   * Remove the capability outright so feature detection ('serviceWorker' in
   * navigator) reports it as unsupported. Defining serviceWorker as undefined
   * left the property present, so PWA libraries (e.g. Workbox) passed the guard
   * and then crashed on navigator.serviceWorker.addEventListener.
   */
  try {
    try {
      if (typeof Navigator !== 'undefined' && Navigator.prototype) {
        delete Navigator.prototype.serviceWorker;
      }
    } catch {}

    try {
      delete navigator.serviceWorker;
    } catch {}

    let present = false;

    try {
      present = 'serviceWorker' in navigator;
    } catch {}

    /*
     * If the runtime would not let us remove the capability, expose a benign
     * stub instead. Registration is refused (a real worker would bypass the
     * proxy) but the common container API exists, so callers never dereference
     * an undefined serviceWorker.
     */
    if (present) {
      const noop = () => {};
      const registration = {
        active: null,
        installing: null,
        waiting: null,
        scope: '/',
        update: () => Promise.resolve(),
        unregister: () => Promise.resolve(true),
        addEventListener: noop,
        removeEventListener: noop,
        dispatchEvent: () => false,
      };

      Object.defineProperty(navigator, 'serviceWorker', {
        configurable: true,
        value: {
          controller: null,
          ready: Promise.resolve(registration),
          addEventListener: noop,
          removeEventListener: noop,
          dispatchEvent: () => false,
          register: () => Promise.resolve(registration),
          getRegistration: () => Promise.resolve(registration),
          getRegistrations: () => Promise.resolve([registration]),
          onmessage: null,
          oncontrollerchange: null,
        },
      });
    }
  } catch {}

  const SOURCE = 'aero-preview-bridge';
  const VERSION = 1;
  const TARGET_ORIGIN = ${serializedTargetOrigin};
  const RESERVED_MODULE_URL = ${serializedReservedModuleUrl};
  const EMBED_URL = ${serializedEmbedUrl};
  const HISTORY_INDEX_KEY = '__aeroHistoryIndex';

  let inspectMode = false;
  let annotationMode = 'element';

  let lastHoverKey = '';

  let currentSelection = null;
  let capturing = false;

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

      currentSelection = {
        mode: 'element',
        target,
        bounds,
      };

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
    currentSelection = null;

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
   * Capture (snapDOM, same-origin)
   * ----------------------------------------------------------
   */

  const waitForPaint = () =>
    new Promise((resolve) => {
      requestAnimationFrame(() => requestAnimationFrame(resolve));
    });

  const withTimeout = (promise, ms) =>
    Promise.race([
      promise,
      new Promise((resolve) => setTimeout(resolve, ms)),
    ]);

  const waitForAssets = async () => {
    try {
      if (document.fonts && document.fonts.ready) {
        await document.fonts.ready;
      }
    } catch {}

    const images = Array.from(document.images || []);

    await Promise.all(
      images.map((img) => {
        if (img.complete) {
          return typeof img.decode === 'function'
            ? img.decode().catch(() => {})
            : Promise.resolve();
        }

        return new Promise((resolve) => {
          img.addEventListener('load', resolve, { once: true });
          img.addEventListener('error', resolve, { once: true });
        });
      }),
    );
  };

  const resolveBackgroundColor = () => {
    try {
      const body = getComputedStyle(document.body).backgroundColor;

      if (body && body !== 'rgba(0, 0, 0, 0)' && body !== 'transparent') {
        return body;
      }

      const html = getComputedStyle(document.documentElement).backgroundColor;

      if (html && html !== 'rgba(0, 0, 0, 0)' && html !== 'transparent') {
        return html;
      }
    } catch {}

    return '#ffffff';
  };

  /*
   * Bounds are captured at selection time. Re-read the live element so the
   * highlight still lands correctly if the page scrolled or reflowed between
   * the click and the snapshot.
   */
  const resolveSelectionBounds = () => {
    const selection = currentSelection;

    if (!selection) {
      return null;
    }

    const selector = selection.target && selection.target.selector;

    if (selector) {
      try {
        const element = document.querySelector(selector);

        if (element) {
          const rect = element.getBoundingClientRect();

          if (rect.width > 0 && rect.height > 0) {
            return {
              x: rect.x,
              y: rect.y,
              width: rect.width,
              height: rect.height,
            };
          }
        }
      } catch {}
    }

    return selection.bounds || null;
  };

  /*
   * Draw the highlight as a real, fixed-position element before capturing so
   * the browser positions it. Mapping bounds onto the raster afterwards drifts
   * with scrollbar width / DPR rounding; letting the engine place it does not.
   */
  const buildHighlightOverlay = (bounds) => {
    if (
      !bounds ||
      !Number.isFinite(bounds.x) ||
      !Number.isFinite(bounds.y) ||
      bounds.width <= 0 ||
      bounds.height <= 0
    ) {
      return null;
    }

    const overlay = document.createElement('div');

    overlay.setAttribute('data-aero-capture-highlight', '');

    overlay.style.cssText = [
      'position:fixed',
      'left:' + bounds.x + 'px',
      'top:' + bounds.y + 'px',
      'width:' + bounds.width + 'px',
      'height:' + bounds.height + 'px',
      'border:2px solid rgb(59, 130, 246)',
      'background:rgba(59, 130, 246, 0.15)',
      'box-sizing:border-box',
      'z-index:2147483647',
      'pointer-events:none',
    ].join(';');

    return overlay;
  };

  const isCanvasBlank = (canvas) => {
    try {
      const probe = document.createElement('canvas');

      probe.width = 24;
      probe.height = 24;

      const context = probe.getContext('2d');

      if (!context) {
        return false;
      }

      context.clearRect(0, 0, probe.width, probe.height);
      context.drawImage(canvas, 0, 0, probe.width, probe.height);

      const data = context.getImageData(0, 0, probe.width, probe.height).data;

      for (let i = 3; i < data.length; i += 4) {
        if (data[i] !== 0) {
          return false;
        }
      }

      return true;
    } catch {
      return false;
    }
  };

  const ensureBackground = (canvas) => {
    try {
      const context = canvas.getContext('2d');

      if (!context) {
        return;
      }

      const corner = context.getImageData(0, 0, 1, 1).data;

      if (corner[3] === 0) {
        context.save();
        context.globalCompositeOperation = 'destination-over';
        context.fillStyle = resolveBackgroundColor();
        context.fillRect(0, 0, canvas.width, canvas.height);
        context.restore();
      }
    } catch {}
  };

  const captureRoot = (snap, root, dpr, fullPage) =>
    snap.toCanvas(root, {
      ...(fullPage ? {} : { clip: 'viewport' }),
      dpr,
      embedFonts: true,
      format: 'png',
    });

  const captureViewport = async (requestId, options) => {
    if (capturing) {
      post({ type: 'capture-result', requestId, error: 'capture-busy', ts: Date.now() });
      return;
    }

    /*
     * The parent can pin the raster scale to 1 so the image dimensions equal
     * the iframe's layout viewport exactly, regardless of the host screen's
     * devicePixelRatio.
     */
    const dpr =
      options && typeof options.dpr === 'number' && options.dpr > 0
        ? options.dpr
        : window.devicePixelRatio || 1;

    const fullPage = Boolean(options && options.fullPage);

    capturing = true;

    const freeze = document.createElement('style');

    freeze.textContent =
      '*,*::before,*::after{animation:none!important;transition:none!important;caret-color:transparent!important}';

    try {
      const mod = await import(RESERVED_MODULE_URL);
      const snap = mod.snapdom || mod.default;

      if (!snap || typeof snap.toCanvas !== 'function') {
        throw new Error('snapDOM unavailable');
      }

      document.head.appendChild(freeze);

      if (typeof mod.preCache === 'function') {
        try {
          await mod.preCache(document);
        } catch {}
      }

      await withTimeout(waitForAssets(), 2500);
      await waitForPaint();

      const highlight = buildHighlightOverlay(resolveSelectionBounds());

      if (highlight) {
        document.body.appendChild(highlight);
      }

      /*
       * snapDOM occasionally returns a blank raster. Try the document root and
       * the body, keep the first non-blank result, and fall back to the last
       * attempt so callers still get an image.
       */
      let canvas = null;
      let fallback = null;

      try {
        for (const root of [document.documentElement, document.body]) {
          if (!root) {
            continue;
          }

          const candidate = await captureRoot(snap, root, dpr, fullPage);

          if (!candidate) {
            continue;
          }

          if (!fallback) {
            fallback = candidate;
          }

          if (!isCanvasBlank(candidate)) {
            canvas = candidate;
            break;
          }
        }
      } finally {
        if (highlight) {
          highlight.remove();
        }
      }

      canvas = canvas || fallback;

      if (!canvas) {
        throw new Error('empty capture');
      }

      ensureBackground(canvas);

      post({
        type: 'capture-result',
        requestId,
        dataUrl: canvas.toDataURL('image/png'),
        mime: 'image/png',
        ts: Date.now(),
      });
    } catch (error) {
      post({
        type: 'capture-result',
        requestId,
        error: String((error && error.message) || error),
        ts: Date.now(),
      });
    } finally {
      try {
        freeze.remove();
      } catch {}

      capturing = false;
    }
  };

  /*
   * ----------------------------------------------------------
   * Parent communication
   * ----------------------------------------------------------
   */

  /*
   * ----------------------------------------------------------
   * Agent actions (snapshot / click / type / scroll / inspect)
   * ----------------------------------------------------------
   */

  const respond = (requestId, ok, data, error) => {
    post({
      type: 'action-result',
      requestId,
      ok: ok === true,
      ...(data !== undefined ? { data } : {}),
      ...(error ? { error: String(error) } : {}),
      ts: Date.now(),
    });
  };

  const normalizeText = (value) =>
    String(value || '')
      .replace(/\\s+/g, ' ')
      .trim()
      .toLowerCase();

  const isVisible = (element) => {
    if (!element || !(element instanceof Element)) return false;

    const rect = element.getBoundingClientRect();

    if (rect.width <= 0 || rect.height <= 0) return false;

    const style = window.getComputedStyle(element);

    return (
      style.visibility !== 'hidden' &&
      style.display !== 'none' &&
      style.opacity !== '0'
    );
  };

  const findElement = (params) => {
    const selector =
      params && typeof params.selector === 'string'
        ? params.selector.trim()
        : '';

    if (selector) {
      let element = null;

      try {
        element = document.querySelector(selector);
      } catch (error) {
        throw new Error('Invalid selector: ' + selector);
      }

      if (element) return element;
    }

    const needle = normalizeText(params && params.text);

    if (needle) {
      const candidates = Array.from(
        document.querySelectorAll(
          'a,button,input,select,textarea,[role="button"],[role="link"],summary,label,[contenteditable="true"]',
        ),
      );

      const match = candidates.find((element) => {
        const haystack = normalizeText(
          element.innerText ||
            element.value ||
            element.getAttribute('aria-label') ||
            element.getAttribute('placeholder'),
        );

        return haystack === needle || haystack.indexOf(needle) !== -1;
      });

      if (match) return match;
    }

    return null;
  };

  const describeInteractive = (element) => {
    const rect = element.getBoundingClientRect();

    return {
      tag: element.tagName.toLowerCase(),
      selector: buildSelector(element),
      text: clip(
        element.innerText ||
          element.value ||
          element.getAttribute('aria-label') ||
          '',
        160,
      ),
      role: element.getAttribute('role') || undefined,
      type: element.getAttribute('type') || undefined,
      href: element.getAttribute('href') || undefined,
      value:
        typeof element.value === 'string'
          ? clip(element.value, 80)
          : undefined,
      visible: isVisible(element),
      bounds: {
        x: rect.x,
        y: rect.y,
        width: rect.width,
        height: rect.height,
      },
    };
  };

  const collectSnapshot = (params) => {
    const selector =
      params && typeof params.selector === 'string'
        ? params.selector.trim()
        : '';

    if (selector) {
      const element = document.querySelector(selector);

      if (!element) throw new Error('No element matches: ' + selector);

      return {
        url: window.location.href,
        title: document.title || '',
        element: metadataForElement(element),
      };
    }

    const interactive = Array.from(
      document.querySelectorAll(
        'a,button,input,select,textarea,[role="button"],[role="link"],[role="tab"],summary,label,[contenteditable="true"]',
      ),
    )
      .slice(0, 250)
      .map(describeInteractive);

    return {
      url: window.location.href,
      title: document.title || '',
      text: clip(document.body ? document.body.innerText : '', 6000),
      interactive,
    };
  };

  const performClick = (params) => {
    const element = findElement(params);

    if (!element) throw new Error('No element found to click');

    try {
      element.scrollIntoView({ block: 'center', inline: 'center' });
    } catch {}

    const selector = buildSelector(element);

    element.click();

    return {
      selector,
      text: clip(element.innerText || element.value || '', 160),
    };
  };

  const setNativeValue = (element, value) => {
    const prototype =
      element instanceof HTMLTextAreaElement
        ? HTMLTextAreaElement.prototype
        : HTMLInputElement.prototype;
    const descriptor = Object.getOwnPropertyDescriptor(prototype, 'value');

    if (descriptor && descriptor.set) {
      descriptor.set.call(element, value);
    } else {
      element.value = value;
    }
  };

  const performType = (params) => {
    const element = findElement(params);

    if (!element) throw new Error('No input found to type into');

    const value = params && typeof params.value === 'string' ? params.value : '';

    if (element.isContentEditable) {
      element.focus();
      element.textContent = value;
    } else if ('value' in element) {
      try {
        setNativeValue(element, value);
      } catch {
        element.value = value;
      }
      element.focus();
    } else {
      throw new Error('Element cannot accept text');
    }

    element.dispatchEvent(new Event('input', { bubbles: true }));
    element.dispatchEvent(new Event('change', { bubbles: true }));

    if (params && params.submit === true) {
      element.dispatchEvent(
        new KeyboardEvent('keydown', {
          key: 'Enter',
          code: 'Enter',
          keyCode: 13,
          which: 13,
          bubbles: true,
        }),
      );

      const form = element.form;

      if (form && typeof form.requestSubmit === 'function') {
        try {
          form.requestSubmit();
        } catch {}
      }
    }

    return { selector: buildSelector(element), value };
  };

  const performScroll = (params) => {
    const selector =
      params && typeof params.selector === 'string'
        ? params.selector.trim()
        : '';

    if (selector) {
      const element = document.querySelector(selector);

      if (!element) throw new Error('No element matches: ' + selector);

      element.scrollIntoView({ block: 'center' });

      return { selector, scrollX: window.scrollX, scrollY: window.scrollY };
    }

    const direction = params && params.direction;
    const step = Math.round(window.innerHeight * 0.8);

    if (direction === 'top') {
      window.scrollTo({ top: 0 });
    } else if (direction === 'bottom') {
      window.scrollTo({ top: document.body.scrollHeight });
    } else if (direction === 'up') {
      window.scrollBy({ top: -step });
    } else {
      window.scrollBy({ top: step });
    }

    return {
      scrollX: window.scrollX,
      scrollY: window.scrollY,
      direction: direction || 'down',
    };
  };

  const performInspect = (params) => {
    const selector =
      params && typeof params.selector === 'string'
        ? params.selector.trim()
        : '';

    if (!selector) throw new Error('selector is required');

    const element = document.querySelector(selector);

    if (!element) throw new Error('No element matches: ' + selector);

    const metadata = metadataForElement(element);

    if (!metadata) throw new Error('Unable to inspect element');

    const style = window.getComputedStyle(element);

    return {
      ...metadata,
      computedStyle: {
        display: style.display,
        position: style.position,
        color: style.color,
        backgroundColor: style.backgroundColor,
        fontFamily: style.fontFamily,
        fontSize: style.fontSize,
        fontWeight: style.fontWeight,
        lineHeight: style.lineHeight,
        margin: style.margin,
        padding: style.padding,
        width: style.width,
        height: style.height,
        border: style.border,
        borderRadius: style.borderRadius,
        zIndex: style.zIndex,
        overflow: style.overflow,
        textAlign: style.textAlign,
      },
    };
  };

  const clearSiteData = async (params) => {
    const includeStorage = params && params.storage === true;

    try {
      if (window.caches && caches.keys) {
        const keys = await caches.keys();
        await Promise.all(keys.map((key) => caches.delete(key)));
      }
    } catch {}

    if (includeStorage) {
      try {
        localStorage.clear();
      } catch {}

      try {
        sessionStorage.clear();
      } catch {}

      try {
        document.cookie.split(';').forEach((cookie) => {
          const name = cookie.split('=')[0].trim();

          if (name) {
            document.cookie =
              name + '=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/';
          }
        });
      } catch {}
    }

    return { cleared: true, storage: includeStorage };
  };

  const runAction = async (type, requestId, params) => {
    try {
      if (type === 'snapshot') {
        respond(requestId, true, collectSnapshot(params));
        return;
      }

      if (type === 'click') {
        respond(requestId, true, performClick(params));
        return;
      }

      if (type === 'type') {
        respond(requestId, true, performType(params));
        return;
      }

      if (type === 'scroll') {
        respond(requestId, true, performScroll(params));
        return;
      }

      if (type === 'inspect') {
        respond(requestId, true, performInspect(params));
        return;
      }

      if (type === 'clear-cache' || type === 'clear-storage') {
        respond(
          requestId,
          true,
          await clearSiteData({ storage: type === 'clear-storage' }),
        );
        return;
      }

      respond(requestId, false, undefined, 'Unsupported action: ' + type);
    } catch (error) {
      respond(requestId, false, undefined, (error && error.message) || error);
    }
  };

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
      return;
    }

    if (
      data.type === 'snapshot' ||
      data.type === 'click' ||
      data.type === 'type' ||
      data.type === 'scroll' ||
      data.type === 'inspect' ||
      data.type === 'clear-cache' ||
      data.type === 'clear-storage'
    ) {
      void runAction(data.type, data.requestId, data);
      return;
    }

    if (data.type === 'capture') {
      void captureViewport(data.requestId, data);
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

  let historyIndex = 0;

  const readStateIndex = (state) => {
    if (
      state &&
      typeof state === 'object' &&
      typeof state[HISTORY_INDEX_KEY] === 'number'
    ) {
      return state[HISTORY_INDEX_KEY];
    }

    return null;
  };

  const stampState = (state, index) => {
    if (state == null) {
      return { [HISTORY_INDEX_KEY]: index };
    }

    if (typeof state === 'object' && !Array.isArray(state)) {
      return { ...state, [HISTORY_INDEX_KEY]: index };
    }

    return state;
  };

  const canGoBack = () => historyIndex > 0;

  const canGoForward = () =>
    historyIndex < (window.history.length || 1) - 1;

  const notifyNavigation = () => {
    post({
      type: 'navigate-preview',
      url: window.location.href,
      title: document.title || '',
    });

    post({
      type: 'history-state',
      url: window.location.href,
      canGoBack: canGoBack(),
      canGoForward: canGoForward(),
    });
  };

  if (window.history) {
    const nativePushState = window.history.pushState.bind(window.history);
    const nativeReplaceState = window.history.replaceState.bind(
      window.history,
    );

    /*
     * Bootstrap the index from the entry's persisted state. Browser session
     * history keeps history.state across reloads and back/forward, so this
     * survives full document loads — the exact point where the previous
     * synthetic array reset to zero and disabled the toolbar buttons.
     *
     * With no persisted state (a fresh anchor/location.assign entry) we
     * assume we are at the newest entry, which is correct for normal forward
     * navigation, then stamp it so it stays trackable.
     */
    const existingIndex = readStateIndex(window.history.state);

    if (existingIndex !== null) {
      historyIndex = existingIndex;
    } else {
      historyIndex = Math.max(0, (window.history.length || 1) - 1);

      try {
        nativeReplaceState(
          stampState(window.history.state, historyIndex),
          '',
        );
      } catch {}
    }

    window.history.pushState = function (state, unused, url) {
      const nextUrl = url == null ? url : toPreviewUrl(String(url));
      const nextIndex = historyIndex + 1;

      const result = nativePushState(
        stampState(state, nextIndex),
        unused,
        nextUrl,
      );

      historyIndex = nextIndex;

      queueMicrotask(notifyNavigation);

      return result;
    };

    window.history.replaceState = function (state, unused, url) {
      const nextUrl = url == null ? url : toPreviewUrl(String(url));

      const result = nativeReplaceState(
        stampState(state, historyIndex),
        unused,
        nextUrl,
      );

      queueMicrotask(notifyNavigation);

      return result;
    };

    window.addEventListener('popstate', (event) => {
      const index = readStateIndex(event.state);

      if (index !== null) {
        historyIndex = index;
      } else {
        historyIndex = Math.min(
          historyIndex,
          Math.max(0, (window.history.length || 1) - 1),
        );
      }

      queueMicrotask(notifyNavigation);
    });

    window.addEventListener('hashchange', () => {
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

        if (!/^https?:$/.test(resolved.protocol)) {
          return;
        }

        const previewOrigin = getPreviewOrigin();

        // A new tab/window: hand it to the parent, which opens its own preview
        // tab so the site keeps rendering through the proxy.
        if (anchor.target && anchor.target !== '_self') {
          event.preventDefault();
          post({
            type: 'open-url',
            url: resolved.toString(),
            newTab: anchor.target === '_blank',
          });
          return;
        }

        // Absolute URL on the previewed origin: remap onto the preview host and
        // navigate the frame.
        if (resolved.origin === TARGET_ORIGIN) {
          const previewUrl = toPreviewUrl(resolved.toString());

          if (previewUrl === window.location.href) {
            return;
          }

          event.preventDefault();
          window.location.assign(previewUrl);
          return;
        }

        // Already on the preview host (relative / root-relative links).
        // Let the browser navigate natively; the proxy handles the request and
        // navigation stays inside the built-in browser. Intercepting here used
        // to mistake every internal link for a cross-origin one and spawn a
        // nested preview target for the preview host itself.
        if (resolved.origin === previewOrigin) {
          return;
        }

        // Genuinely cross-origin: open it as its own proxied preview target in
        // the same tab instead of letting it escape to the real site.
        event.preventDefault();
        post({ type: 'open-url', url: resolved.toString() });
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
        const targetHost = new URL(TARGET_ORIGIN).host;

        // ws/wss origins do not match the https target origin string, so
        // compare hosts. Sockets already pointed at the preview host are left
        // alone; everything aimed at the upstream is moved onto the proxy.
        if (
          (parsed.protocol === 'ws:' || parsed.protocol === 'wss:') &&
          parsed.host === targetHost
        ) {
          const preview = new URL(window.location.href);

          parsed.hostname = preview.hostname;
          parsed.port = preview.port;
          parsed.protocol = preview.protocol === 'https:' ? 'wss:' : 'ws:';

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
   * window.open / popups
   * ----------------------------------------------------------
   */

  if (typeof window.open === 'function') {
    const nativeOpen = window.open.bind(window);

    window.open = function (url, name, features) {
      try {
        if (url) {
          const resolved = new URL(String(url), window.location.href);

          if (/^https?:$/.test(resolved.protocol)) {
            post({ type: 'open-url', url: resolved.toString(), newTab: true });
            return null;
          }
        }
      } catch {}

      return nativeOpen(url, name, features);
    };
  }

  /*
   * ----------------------------------------------------------
   * Cross-origin iframes
   * ----------------------------------------------------------
   *
   * Same-origin frames are already rewritten to preview-relative URLs by the
   * proxy. Cross-origin frames would otherwise load directly and be blocked by
   * the third party's frame-ancestors / CSP, or escape the proxy entirely.
   * Route them through the proxy's embed redirect so the response is rewritten
   * with those headers stripped.
   */

  const toEmbedUrl = (value) => {
    try {
      const parsed = new URL(value, window.location.href);

      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        return value;
      }

      if (
        parsed.origin === TARGET_ORIGIN ||
        parsed.origin === getPreviewOrigin() ||
        String(value).indexOf('__aero_internal__') !== -1
      ) {
        return value;
      }

      return EMBED_URL + '?url=' + encodeURIComponent(parsed.toString());
    } catch {
      return value;
    }
  };

  const rewriteFrameElement = (element) => {
    if (!element || typeof element.getAttribute !== 'function') {
      return;
    }

    const tag = element.tagName;

    if (tag !== 'IFRAME' && tag !== 'FRAME') {
      return;
    }

    const src = element.getAttribute('src');

    if (!src) {
      return;
    }

    const next = toEmbedUrl(src);

    if (next !== src) {
      element.setAttribute('src', next);
    }
  };

  const scanFrameElements = (root) => {
    if (!root || root.nodeType !== 1) {
      return;
    }

    rewriteFrameElement(root);

    if (typeof root.querySelectorAll === 'function') {
      const frames = root.querySelectorAll('iframe[src], frame[src]');

      for (const frame of frames) {
        rewriteFrameElement(frame);
      }
    }
  };

  if (typeof window.MutationObserver === 'function') {
    try {
      scanFrameElements(document.documentElement);

      const frameObserver = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
          if (mutation.type === 'attributes') {
            rewriteFrameElement(mutation.target);
            continue;
          }

          for (const node of mutation.addedNodes) {
            if (node && node.nodeType === 1) {
              scanFrameElements(node);
            }
          }
        }
      });

      frameObserver.observe(document.documentElement || document, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['src'],
      });
    } catch {}
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
      canGoBack: canGoBack(),
      canGoForward: canGoForward(),
    });
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', postReady, { once: true });
  } else {
    postReady();
  }
})();
`;

  return `<script nonce="${bridgeNonce}">${script}</script>`;
}
