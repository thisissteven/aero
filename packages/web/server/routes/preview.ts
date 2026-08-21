import { Hono } from 'hono';

import { proxyRequest } from '../lib/preview/proxy';
import { isBlockedExternalHost } from '../lib/preview/rewrite';
import { createPreviewTarget, getPreviewTarget } from '../lib/preview/store';
import { validateTokenRequest } from '../lib/terminal/auth';
import { AUTH_CONFIG } from '../lib/terminal/config';

function parseCookies(header: string | undefined): Map<string, string> {
  const out = new Map<string, string>();
  if (!header) return out;
  for (const part of header.split(';')) {
    const idx = part.indexOf('=');
    if (idx <= 0) continue;
    out.set(part.slice(0, idx).trim(), part.slice(idx + 1).trim());
  }
  return out;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function handleProxy(c: any) {
  const proxyId = c.req.param('proxyId');
  const target = getPreviewTarget(proxyId);
  if (!target) return c.text('Not Found', 404);

  const cookies = parseCookies(c.req.header('cookie'));
  const token =
    c.req.query('oc_preview_token') || cookies.get('aero_preview_token') || '';
  if (!token || token !== target.token) return c.text('Forbidden', 403);

  return proxyRequest(c, target, c.req.param('*') ?? '');
}

const preview = new Hono()
  .post('/targets', async (c) => {
    const decision = validateTokenRequest(AUTH_CONFIG, {
      host: c.req.header('host'),
      origin: c.req.header('origin'),
    });
    if (!decision.ok)
      return c.text(decision.reason, decision.status as 400 | 403);

    const body = await c.req.json().catch(() => null);
    const raw = typeof body?.url === 'string' ? body.url : null;
    if (!raw) return c.json({ error: 'url is required' }, 400);

    let target: URL;
    try {
      target = new URL(raw);
    } catch {
      return c.json({ error: 'invalid url' }, 400);
    }
    if (target.protocol !== 'http:' && target.protocol !== 'https:') {
      return c.json({ error: 'unsupported protocol' }, 400);
    }

    // Allow localhost but still block other private addresses
    const isLocalhost =
      target.hostname === 'localhost' ||
      target.hostname.endsWith('.localhost') ||
      target.hostname.endsWith('.local');

    if (!isLocalhost && isBlockedExternalHost(target.hostname)) {
      return c.json(
        { error: 'refusing to proxy private or reserved addresses' },
        400,
      );
    }

    const entry = createPreviewTarget(target.toString());
    const cookiePath = `/api/preview/p/${entry.id}`;
    const maxAge = Math.round((entry.expiresAt - Date.now()) / 1000);
    c.header(
      'Set-Cookie',
      `aero_preview_token=${entry.token}; Path=${cookiePath}; Max-Age=${maxAge}; HttpOnly; SameSite=Lax`,
    );
    c.header('Cache-Control', 'no-store');
    return c.json({
      proxyBasePath: cookiePath,
      previewToken: entry.token,
      expiresAt: entry.expiresAt,
    });
  })
  .all('/p/:proxyId', handleProxy)
  .all('/p/:proxyId/*', handleProxy);

export default preview;
export type PreviewRoutes = typeof preview;
