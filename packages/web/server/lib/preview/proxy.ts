import type { Context } from 'hono';
import { randomBytes } from 'node:crypto';
import { openAsBlob } from 'node:fs';
import { readFile, realpath, stat } from 'node:fs/promises';
import path from 'node:path';

import { buildBridgeScript } from './bridge-script';
import {
  detectRewriteKind,
  rewritePreviewBody,
  rewritePreviewCspHeader,
  rewritePreviewRedirectLocation,
} from './rewrite';
import type { PreviewTarget } from './store';

const UPSTREAM_TIMEOUT_MS = 20_000;

const MAX_CONCURRENT_UPSTREAM_FETCHES = 64;

const MAX_HTML_BYTES = 4 * 1024 * 1024;
const MAX_CSS_BYTES = 2 * 1024 * 1024;

let activeUpstreamFetches = 0;

// Wraps a fetched upstream Response together with the function that
// releases its concurrency-pool slot. The slot must stay held for as
// long as the response body might still be read or streamed — not just
// for the initial fetch() call — otherwise the semaphore undercounts
// true concurrency. `release` is idempotent so every exit path in
// proxyRequest can call it without double-decrementing.
interface UpstreamFetchResult {
  response: Response;
  release: () => void;
}

function buildUpstreamUrl(
  target: Extract<PreviewTarget, { kind: 'http' }>,
  restPath: string,
  requestUrl: string,
): URL {
  const request = new URL(requestUrl);

  const upstream = new URL(restPath || '/', `${target.origin}/`);

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

function isGetOrHead(method: string): boolean {
  return method === 'GET' || method === 'HEAD';
}

function isPreviewHost(requestUrl: URL, target: PreviewTarget): boolean {
  return requestUrl.hostname.toLowerCase() === `${target.id}.preview.localhost`;
}

function buildProxyBasePath(requestUrl: URL, target: PreviewTarget): string {
  return isPreviewHost(requestUrl, target) ? '' : `/api/preview/p/${target.id}`;
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

  return `${bridge}${html}`;
}

// Combines the incoming client request's own abort signal with the
// upstream timeout, so if the browser disconnects/navigates away mid-load
// we stop holding an upstream connection (and a concurrency slot) for the
// full 20s timeout for no reason.
function buildUpstreamSignal(c: Context): AbortSignal {
  const timeoutSignal = AbortSignal.timeout(UPSTREAM_TIMEOUT_MS);
  const clientSignal = c.req.raw.signal;

  if (!clientSignal) {
    return timeoutSignal;
  }

  return AbortSignal.any([clientSignal, timeoutSignal]);
}

async function fetchUpstream(
  c: Context,
  upstream: URL,
): Promise<UpstreamFetchResult> {
  if (activeUpstreamFetches >= MAX_CONCURRENT_UPSTREAM_FETCHES) {
    return {
      response: new Response(
        JSON.stringify({
          error: 'Preview proxy busy',
        }),
        {
          status: 503,
          headers: {
            'content-type': 'application/json',
            'retry-after': '1',
            'cache-control': 'no-store',
          },
        },
      ),
      // Nothing was acquired for the busy response — release is a no-op.
      release: () => undefined,
    };
  }

  activeUpstreamFetches++;

  let released = false;
  const release = () => {
    if (!released) {
      released = true;
      activeUpstreamFetches--;
    }
  };

  try {
    const proxy =
      upstream.protocol === 'https:'
        ? process.env.HTTPS_PROXY
        : process.env.HTTP_PROXY;

    const response = await fetch(upstream, {
      method: c.req.method,
      headers: filterRequestHeaders(c.req.raw.headers),
      body: isGetOrHead(c.req.method) ? undefined : c.req.raw.body,
      redirect: 'manual',
      signal: buildUpstreamSignal(c),
      proxy,
    });

    // Ownership of `release` now passes to the caller (proxyRequest),
    // which must call it once the response body has been fully handled
    // — drained, cancelled, or handed off to the client as a stream.
    return { response, release };
  } catch (error) {
    // fetch() itself failed (DNS, connection refused, abort, etc.) —
    // nothing to release against, so free the slot immediately.
    release();
    throw error;
  }
}

async function readTextSafely(
  response: Response,
  maxBytes: number,
): Promise<string | null> {
  const contentLength = Number(response.headers.get('content-length'));

  if (Number.isFinite(contentLength) && contentLength > maxBytes) {
    return null;
  }

  if (!response.body) {
    return '';
  }

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();

      if (done) {
        break;
      }

      total += value.byteLength;

      if (total > maxBytes) {
        await reader.cancel();
        return null;
      }

      chunks.push(value);
    }
  } catch (error) {
    await reader.cancel().catch(() => undefined);
    throw error;
  }

  const merged = new Uint8Array(total);

  let offset = 0;

  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.byteLength;
  }

  return new TextDecoder().decode(merged);
}

// Forwards a response's body to the client untouched (binary assets and
// JS passthrough), while releasing the upstream concurrency slot once
// the client side of the stream is fully done — not before.
//
// IMPORTANT: response.body is a ReadableStream and can only be consumed
// by ONE reader. We must NOT both pipe it somewhere to watch for
// completion AND hand it to the outgoing Response — that double-consumes
// it and corrupts/empties whatever the client receives (this is what
// broke images/fonts/scripts in the previous version of this file).
// tee() splits it into two independent streams instead: one goes to the
// client via the Response, the other is drained silently just to detect
// when the transfer is finished so we know when to release().
function passThroughAndRelease(
  response: Response,
  headers: Headers,
  release: () => void,
): Response {
  if (!response.body) {
    release();

    return new Response(null, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  }

  const [clientStream, monitorStream] = response.body.tee();

  // Drain the monitor branch in the background purely to know when the
  // transfer has completed (or failed), so we release the slot at the
  // right time. Errors here don't affect what the client receives —
  // that's carried entirely by clientStream.
  const monitorReader = monitorStream.getReader();

  (async () => {
    try {
      while (true) {
        const { done } = await monitorReader.read();
        if (done) {
          break;
        }
      }
    } catch {
      // Ignore — the client-facing stream reports its own errors.
    } finally {
      release();
    }
  })();

  return new Response(clientStream, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

function getMimeType(filePath: string): string {
  switch (path.extname(filePath).toLowerCase()) {
    case '.html':
    case '.htm':
      return 'text/html; charset=utf-8';

    case '.css':
      return 'text/css; charset=utf-8';

    case '.js':
    case '.mjs':
    case '.cjs':
      return 'text/javascript; charset=utf-8';

    case '.json':
      return 'application/json; charset=utf-8';

    case '.xml':
      return 'application/xml; charset=utf-8';

    case '.svg':
      return 'image/svg+xml';

    case '.png':
      return 'image/png';

    case '.jpg':
    case '.jpeg':
      return 'image/jpeg';

    case '.gif':
      return 'image/gif';

    case '.webp':
      return 'image/webp';

    case '.avif':
      return 'image/avif';

    case '.ico':
      return 'image/x-icon';

    case '.woff':
      return 'font/woff';

    case '.woff2':
      return 'font/woff2';

    case '.ttf':
      return 'font/ttf';

    case '.otf':
      return 'font/otf';

    case '.wasm':
      return 'application/wasm';

    case '.webmanifest':
      return 'application/manifest+json';

    case '.txt':
      return 'text/plain; charset=utf-8';

    case '.pdf':
      return 'application/pdf';

    default:
      return 'application/octet-stream';
  }
}

function isPathInside(root: string, candidate: string): boolean {
  const relative = path.relative(root, candidate);

  return (
    relative === '' ||
    (!relative.startsWith(`..${path.sep}`) &&
      relative !== '..' &&
      !path.isAbsolute(relative))
  );
}

function resolveLocalRequestPath(
  target: Extract<PreviewTarget, { kind: 'file' }>,
  restPath: string,
): string | null {
  let decoded: string;

  try {
    decoded = decodeURIComponent(restPath || '/');
  } catch {
    return null;
  }

  if (decoded.includes('\0')) {
    return null;
  }

  const relativePath = decoded
    .replace(/^[/\\]+/, '')
    .replace(/\//g, path.sep)
    .replace(/\\/g, path.sep);

  const rootPath = path.resolve(target.rootPath);

  const candidate = path.resolve(rootPath, relativePath);

  if (!isPathInside(rootPath, candidate)) {
    return null;
  }

  return candidate;
}

function stripLocalCspMeta(html: string): string {
  return html.replace(
    /<meta\b[^>]*http-equiv\s*=\s*["']?content-security-policy["']?[^>]*>\s*/gi,
    '',
  );
}

function injectLocalBridge(html: string, previewOrigin: string): string {
  const nonce = randomBytes(16).toString('base64');

  const bridge = buildBridgeScript(previewOrigin, nonce, previewOrigin);

  const sanitized = stripLocalCspMeta(html);

  const head = sanitized.match(/<head\b[^>]*>/i);

  if (head) {
    return sanitized.replace(head[0], `${head[0]}${bridge}`);
  }

  const body = sanitized.match(/<body\b[^>]*>/i);

  if (body) {
    return sanitized.replace(body[0], `${bridge}${body[0]}`);
  }

  return `${bridge}${sanitized}`;
}

async function serveLocalFile(
  c: Context,
  target: Extract<PreviewTarget, { kind: 'file' }>,
  restPath: string,
): Promise<Response> {
  const requestedPath = resolveLocalRequestPath(target, restPath);

  if (!requestedPath) {
    return c.text('Forbidden', 403);
  }

  let rootRealPath: string;
  let fileRealPath: string;

  try {
    rootRealPath = await realpath(target.rootPath);

    fileRealPath = await realpath(requestedPath);
  } catch {
    return c.notFound();
  }

  if (!isPathInside(rootRealPath, fileRealPath)) {
    return c.text('Forbidden', 403);
  }

  let info;

  try {
    info = await stat(fileRealPath);
  } catch {
    return c.notFound();
  }

  if (!info.isFile()) {
    return c.notFound();
  }

  const contentType = getMimeType(fileRealPath);

  const headers = new Headers({
    'content-type': contentType,
    'cache-control': 'no-store',
    'x-content-type-options': 'nosniff',
  });

  if (c.req.method === 'HEAD') {
    return new Response(null, {
      status: 200,
      headers,
    });
  }

  /*
   * HTML must be buffered because the Aero
   * bridge has to be injected into it.
   */
  if (contentType.includes('text/html')) {
    if (info.size > MAX_HTML_BYTES) {
      return c.text('Local HTML file is too large to preview', 413);
    }

    let html: string;

    try {
      html = await readFile(fileRealPath, 'utf8');
    } catch (error) {
      return c.json(
        {
          error: 'Failed to read local HTML file',
          reason: error instanceof Error ? error.message : String(error),
        },
        502,
      );
    }

    const requestUrl = new URL(c.req.url);

    const previewOrigin = `${requestUrl.protocol}//${requestUrl.host}`;

    const withBridge = injectLocalBridge(html, previewOrigin);

    return new Response(withBridge, {
      status: 200,
      headers,
    });
  }

  /*
   * Non-HTML local files are returned as a Blob.
   *
   * openAsBlob() is from node:fs and works with
   * the native Response implementation used by
   * the Node-based Hono dev server.
   */
  try {
    const blob = await openAsBlob(fileRealPath, {
      type: contentType,
    });

    headers.set('content-length', String(info.size));

    return new Response(blob, {
      status: 200,
      headers,
    });
  } catch (error) {
    return c.json(
      {
        error: 'Failed to read local file',
        reason: error instanceof Error ? error.message : String(error),
      },
      502,
    );
  }
}

export async function proxyRequest(
  c: Context,
  target: PreviewTarget,
  restPath: string,
): Promise<Response> {
  /*
   * Local filesystem preview.
   */
  if (target.kind === 'file') {
    return serveLocalFile(c, target, restPath);
  }

  /*
   * Existing HTTP/HTTPS preview.
   */
  const requestUrl = new URL(c.req.url);

  const upstream = buildUpstreamUrl(target, restPath, c.req.url);

  let response: Response;
  let release: () => void;

  try {
    const result = await fetchUpstream(c, upstream);
    response = result.response;
    release = result.release;
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);

    return c.json(
      {
        error: 'Preview upstream request failed',
        reason,
      },
      502,
    );
  }

  const headers = copyResponseHeaders(response.headers);

  /*
   * Redirect handling.
   */
  if (response.status >= 300 && response.status < 400) {
    const location = response.headers.get('location');

    if (location) {
      headers.set(
        'location',
        rewritePreviewRedirectLocation(
          location,
          buildProxyBasePath(requestUrl, target),
          target.origin,
        ),
      );
    }

    // Redirects can carry a body (some dev servers send one), and we're
    // not forwarding it — it must be drained/cancelled or undici will
    // keep the upstream connection open indefinitely, eventually
    // starving the process-wide fetch connection pool for every other
    // outbound request the app makes.
    await response.body?.cancel().catch(() => undefined);
    release();

    return new Response(null, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  }

  const contentType = response.headers.get('content-type') ?? '';

  const rewriteKind = detectRewriteKind(contentType);

  /*
   * Binary / unsupported content, and JavaScript (deliberately passed
   * through untouched). Both are streamed straight to the client via
   * tee() — see passThroughAndRelease for why this can't use pipeTo()
   * plus a second read of response.body.
   */
  if (!rewriteKind || rewriteKind === 'javascript') {
    return passThroughAndRelease(response, headers, release);
  }

  const maxBytes = rewriteKind === 'html' ? MAX_HTML_BYTES : MAX_CSS_BYTES;

  let body: string | null;

  try {
    body = await readTextSafely(response, maxBytes);
  } catch (error) {
    release();

    return c.json(
      {
        error: 'Preview response read failed',
        reason: error instanceof Error ? error.message : String(error),
      },
      502,
    );
  }

  /*
   * Too large for safe rewriting.
   */
  if (body === null) {
    // readTextSafely already cancelled the reader in this case (either
    // via the content-length short-circuit, where the body was never
    // touched, or after exceeding maxBytes mid-stream), so the upstream
    // side is done — safe to release now. But response.body has already
    // been read from directly above (not tee'd), so it can go straight
    // to the client here without the tee dance passThroughAndRelease
    // uses for the streaming case.
    release();

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  }

  release();

  const proxyBasePath = buildProxyBasePath(requestUrl, target);

  const previewOrigin = `${requestUrl.protocol}//${requestUrl.host}`;

  const rewrittenBody = rewritePreviewBody(body, rewriteKind, {
    proxyBasePath,
    targetOrigin: target.origin,
  });

  /*
   * HTML gets the Aero bridge and
   * CSP handling.
   */
  if (rewriteKind === 'html') {
    const nonce = randomBytes(16).toString('base64');

    const originalCsp = response.headers.get('content-security-policy');

    if (originalCsp) {
      const rewrittenCsp = rewritePreviewCspHeader(originalCsp, nonce);

      if (rewrittenCsp) {
        headers.set('content-security-policy', rewrittenCsp);
      }
    }

    const withBridge = injectBridge(
      rewrittenBody,
      target.origin,
      previewOrigin,
      nonce,
    );

    headers.delete('content-length');

    headers.delete('content-encoding');

    headers.set('cache-control', 'no-store');

    return new Response(withBridge, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  }

  headers.delete('content-length');

  headers.delete('content-encoding');

  return new Response(rewrittenBody, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}
