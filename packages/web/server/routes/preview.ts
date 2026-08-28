import { Context, Hono } from 'hono';
import { stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { proxyRequest } from '../lib/preview/proxy';
import { isBlockedExternalHost } from '../lib/preview/rewrite';
import {
  createLocalPreviewTarget,
  createPreviewTarget,
  getPreviewTarget,
} from '../lib/preview/store';

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

  if (!/^[a-f0-9]{32}$/i.test(id)) {
    return c.json(
      {
        error: 'Invalid preview target',
      },
      400,
    );
  }

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

  return proxyRequest(c, target, restPath);
}

const preview = new Hono().post('/targets', async (c) => {
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

  const requestUrl = new URL(c.req.url);

  const protocol = requestUrl.protocol === 'https:' ? 'https' : 'http';

  const host = requestUrl.host;

  const port = host.includes(':') ? `:${host.split(':').pop()}` : '';

  /*
   * ----------------------------------------------------------
   * Local filesystem preview
   * ----------------------------------------------------------
   */

  if (url.protocol === 'file:') {
    let filePath: string;

    try {
      filePath = fileURLToPath(url);
    } catch {
      return c.json(
        {
          error: 'invalid local file URL',
        },
        400,
      );
    }

    filePath = path.resolve(filePath);

    try {
      const info = await stat(filePath);

      if (!info.isFile()) {
        return c.json(
          {
            error: 'local target is not a file',
          },
          400,
        );
      }
    } catch {
      return c.json(
        {
          error: 'local file does not exist',
        },
        404,
      );
    }

    const target = createLocalPreviewTarget(filePath, path.dirname(filePath));

    const previewHost = `${target.id}.preview.localhost`;

    const previewOrigin = `${protocol}://${previewHost}${port}`;

    c.header('Cache-Control', 'no-store');

    return c.json({
      id: target.id,
      previewOrigin,
      expiresAt: target.expiresAt,
    });
  }

  /*
   * ----------------------------------------------------------
   * Existing HTTP/HTTPS preview
   * ----------------------------------------------------------
   */

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

  const previewHost = `${target.id}.preview.localhost`;

  const previewOrigin = `${protocol}://${previewHost}${port}`;

  c.header('Cache-Control', 'no-store');

  return c.json({
    id: target.id,
    previewOrigin,
    expiresAt: target.expiresAt,
  });
});

preview.all('/p/:proxyId', handleProxy).all('/p/:proxyId/*', handleProxy);

export default preview;

export type PreviewRoutes = typeof preview;

export { extractProxyIdFromHost };
