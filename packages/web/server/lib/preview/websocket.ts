// server/lib/preview/websocket.ts
//
// WebSocket support for the HTTP preview proxy. Interactive sites (games,
// chat, live apps) keep a socket open to their origin; the bridge rewrites
// those URLs onto the preview origin, so the server must forward the upgrade.

import type { PreviewTarget } from './store';

const PREVIEW_ID_IN_HOST = /^([a-f0-9]{32})\.preview\.localhost(?::\d+)?$/i;
const PREVIEW_ID_IN_PATH = /^\/api\/preview\/p\/([a-f0-9]{32})(?:\/|$)/i;

export function extractPreviewIdFromHost(host: string): string | null {
  return host.match(PREVIEW_ID_IN_HOST)?.[1] ?? null;
}

export function extractPreviewIdFromPath(pathname: string): string | null {
  return pathname.match(PREVIEW_ID_IN_PATH)?.[1] ?? null;
}

export function extractPreviewRestPath(pathname: string, id: string): string {
  const prefix = `/api/preview/p/${id}`;

  if (pathname === prefix || pathname === `${prefix}/`) {
    return '/';
  }

  if (pathname.startsWith(`${prefix}/`)) {
    return pathname.slice(prefix.length) || '/';
  }

  return pathname || '/';
}

/** Upstream `ws(s)://` URL for a proxied WebSocket upgrade, or null if unsupported. */
export function resolvePreviewWebSocketUrl(
  target: PreviewTarget,
  restPath: string,
  requestUrl: string,
): string | null {
  if (target.kind !== 'http') {
    return null;
  }

  try {
    const base = new URL(target.origin);
    const upstream = new URL(restPath || '/', `${target.origin}/`);

    upstream.search = new URL(requestUrl).search;
    upstream.protocol = base.protocol === 'https:' ? 'wss:' : 'ws:';

    return upstream.toString();
  } catch {
    return null;
  }
}
