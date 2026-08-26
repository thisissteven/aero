import { Context, Hono } from 'hono';

import { proxyRequest } from '../lib/preview/proxy';
import { isBlockedExternalHost } from '../lib/preview/rewrite';
import { createPreviewTarget, getPreviewTarget } from '../lib/preview/store';

function extractProxyIdFromHost(hostname: string): string | null {
  const match = hostname.match(/^([a-f0-9]{32})\.preview\.localhost$/i);

  return match?.[1] ?? null;
}

function extractPreviewPath(pathname: string, proxyId: string): string {
  const prefix = `/api/preview/p/${proxyId}`;

  if (pathname === prefix || pathname === `${prefix}/`) {
    return '/';
  }

  if (pathname.startsWith(`${prefix}/`)) {
    return pathname.slice(prefix.length) || '/';
  }

  return '/';
}

async function handleProxy(c: Context): Promise<Response> {
  const id = String(c.req.param('proxyId') ?? '');

  const target = getPreviewTarget(id);

  if (!target) {
    return c.json(
      {
        error: 'Preview target not found or expired',
      },
      404,
    );
  }

  const requestUrl = new URL(c.req.url);

  const restPath = extractPreviewPath(requestUrl.pathname, id);

  // console.info('[PREVIEW ROUTE]', {
  //   method: c.req.method,
  //   host: requestUrl.host,
  //   pathname: requestUrl.pathname,
  //   id,
  //   restPath,
  //   targetOrigin: target.origin,
  // });

  return proxyRequest(c, target, restPath);
}

const preview = new Hono()

  .post('/targets', async (c) => {
    const body = await c.req.json().catch(() => null);

    const raw = typeof body?.url === 'string' ? body.url.trim() : '';

    if (!raw) {
      return c.json(
        {
          error: 'url is required',
        },
        400,
      );
    }

    let url: URL;

    try {
      url = new URL(raw);
    } catch {
      return c.json(
        {
          error: 'invalid url',
        },
        400,
      );
    }

    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      return c.json(
        {
          error: 'unsupported protocol',
        },
        400,
      );
    }

    const hostname = url.hostname.toLowerCase();

    const isLoopback =
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname === '::1' ||
      hostname === '[::1]' ||
      hostname === '0.0.0.0' ||
      hostname.endsWith('.localhost') ||
      hostname.endsWith('.local');

    if (!isLoopback && isBlockedExternalHost(hostname)) {
      return c.json(
        {
          error: 'refusing to proxy private or reserved address',
        },
        400,
      );
    }

    const target = createPreviewTarget(url.origin);

    const requestUrl = new URL(c.req.url);

    const protocol = requestUrl.protocol === 'https:' ? 'https' : 'http';

    const host = requestUrl.host;

    const previewHost = `${target.id}.preview.localhost`;

    const port = host.includes(':') ? `:${host.split(':').pop()}` : '';

    const previewOrigin = `${protocol}://${previewHost}${port}`;

    c.header('Cache-Control', 'no-store');

    // console.info('[PREVIEW TARGET]', {
    //   requested: raw,
    //   origin: target.origin,
    //   id: target.id,
    //   previewOrigin,
    // });

    return c.json({
      id: target.id,
      previewOrigin,
      expiresAt: target.expiresAt,
    });
  })

  .all('/p/:proxyId', handleProxy)
  .all('/p/:proxyId/*', handleProxy);

export default preview;

export type PreviewRoutes = typeof preview;

export { extractProxyIdFromHost };
