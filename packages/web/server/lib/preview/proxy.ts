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
  const request = new URL(requestUrl);

  const upstream = new URL(restPath || '/', `${target.origin}/`);

  // Preserve the raw query string exactly.
  upstream.search = request.search;

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

function rewritePreviewResourceUrl(
  value: string,
  targetOrigin: string,
  previewOrigin: string,
): string {
  const trimmed = value.trim();

  if (!trimmed) {
    return value;
  }

  // IMPORTANT:
  // SVG <use href="#foo"> and other fragment-only references
  // must remain same-document references.
  if (trimmed.startsWith('#')) {
    return value;
  }

  if (/^(?:data|blob|javascript|mailto|tel|about):/i.test(trimmed)) {
    return value;
  }

  /*
   * Root-relative URL:
   *
   *   /assets/foo.js
   *
   * stays on the preview origin:
   *
   *   http://abc.preview.localhost:5173/assets/foo.js
   */
  if (trimmed.startsWith('/') && !trimmed.startsWith('//')) {
    return previewOrigin + trimmed;
  }

  try {
    const parsed = new URL(trimmed, targetOrigin + '/');

    const target = new URL(targetOrigin);

    /*
     * Absolute URL belonging to the upstream
     * target becomes a preview-origin URL.
     */
    if (parsed.origin === target.origin) {
      return previewOrigin + parsed.pathname + parsed.search + parsed.hash;
    }
  } catch {
    //
  }

  return value;
}

function rewriteHtml(
  html: string,
  targetOrigin: string,
  previewOrigin: string,
): string {
  let result = html;

  /*
   * HTML resource attributes.
   *
   * Keep fragment references untouched.
   */
  result = result.replace(
    /\b(src|href|action|poster|cite|formaction)=(['"])([^'"]*)\2/gi,
    (_match, attribute, quote, value) => {
      const rewritten = rewritePreviewResourceUrl(
        String(value),
        targetOrigin,
        previewOrigin,
      );

      return `${attribute}=${quote}${rewritten}${quote}`;
    },
  );

  /*
   * srcset
   */
  result = result.replace(
    /\bsrcset=(['"])([^'"]*)\1/gi,
    (_match, quote, value) => {
      const rewritten = String(value)
        .split(',')
        .map((part) => {
          const trimmed = part.trim();

          if (!trimmed) {
            return trimmed;
          }

          const segments = trimmed.split(/\s+/);

          const url = segments.shift() ?? '';

          const nextUrl = rewritePreviewResourceUrl(
            url,
            targetOrigin,
            previewOrigin,
          );

          return [nextUrl, ...segments].join(' ');
        })
        .join(', ');

      return `srcset=${quote}${rewritten}${quote}`;
    },
  );

  /*
   * Inline module scripts.
   *
   * OpenChamber does this because a module may contain:
   *
   *   import "/assets/foo.js"
   *
   * which otherwise bypasses HTML rewriting.
   */
  result = result.replace(
    /<script\b([^>]*)>([\s\S]*?)<\/script>/gi,
    (match, attrs, scriptBody) => {
      const typeMatch = String(attrs).match(
        /\btype\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i,
      );

      const type = String(
        typeMatch?.[1] ?? typeMatch?.[2] ?? typeMatch?.[3] ?? '',
      )
        .trim()
        .toLowerCase();

      if (type !== 'module' || /\bsrc\s*=/i.test(attrs)) {
        return match;
      }

      const rewritten = rewriteJavaScript(
        scriptBody,
        targetOrigin,
        previewOrigin,
      );

      if (rewritten === scriptBody) {
        return match;
      }

      return `<script${attrs}>${rewritten}</script>`;
    },
  );

  /*
   * Remove Vite's late-injected loader.
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
  let result = css;

  result = result.replace(
    /url\(\s*(['"]?)(.*?)\1\s*\)/gi,
    (_match, quote, value) => {
      const rewritten = rewritePreviewResourceUrl(
        String(value),
        targetOrigin,
        previewOrigin,
      );

      return `url(${quote || ''}${rewritten}${quote || ''})`;
    },
  );

  /*
   * This was missing from your implementation.
   *
   * @import "/assets/foo.css"
   */
  result = result.replace(
    /@import\s+(['"])\/(?!\/)([^'"]*)\1/gi,
    (_match, quote, path) => {
      const rewritten = rewritePreviewResourceUrl(
        `/${path}`,
        targetOrigin,
        previewOrigin,
      );

      return `@import ${quote}${rewritten}${quote}`;
    },
  );

  return result;
}

function rewriteJavaScript(
  javascript: string,
  targetOrigin: string,
  previewOrigin: string,
): string {
  let result = javascript;

  /*
   * import "/foo.js"
   */
  result = result.replace(
    /\bimport\s+(['"])\/(?!\/)([^'"]*)\1/g,
    (_match, quote, path) => {
      const rewritten = rewritePreviewResourceUrl(
        `/${path}`,
        targetOrigin,
        previewOrigin,
      );

      return `import ${quote}${rewritten}${quote}`;
    },
  );

  /*
   * import("./foo.js")
   */
  result = result.replace(
    /\bimport\(\s*(['"])\/(?!\/)([^'"]*)\1\s*\)/g,
    (_match, quote, path) => {
      const rewritten = rewritePreviewResourceUrl(
        `/${path}`,
        targetOrigin,
        previewOrigin,
      );

      return `import(${quote}${rewritten}${quote})`;
    },
  );

  /*
   * from "/foo.js"
   */
  result = result.replace(
    /\bfrom\s+(['"])\/(?!\/)([^'"]*)\1/g,
    (_match, quote, path) => {
      const rewritten = rewritePreviewResourceUrl(
        `/${path}`,
        targetOrigin,
        previewOrigin,
      );

      return `from ${quote}${rewritten}${quote}`;
    },
  );

  return result;
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

    const rewritten = injectBridge(body, target.origin, previewOrigin, nonce);

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
  const rewrittenJavaScript = rewriteJavaScript(
    body,
    target.origin,
    previewOrigin,
  );

  return new Response(rewrittenJavaScript, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}
