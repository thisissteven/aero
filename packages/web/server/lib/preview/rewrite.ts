export type RewriteKind = 'html' | 'css' | 'javascript';

interface RewriteOptions {
  proxyBasePath: string;
  targetOrigin: string;
}

const VITE_CLIENT_RE =
  /<script\b[^>]*>\s*import\(\s*["']\/@vite\/client["']\s*\)\s*<\/script>/gi;

function normalizeProxyBase(value: string): string {
  return value.replace(/\/+$/, '');
}

function isSameOrigin(value: string, targetOrigin: string): boolean {
  try {
    return new URL(value).origin === new URL(targetOrigin).origin;
  } catch {
    return false;
  }
}

function rewriteResourceUrl(value: string, options: RewriteOptions): string {
  if (!value) {
    return value;
  }

  const trimmed = value.trim();
  const proxyBase = normalizeProxyBase(options.proxyBasePath);

  if (
    !trimmed ||
    trimmed.startsWith('#') ||
    /^(?:data|blob|javascript|mailto|tel|about):/i.test(trimmed)
  ) {
    return value;
  }

  if (trimmed === proxyBase || trimmed.startsWith(`${proxyBase}/`)) {
    return trimmed;
  }

  if (trimmed.startsWith('//')) {
    try {
      const parsed = new URL(`http:${trimmed}`);

      if (isSameOrigin(parsed.toString(), options.targetOrigin)) {
        return `${proxyBase}${parsed.pathname}${parsed.search}${parsed.hash}`;
      }
    } catch {
      //
    }

    return value;
  }

  if (trimmed.startsWith('/')) {
    return `${proxyBase}${trimmed}`;
  }

  if (/^https?:\/\//i.test(trimmed)) {
    try {
      const parsed = new URL(trimmed);

      if (parsed.origin === new URL(options.targetOrigin).origin) {
        return `${proxyBase}${parsed.pathname}${parsed.search}${parsed.hash}`;
      }
    } catch {
      //
    }
  }

  return value;
}

function stripCspMeta(html: string): string {
  return html.replace(
    /<meta\b[^>]*\bhttp-equiv\s*=\s*(?:"content-security-policy"|'content-security-policy'|content-security-policy)[^>]*>/gi,
    '',
  );
}

function stripViteClient(html: string): string {
  return html.replace(VITE_CLIENT_RE, '');
}

function rewriteBaseTag(html: string, proxyBasePath: string): string {
  const href = `${normalizeProxyBase(proxyBasePath)}/`;

  let found = false;

  let result = html.replace(
    /<base\b([^>]*)>/gi,
    (_match, attributes: string) => {
      found = true;

      const cleaned = attributes.replace(
        /\s+href\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/i,
        '',
      );

      return `<base${cleaned} href="${href}">`;
    },
  );

  if (!found) {
    result = result.replace(
      /<head\b[^>]*>/i,
      (match) => `${match}<base href="${href}">`,
    );
  }

  return result;
}

function rewriteHtml(html: string, options: RewriteOptions): string {
  let result = stripCspMeta(html);

  result = stripViteClient(result);

  result = rewriteBaseTag(result, options.proxyBasePath);

  result = result.replace(
    /\b(src|href|action|poster|cite|formaction)=(['"])([^'"]*)\2/gi,
    (_match, attribute, quote, value) => {
      const rewritten = rewriteResourceUrl(value, options);

      return `${attribute}=${quote}${rewritten}${quote}`;
    },
  );

  result = result.replace(
    /\bsrcset=(['"])([^'"]*)\1/gi,
    (_match, quote, value) => {
      const rewritten = String(value)
        .split(',')
        .map((entry) => {
          const parts = entry.trim().split(/\s+/);
          const resource = parts.shift() ?? '';

          return [rewriteResourceUrl(resource, options), ...parts].join(' ');
        })
        .join(', ');

      return `srcset=${quote}${rewritten}${quote}`;
    },
  );

  result = result.replace(/\bstyle=(['"])(.*?)\1/gi, (_match, quote, value) => {
    return `style=${quote}${rewriteCss(value, options)}${quote}`;
  });

  return result;
}

function rewriteCss(css: string, options: RewriteOptions): string {
  return css.replace(
    /url\(\s*(['"]?)(.*?)\1\s*\)/gi,
    (_match, quote, value) => {
      const rewritten = rewriteResourceUrl(String(value).trim(), options);

      return `url(${quote || ''}${rewritten}${quote || ''})`;
    },
  );
}

function rewriteJavaScript(source: string, _options: RewriteOptions): string {
  return source;
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
      return rewriteJavaScript(bodyText, options);

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

  if (
    host === 'localhost' ||
    host.endsWith('.localhost') ||
    host.endsWith('.local')
  ) {
    return false;
  }

  const v4 = host.match(/^(\d+)\.(\d+)\.(\d+)\.(\d+)$/);

  if (v4) {
    const a = Number(v4[1]);
    const b = Number(v4[2]);

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
    const resolved = new URL(location, new URL(targetOrigin));

    if (resolved.origin !== new URL(targetOrigin).origin) {
      return resolved.toString();
    }

    return `${normalizeProxyBase(proxyBasePath)}${resolved.pathname}${resolved.search}${resolved.hash}`;
  } catch {
    return location;
  }
}
