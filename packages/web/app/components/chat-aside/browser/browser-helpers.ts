import { snapdom } from '@zumer/snapdom';

export type PreviewAnnotationMode = 'element' | 'region' | 'draw';

export interface PreviewPoint {
  x: number;
  y: number;
}

export interface PreviewBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface PreviewElementMetadata {
  tag: string;
  id?: string;
  classes: string[];
  text: string;
  selector: string;
  bounds: PreviewBounds;
}

export interface PreviewSelection {
  mode: PreviewAnnotationMode;
  target?: PreviewElementMetadata;
  bounds: PreviewBounds;
  points?: PreviewPoint[];
}

export interface PreviewSelectionPreview {
  mode: PreviewAnnotationMode;
  target?: PreviewElementMetadata;
  bounds?: PreviewBounds;
  points?: PreviewPoint[];
}

export interface PreviewBridgeMessage {
  source: 'aero-preview-bridge';
  version: 1;

  type:
    | 'ready'
    | 'hover'
    | 'select'
    | 'selection-preview'
    | 'navigate-preview'
    | 'history-state';

  url?: string;
  title?: string;

  target?: PreviewElementMetadata | null;
  pointer?: PreviewPoint;

  selection?: PreviewSelection | PreviewSelectionPreview | null;

  canGoBack?: boolean;
  canGoForward?: boolean;

  ts?: number;
}

export function isPreviewElementMetadata(
  value: unknown,
): value is PreviewElementMetadata {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const target = value as Partial<PreviewElementMetadata>;

  const bounds = target.bounds;

  return (
    typeof target.tag === 'string' &&
    typeof target.selector === 'string' &&
    Array.isArray(target.classes) &&
    typeof target.text === 'string' &&
    !!bounds &&
    typeof bounds.x === 'number' &&
    typeof bounds.y === 'number' &&
    typeof bounds.width === 'number' &&
    typeof bounds.height === 'number'
  );
}

export function getBrowserProxyTargetKey(url: string): string {
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

export interface CachedProxyTarget {
  previewOrigin: string;
  expiresAt: number;
}

export const previewProxyTargetCache = new Map<string, CachedProxyTarget>();

export function getCachedProxyTarget(key: string): CachedProxyTarget | null {
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

export function normalizeBrowserUrl(input: string): string {
  let value = input.trim();

  if (!value) {
    return 'about:blank';
  }

  /**
   * Remove whitespace immediately before or after path separators.
   *
   * Preserves spaces inside filenames:
   *
   *   C:\foo \bar\index.html -> C:\foo\bar\index.html
   *   C:\foo\ \bar           -> C:\foo\bar
   *   C:\foo\my file.html    -> C:\foo\my file.html
   *   C:\foo my\file.html    -> C:\foo my\file.html
   */
  value = value.replace(/[ \t]+(?=[\\/])/g, '').replace(/([\\/])[ \t]+/g, '$1');

  /**
   * Existing URL.
   *
   * Do not encode it again. URL handles existing escapes such as %20.
   */
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(value)) {
    return value;
  }

  if (/^(about|chrome|edge|javascript|mailto):/i.test(value)) {
    return value;
  }

  /**
   * Windows absolute path.
   */
  if (/^[a-zA-Z]:[\\/]/.test(value)) {
    const path = value.replace(/\\/g, '/');
    return encodeURI(`file:///${path}`);
  }

  /**
   * Windows UNC path.
   */
  if (/^\\\\/.test(value)) {
    const path = value.replace(/\\/g, '/');
    return encodeURI(`file:${path}`);
  }

  /**
   * Unix absolute path.
   */
  if (/^\//.test(value)) {
    return encodeURI(`file://${value}`);
  }

  /**
   * Localhost.
   */
  if (
    /^(localhost|127\.0\.0\.1|\[::1\]|0\.0\.0\.0)(:\d+)?(?:\/.*)?$/i.test(value)
  ) {
    return `http://${value}`;
  }

  /**
   * IPv6.
   */
  if (/^\[[a-f0-9:]+\](?::\d+)?(?:\/.*)?$/i.test(value)) {
    return `https://${value}`;
  }

  /**
   * Domain / IPv4.
   */
  if (
    /^([\w-]+(?:\.[\w-]+)+|\d{1,3}(?:\.\d{1,3}){3})(?::\d+)?(?:\/.*)?$/i.test(
      value,
    )
  ) {
    return `https://${value}`;
  }

  /**
   * Relative/local path.
   */
  if (
    /^\.{1,2}[\\/]/.test(value) ||
    /^[^\\/:"*?<>|]+(?:[\\/][^\\/:"*?<>|]+)+$/.test(value)
  ) {
    const path = value.replace(/\\/g, '/');
    return encodeURI(`file://${path}`);
  }

  /**
   * Search.
   */
  return `https://www.google.com/search?q=${encodeURIComponent(value)}`;
}

export function formatAgentationContext(
  pageUrl: string,
  target?: PreviewElementMetadata,
  annotation?: {
    mode?: PreviewAnnotationMode;
    bounds?: PreviewBounds;
    note?: string;
  },
): string {
  const lines = [
    `Element from ${pageUrl}`,
    `- Selector: \`${target?.selector ?? ''}\``,
    `- Tag: <${target?.tag ?? ''}${target?.id ? ` id="${target.id}"` : ''}>`,
  ];

  if (target?.classes?.length) {
    lines.push(`- Classes: ${target.classes.join(' ')}`);
  }

  if (target?.text) {
    lines.push(`- Text: "${target.text}"`);
  }

  if (annotation?.mode) {
    lines.push(`- Mode: ${annotation.mode}`);
  }

  if (annotation?.bounds) {
    const bounds = annotation.bounds;

    lines.push(
      `- Bounds: ${Math.round(bounds.x)}, ${Math.round(
        bounds.y,
      )} - ${Math.round(bounds.width)} x ${Math.round(bounds.height)}`,
    );
  }

  if (annotation?.note) {
    lines.push(`- Note: "${annotation.note}"`);
  }

  return lines.join('\n');
}

export async function captureIframeContent(iframeEl: HTMLIFrameElement) {
  const iframeDoc =
    iframeEl.contentDocument || iframeEl.contentWindow?.document;
  if (!iframeDoc) throw new Error('Cannot access iframe document');

  // 1. Create temporary off-screen container in main window
  const tempContainer = document.createElement('div');
  tempContainer.style.position = 'absolute';
  tempContainer.style.left = '-9999px';
  tempContainer.style.top = '-9999px';
  tempContainer.style.width = `${iframeEl.clientWidth}px`;

  // 2. Clone internal HTML and styles into the container
  tempContainer.innerHTML = iframeDoc.body.innerHTML;

  // Copy styles from iframe head
  const styles = iframeDoc.querySelectorAll('style, link[rel="stylesheet"]');
  styles.forEach((style) => tempContainer.appendChild(style.cloneNode(true)));

  document.body.appendChild(tempContainer);

  // 3. Snapshot with snapdom
  const blob = await snapdom.toBlob(tempContainer, { format: 'png' });

  // 4. Clean up temporary node
  document.body.removeChild(tempContainer);

  return blob;
}
