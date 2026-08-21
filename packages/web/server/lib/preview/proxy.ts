import { randomBytes } from 'crypto';
import type { Context } from 'hono';

import { buildBridgeScript } from './bridge-script';
import {
  detectRewriteKind,
  rewritePreviewBody,
  rewritePreviewCspHeader,
} from './rewrite';

function filterRequestHeaders(headers: Headers, targetOrigin: string) {
  const out = new Headers();
  headers.forEach((value, key) => {
    const lower = key.toLowerCase();
    // Keep referer but rewrite it to the target origin so sites don't block us
    if (lower === 'referer') {
      out.set('Referer', targetOrigin);
      return;
    }
    if (['host', 'origin', 'connection'].includes(lower)) {
      return;
    }
    // Keep cookies — many sites need them for redirects, consent, auth
    out.set(key, value);
  });
  return out;
}

export async function proxyRequest(
  c: Context,
  target: { id: string; url: string; token: string },
  restPath: string,
) {
  const targetUrl = new URL(target.url);
  const upstreamUrl = new URL(`/${restPath}`, targetUrl.origin);
  const search = new URL(c.req.url).search;
  if (search) upstreamUrl.search = search;
  upstreamUrl.searchParams.delete('oc_preview_token');
  upstreamUrl.searchParams.delete('ocPreview');

  let upstreamRes: Response;
  try {
    const hasBody = !['GET', 'HEAD'].includes(c.req.method);
    upstreamRes = await fetch(upstreamUrl, {
      method: c.req.method,
      headers: filterRequestHeaders(c.req.raw.headers, targetUrl.origin),
      body: hasBody ? c.req.raw.body : undefined,
      ...(hasBody ? { duplex: 'half' } : {}),
      redirect: 'manual',
      signal: AbortSignal.timeout(15_000),
    } as RequestInit);
  } catch (error) {
    const reason = error instanceof Error ? error.message : 'unreachable';
    return new Response(
      `<!doctype html><meta charset="utf-8"><body style="font:14px system-ui;padding:2rem;color:#888">
        Couldn't reach ${targetUrl.hostname} — ${reason}</body>`,
      { status: 502, headers: { 'content-type': 'text/html' } },
    );
  }

  if (upstreamRes.status >= 300 && upstreamRes.status < 400) {
    const location = upstreamRes.headers.get('location');
    if (location) {
      const resolved = new URL(location, upstreamUrl);
      const proxied =
        resolved.origin === targetUrl.origin
          ? `/api/preview/p/${target.id}${resolved.pathname}${resolved.search}${resolved.hash}`
          : resolved.toString();
      return c.redirect(
        proxied,
        upstreamRes.status as 301 | 302 | 303 | 307 | 308,
      );
    }
  }

  const bridgeNonce = randomBytes(16).toString('base64');

  const headers = new Headers();
  upstreamRes.headers.forEach((value, key) => {
    const lower = key.toLowerCase();

    if (lower === 'x-frame-options') return;

    if (
      lower === 'content-security-policy' ||
      lower === 'content-security-policy-report-only'
    ) {
      const rewritten = rewritePreviewCspHeader(value, bridgeNonce);
      if (rewritten) headers.set(key, rewritten);
      return;
    }

    if (lower === 'content-encoding' || lower === 'content-length') {
      return;
    }

    // Forward Set-Cookie but rewrite the Path so it works through the proxy
    if (lower === 'set-cookie') {
      const rewritten = rewriteSetCookiePath(
        value,
        `/api/preview/p/${target.id}`,
      );
      headers.append(key, rewritten);
      return;
    }

    headers.set(key, value);
  });

  const contentType = upstreamRes.headers.get('content-type') ?? '';
  const kind = detectRewriteKind(contentType);

  if (!kind) {
    return new Response(upstreamRes.body, {
      status: upstreamRes.status,
      headers,
    });
  }

  const proxyBase = `/api/preview/p/${target.id}`;
  const bodyText = await upstreamRes.text();
  let rewritten = rewritePreviewBody({
    bodyText,
    proxyBasePath: proxyBase,
    targetOrigin: targetUrl.origin,
    kind,
    previewToken: target.token,
  });

  if (kind === 'html') {
    const bridgeTag = buildBridgeScript(targetUrl.origin, bridgeNonce);

    rewritten = rewritten.includes('</head>')
      ? rewritten.replace('</head>', `${bridgeTag}</head>`)
      : `${bridgeTag}${rewritten}`;
  }

  return new Response(rewritten, { status: upstreamRes.status, headers });
}

function rewriteSetCookiePath(
  setCookieValue: string,
  proxyPath: string,
): string {
  // Simple path rewrite: replace Path=/ with Path=/api/preview/p/{id}/
  // and Path=/foo with Path=/api/preview/p/{id}/foo
  return setCookieValue
    .replace(/;\s*Path=\/([^;]*)/i, (_match, path) =>
      `; Path=${proxyPath}/${path}`.replace(/\/+/g, '/').replace(/:\//, '://'),
    )
    .replace(/;\s*Path=\/\s*(;|$)/i, `; Path=${proxyPath}$1`);
}
