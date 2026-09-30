import { useBrowserStore } from '@/app/components/chat-aside/browser/browser-store';

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
    | 'open-url'
    | 'history-state'
    | 'capture-result'
    | 'action-result';

  url?: string;
  title?: string;

  target?: PreviewElementMetadata | null;
  pointer?: PreviewPoint;

  selection?: PreviewSelection | PreviewSelectionPreview | null;

  canGoBack?: boolean;
  canGoForward?: boolean;

  /** `open-url` requests originating from a new-tab/window link. */
  newTab?: boolean;

  requestId?: string;
  dataUrl?: string;
  mime?: string;
  error?: string;

  ok?: boolean;
  data?: unknown;

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

    // Key by origin only. The server keeps one stable preview origin per
    // upstream origin, so different paths on the same site reuse it — which
    // is what lets localStorage/sessionStorage/cookies survive navigation.
    return parsed.origin;
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

export function openUrl(url: string): string {
  const { tabs, activeTabId, actions } = useBrowserStore.getState();

  const target = normalizeBrowserUrl(url);

  // No URL — just hand back a blank tab.
  if (!target) {
    return actions.addTab('');
  }

  // 1. Same URL already open somewhere -> focus + reload
  const existing = tabs.find(
    (tab) =>
      normalizeBrowserUrl(tab.loadedUrl) === target ||
      normalizeBrowserUrl(tab.currentUrl) === target,
  );

  if (existing) {
    actions.setActiveTab(existing.id);
    actions.reload(existing.id);
    return existing.id;
  }

  // 2. Active tab is empty -> reuse it
  const active = tabs.find((tab) => tab.id === activeTabId);

  if (active && !active.loadedUrl && !active.url) {
    actions.navigate(active.id, target);
    return active.id;
  }

  // 3. New tab
  return actions.addTab(target);
}
