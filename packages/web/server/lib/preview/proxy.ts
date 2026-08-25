import type { Context } from 'hono';
import { randomBytes } from 'node:crypto';

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
  return html.replace(
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

function injectBridge(html: string, nonce: string): string {
  const script = `
<script nonce="${nonce}">
(() => {
  if (window.__aeroPreviewBridgeInstalled) {
    return;
  }

  window.__aeroPreviewBridgeInstalled = true;

  const parentOrigin = (() => {
    try {
      return document.referrer
        ? new URL(document.referrer).origin
        : '';
    } catch {
      return '';
    }
  })();

  const post = (payload) => {
    if (
      !parentOrigin ||
      !window.parent
    ) {
      return;
    }

    try {
      window.parent.postMessage(
        {
          source: 'aero-preview-bridge',
          version: 1,
          ...payload,
        },
        parentOrigin,
      );
    } catch {}
  };

  window.addEventListener(
    'message',
    (event) => {
      if (
        event.source !==
        window.parent
      ) {
        return;
      }

      const data = event.data;

      if (
        !data ||
        data.source !==
          'aero-preview-parent' ||
        data.version !== 1
      ) {
        return;
      }

      if (
        data.type ===
        'set-inspect-mode'
      ) {
        document.documentElement.style.cursor =
          data.enabled
            ? 'crosshair'
            : '';
      }
    },
  );

  post({
    type: 'ready',
    url: window.location.href,
    title: document.title || '',
  });

  window.addEventListener(
    'DOMContentLoaded',
    () => {
      post({
        type: 'ready',
        url: window.location.href,
        title:
          document.title || '',
      });
    },
  );
})();
</script>`;

  const head = html.match(/<head\b[^>]*>/i);

  if (head) {
    return html.replace(head[0], `${head[0]}${script}`);
  }

  return `${script}${html}`;
}

export async function proxyRequest(
  c: Context,
  target: PreviewTarget,
  restPath: string,
): Promise<Response> {
  const requestUrl = new URL(c.req.url);

  /*
   * The browser is now using:
   *
   *   <id>.preview.localhost:5173
   *
   * as its actual origin.
   */
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
   * Keep same-origin redirects on the
   * preview hostname.
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

    const csp = response.headers.get('content-security-policy');

    if (csp) {
      const rewrittenCsp = rewritePreviewCspHeader(csp, nonce);

      if (rewrittenCsp) {
        headers.set('content-security-policy', rewrittenCsp);
      }
    }

    let rewritten = rewriteHtml(body, target.origin, previewOrigin);

    rewritten = injectBridge(rewritten, nonce);

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
   * JavaScript is intentionally NOT rewritten.
   *
   * Relative imports resolve against:
   *
   *   <id>.preview.localhost:5173
   *
   * and therefore remain inside the preview.
   */
  return new Response(body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}
