export type RewriteKind = 'html' | 'css' | 'javascript';

interface RewriteOptions {
  proxyBasePath: string;
  targetOrigin: string;
}

function normalizeProxyBase(value: string): string {
  if (!value) {
    return '';
  }

  return value.replace(/\/+$/, '');
}

function sameOrigin(value: string, targetOrigin: string): boolean {
  try {
    return new URL(value).origin === new URL(targetOrigin).origin;
  } catch {
    return false;
  }
}

function proxyPath(
  pathname: string,
  search: string,
  hash: string,
  options: RewriteOptions,
): string {
  const base = normalizeProxyBase(options.proxyBasePath);

  return `${base || ''}${pathname}${search}${hash}`;
}

function rewriteAbsoluteSameOriginUrl(
  value: string,
  options: RewriteOptions,
): string {
  const trimmed = value.trim();

  if (!trimmed) {
    return value;
  }

  if (
    trimmed.startsWith('#') ||
    /^(?:data|blob|javascript|mailto|tel|about):/i.test(trimmed)
  ) {
    return value;
  }

  if (trimmed.startsWith('//')) {
    try {
      const parsed = new URL(`http:${trimmed}`);

      if (!sameOrigin(parsed.toString(), options.targetOrigin)) {
        return value;
      }

      return proxyPath(parsed.pathname, parsed.search, parsed.hash, options);
    } catch {
      return value;
    }
  }

  if (!/^https?:\/\//i.test(trimmed)) {
    return value;
  }

  try {
    const parsed = new URL(trimmed);

    if (parsed.origin !== new URL(options.targetOrigin).origin) {
      return value;
    }

    return proxyPath(parsed.pathname, parsed.search, parsed.hash, options);
  } catch {
    return value;
  }
}

function rewriteRootRelativeUrl(
  value: string,
  options: RewriteOptions,
): string {
  const trimmed = value.trim();

  if (!trimmed.startsWith('/')) {
    return value;
  }

  const base = normalizeProxyBase(options.proxyBasePath);

  // Dedicated preview subdomain:
  // /assets/foo.js can stay /assets/foo.js.
  if (!base) {
    return value;
  }

  return `${base}${trimmed}`;
}

function rewriteResourceUrl(value: string, options: RewriteOptions): string {
  const trimmed = value.trim();

  if (!trimmed) {
    return value;
  }

  if (
    trimmed.startsWith('#') ||
    /^(?:data|blob|javascript|mailto|tel|about):/i.test(trimmed)
  ) {
    return value;
  }

  if (trimmed.startsWith('/')) {
    return rewriteRootRelativeUrl(trimmed, options);
  }

  return rewriteAbsoluteSameOriginUrl(trimmed, options);
}

function rewriteSrcSet(value: string, options: RewriteOptions): string {
  return value
    .split(',')
    .map((entry) => {
      const parts = entry.trim().split(/\s+/);

      if (!parts[0]) {
        return entry;
      }

      const resource = parts.shift()!;

      return [rewriteResourceUrl(resource, options), ...parts].join(' ');
    })
    .join(', ');
}

function rewriteBaseTag(html: string, options: RewriteOptions): string {
  if (!options.proxyBasePath) {
    return html;
  }

  return html.replace(/<base\b([^>]*)>/gi, (match, attributes: string) => {
    const hrefMatch = attributes.match(
      /\bhref\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i,
    );

    const href = String(
      hrefMatch?.[1] ?? hrefMatch?.[2] ?? hrefMatch?.[3] ?? '',
    );

    if (!href) {
      return match;
    }

    try {
      const resolved = new URL(href, `${options.targetOrigin}/`);

      if (resolved.origin !== new URL(options.targetOrigin).origin) {
        return match;
      }

      const nextHref = `${normalizeProxyBase(options.proxyBasePath)}/`;

      const cleaned = attributes.replace(
        /\s+href\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/i,
        '',
      );

      return `<base${cleaned} href="${nextHref}">`;
    } catch {
      return match;
    }
  });
}

function rewriteHtml(html: string, options: RewriteOptions): string {
  let result = html;

  // Only rewrite an existing <base> that already points at the
  // target origin. Never introduce a new base tag.
  result = rewriteBaseTag(result, options);

  result = result.replace(
    /\b(src|href|action|poster|cite|formaction)\s*=\s*(["'])([^"']*)\2/gi,
    (_match, attribute, quote, value) => {
      const rewritten = rewriteResourceUrl(String(value), options);

      if (rewritten === value) {
        return _match;
      }

      return `${attribute}=${quote}${rewritten}${quote}`;
    },
  );

  result = result.replace(
    /\bsrcset\s*=\s*(["'])([^"']*)\1/gi,
    (_match, quote, value) => {
      const rewritten = rewriteSrcSet(String(value), options);

      if (rewritten === value) {
        return _match;
      }

      return `srcset=${quote}${rewritten}${quote}`;
    },
  );

  // CSS inside inline style attributes can contain absolute
  // same-origin URLs. Only rewrite those.
  result = result.replace(
    /\bstyle\s*=\s*(["'])(.*?)\1/gi,
    (_match, quote, value) => {
      const rewritten = rewriteCss(String(value), options);

      if (rewritten === value) {
        return _match;
      }

      return `style=${quote}${rewritten}${quote}`;
    },
  );

  return result;
}

function rewriteCss(css: string, options: RewriteOptions): string {
  return css.replace(
    /url\(\s*(['"]?)(.*?)\1\s*\)/gi,
    (_match, quote, value) => {
      const original = String(value).trim();
      const rewritten = rewriteResourceUrl(original, options);

      if (rewritten === original) {
        return _match;
      }

      return `url(${quote}${rewritten}${quote})`;
    },
  );
}

export function rewritePreviewBody(
  bodyText: string,
  kind: RewriteKind,
  options: RewriteOptions,
): string {
  switch (kind) {
    case 'html':
      return rewriteHtml(bodyText, options);

    case 'css':
      return rewriteCss(bodyText, options);

    case 'javascript':
      // Deliberately do not touch JS.
      return bodyText;

    default:
      return bodyText;
  }
}

export function detectRewriteKind(contentType: string): RewriteKind | null {
  const value = contentType.toLowerCase();

  if (value.includes('text/html') || value.includes('application/xhtml+xml')) {
    return 'html';
  }

  if (value.includes('text/css')) {
    return 'css';
  }

  if (value.includes('javascript') || value.includes('ecmascript')) {
    return 'javascript';
  }

  return null;
}

export function isBlockedExternalHost(hostname: string): boolean {
  if (!hostname) {
    return true;
  }

  let host = hostname.toLowerCase();

  if (host.startsWith('[') && host.endsWith(']')) {
    host = host.slice(1, -1);
  }

  // These are intentionally permitted because Aero previews
  // commonly point at local development servers.
  if (
    host === 'localhost' ||
    host.endsWith('.localhost') ||
    host.endsWith('.local')
  ) {
    return false;
  }

  const ipv4 = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);

  if (ipv4) {
    const [a, b, c, d] = ipv4.slice(1).map(Number);

    if ([a, b, c, d].some((part) => part < 0 || part > 255)) {
      return true;
    }

    return (
      a === 0 ||
      a === 10 ||
      a === 127 ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      (a === 100 && b >= 64 && b <= 127)
    );
  }

  if (host.includes(':')) {
    return (
      host === '::' ||
      host === '::1' ||
      host.startsWith('fe80:') ||
      host.startsWith('fc') ||
      host.startsWith('fd')
    );
  }

  return false;
}

export function rewritePreviewCspHeader(
  value: string,
  nonce: string,
): string | null {
  if (!value) {
    return null;
  }

  const nonceSource = `'nonce-${nonce}'`;

  const directives = value
    .split(';')
    .map((part) => {
      const tokens = part.trim().split(/\s+/);

      return {
        name: tokens[0]?.toLowerCase() ?? '',
        tokens,
      };
    })
    .filter(
      (directive) =>
        directive.name &&
        directive.name !== 'frame-ancestors' &&
        directive.name !== 'require-trusted-types-for',
    );

  const byName = new Map(
    directives.map((directive) => [directive.name, directive]),
  );

  const allowNonce = (directive: { tokens: string[] }) => {
    directive.tokens = directive.tokens.filter(
      (token) => token.toLowerCase() !== "'none'",
    );

    if (!directive.tokens.includes(nonceSource)) {
      directive.tokens.push(nonceSource);
    }
  };

  const scriptSrc = byName.get('script-src');
  const scriptElem = byName.get('script-src-elem');

  if (scriptSrc) {
    allowNonce(scriptSrc);
  }

  if (scriptElem) {
    allowNonce(scriptElem);
  }

  if (!scriptSrc && !scriptElem) {
    const defaultSrc = byName.get('default-src');

    if (defaultSrc) {
      directives.push({
        name: 'script-src',
        tokens: [
          'script-src',
          ...defaultSrc.tokens
            .slice(1)
            .filter((token) => token.toLowerCase() !== "'none'"),
          nonceSource,
        ],
      });
    }
  }

  return directives.map((directive) => directive.tokens.join(' ')).join('; ');
}

export function rewritePreviewRedirectLocation(
  location: string,
  proxyBasePath: string,
  targetOrigin: string,
): string {
  try {
    const resolved = new URL(location, `${targetOrigin}/`);

    if (resolved.origin !== new URL(targetOrigin).origin) {
      return resolved.toString();
    }

    return (
      `${normalizeProxyBase(proxyBasePath)}` +
      `${resolved.pathname}` +
      `${resolved.search}` +
      `${resolved.hash}`
    );
  } catch {
    return location;
  }
}
