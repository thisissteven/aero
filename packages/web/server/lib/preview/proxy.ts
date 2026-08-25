import type { Context } from 'hono';
import { randomBytes } from 'node:crypto';

import { buildBridgeScript } from './bridge-script';
import { rewritePreviewCspHeader } from './rewrite';
import type { PreviewTarget } from './store';

function buildUpstreamUrl(
  target: PreviewTarget,
  restPath: string,
  requestUrl: string,
): URL {
  const upstream = new URL(restPath || '/', `${target.origin}/`);

  const request = new URL(requestUrl);

  request.searchParams.forEach((value, key) => {
    upstream.searchParams.set(key, value);
  });

  return upstream;
}

function filterRequestHeaders(request: Headers): Headers {
  const result = new Headers();

  request.forEach((value, key) => {
    const lower = key.toLowerCase();

    if (
      lower === 'host' ||
      lower === 'origin' ||
      lower === 'connection' ||
      lower === 'content-length' ||
      lower === 'transfer-encoding' ||
      lower === 'referer' ||
      lower === 'cookie' ||
      lower === 'authorization'
    ) {
      return;
    }

    result.set(key, value);
  });

  result.set('accept-encoding', 'identity');

  return result;
}

function copyResponseHeaders(source: Headers): Headers {
  const result = new Headers();

  source.forEach((value, key) => {
    const lower = key.toLowerCase();

    if (
      lower === 'content-length' ||
      lower === 'content-encoding' ||
      lower === 'transfer-encoding' ||
      lower === 'connection' ||
      lower === 'keep-alive' ||
      lower === 'x-frame-options' ||
      lower === 'content-security-policy' ||
      lower === 'content-security-policy-report-only'
    ) {
      return;
    }

    result.set(key, value);
  });

  return result;
}

function rewriteAbsoluteTargetUrl(
  value: string,
  targetOrigin: string,
  previewOrigin: string,
): string {
  try {
    const parsed = new URL(value);
    const target = new URL(targetOrigin);

    if (parsed.origin !== target.origin) {
      return value;
    }

    return previewOrigin + parsed.pathname + parsed.search + parsed.hash;
  } catch {
    return value;
  }
}

function rewriteHtml(
  html: string,
  targetOrigin: string,
  previewOrigin: string,
): string {
  let result = html;

  result = result.replace(
    /\b(src|href|action|poster|cite|formaction)=(['"])([^'"]*)\2/gi,
    (_match, attribute, quote, value) => {
      const trimmed = String(value).trim();

      if (!/^https?:\/\//i.test(trimmed)) {
        return `${attribute}=${quote}${value}${quote}`;
      }

      const rewritten = rewriteAbsoluteTargetUrl(
        trimmed,
        targetOrigin,
        previewOrigin,
      );

      return `${attribute}=${quote}${rewritten}${quote}`;
    },
  );

  /*
   * Remove Vite's late injected client loader.
   * The preview should not try to load
   * /@vite/client from the parent Vite server.
   */
  result = result.replace(
    /<script\b[^>]*>\s*import\(\s*["']\/@vite\/client["']\s*\)\s*<\/script>/gi,
    '',
  );

  return result;
}

function rewriteCss(
  css: string,
  targetOrigin: string,
  previewOrigin: string,
): string {
  return css.replace(
    /url\(\s*(['"]?)(.*?)\1\s*\)/gi,
    (_match, quote, value) => {
      const rewritten = rewriteAbsoluteTargetUrl(
        String(value).trim(),
        targetOrigin,
        previewOrigin,
      );

      return `url(${quote || ''}${rewritten}${quote || ''})`;
    },
  );
}

function injectBridge(
  html: string,
  targetOrigin: string,
  previewOrigin: string,
  nonce: string,
): string {
  const bridge = buildBridgeScript(targetOrigin, nonce, previewOrigin);

  const head = html.match(/<head\b[^>]*>/i);

  if (head) {
    return html.replace(head[0], `${head[0]}${bridge}`);
  }

  const body = html.match(/<body\b[^>]*>/i);

  if (body) {
    return html.replace(body[0], `${bridge}${body[0]}`);
  }

  return bridge + html;
}

export async function proxyRequest(
  c: Context,
  target: PreviewTarget,
  restPath: string,
): Promise<Response> {
  const requestUrl = new URL(c.req.url);

  const previewOrigin = `${requestUrl.protocol}//${requestUrl.host}`;

  const upstream = buildUpstreamUrl(target, restPath, c.req.url);

  console.info('[PREVIEW]', c.req.method, '→', upstream.toString());

  let response: Response;

  try {
    response = await fetch(upstream, {
      method: c.req.method,
      headers: filterRequestHeaders(c.req.raw.headers),
      body:
        c.req.method === 'GET' || c.req.method === 'HEAD'
          ? undefined
          : c.req.raw.body,
      redirect: 'manual',
      signal: AbortSignal.timeout(30_000),
    });

    console.info('[PREVIEW RESPONSE]', {
      request: c.req.url,
      upstream: upstream.toString(),
      status: response.status,
      contentType: response.headers.get('content-type'),
      location: response.headers.get('location'),
    });
  } catch (error) {
    console.error('[PREVIEW ERROR]', upstream.toString(), error);

    return c.json(
      {
        error: 'Preview upstream request failed',
        target: upstream.toString(),
        reason: error instanceof Error ? error.message : String(error),
      },
      502,
    );
  }

  const headers = copyResponseHeaders(response.headers);

  /*
   * Same-origin redirects stay on
   * the preview hostname.
   */
  if (response.status >= 300 && response.status < 400) {
    const location = response.headers.get('location');

    if (location) {
      try {
        const resolved = new URL(location, target.origin);

        if (resolved.origin === new URL(target.origin).origin) {
          headers.set(
            'location',
            resolved.pathname + resolved.search + resolved.hash,
          );
        } else {
          headers.set('location', resolved.toString());
        }
      } catch {
        headers.set('location', location);
      }
    }

    return new Response(null, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  }

  const contentType = response.headers.get('content-type') ?? '';

  const lower = contentType.toLowerCase();

  const isHtml =
    lower.includes('text/html') || lower.includes('application/xhtml+xml');

  const isCss = lower.includes('text/css');

  const isJavaScript =
    lower.includes('javascript') || lower.includes('ecmascript');

  if (!isHtml && !isCss && !isJavaScript) {
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  }

  const body = await response.text();

  headers.delete('content-length');

  headers.delete('content-encoding');

  if (isHtml) {
    const nonce = randomBytes(16).toString('base64');

    const originalCsp = response.headers.get('content-security-policy');

    if (originalCsp) {
      const rewrittenCsp = rewritePreviewCspHeader(originalCsp, nonce);

      if (rewrittenCsp) {
        headers.set('content-security-policy', rewrittenCsp);
      }
    }

    let rewritten = rewriteHtml(body, target.origin, previewOrigin);

    rewritten = injectBridge(rewritten, target.origin, previewOrigin, nonce);

    headers.set('cache-control', 'no-store');

    return new Response(rewritten, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  }

  if (isCss) {
    return new Response(rewriteCss(body, target.origin, previewOrigin), {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  }

  /*
   * JavaScript is deliberately passed through unchanged.
   *
   * Because the document origin is:
   *
   *   <id>.preview.localhost:5173
   *
   * browser-relative imports resolve against the
   * preview origin automatically.
   */
  return new Response(body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}
