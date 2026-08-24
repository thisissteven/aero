// server/lib/preview/rewrite.ts

function appendPreviewToken(url: string, token: string): string {
  const hashIndex = url.indexOf('#');
  const hash = hashIndex >= 0 ? url.slice(hashIndex) : '';
  const withoutHash = hashIndex >= 0 ? url.slice(0, hashIndex) : url;
  const queryIndex = withoutHash.indexOf('?');
  const pathname =
    queryIndex >= 0 ? withoutHash.slice(0, queryIndex) : withoutHash;
  const search = queryIndex >= 0 ? withoutHash.slice(queryIndex + 1) : '';
  const params = new URLSearchParams(search);
  params.set('oc_preview_token', token);
  const qs = params.toString();
  return `${pathname}${qs ? `?${qs}` : ''}${hash}`;
}

export type RewriteKind = 'html' | 'css' | 'javascript';

export interface RewritePreviewBodyOptions {
  bodyText: string;
  proxyBasePath: string;
  targetOrigin: string;
  kind: RewriteKind;
  previewToken: string;
}

export function rewritePreviewBody({
  bodyText,
  proxyBasePath,
  targetOrigin,
  kind,
  previewToken,
}: RewritePreviewBodyOptions): string {
  if (typeof bodyText !== 'string' || bodyText.length === 0) return bodyText;

  const prefix = proxyBasePath.endsWith('/')
    ? proxyBasePath.slice(0, -1)
    : proxyBasePath;
  const target = targetOrigin ? new URL(targetOrigin) : null;

  const isSameTargetOrigin = (url: URL): boolean => {
    if (!target) return false;
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return false;
    if (url.origin === target.origin) return true;

    const localHosts = ['localhost', '127.0.0.1', '0.0.0.0', '::1', '[::1]'];
    if (!localHosts.includes(url.hostname)) return false;
    return url.port === target.port;
  };

  const rewriteResourceUrl = (value: string): string => {
    if (typeof value !== 'string' || value.length === 0) return value;

    if (value.startsWith('/') && !value.startsWith('//')) {
      if (value.startsWith(`${prefix}/`) || value === prefix) {
        return appendPreviewToken(value, previewToken);
      }
      return appendPreviewToken(`${prefix}${value}`, previewToken);
    }

    try {
      const parsed = new URL(value);
      if (isSameTargetOrigin(parsed)) {
        return appendPreviewToken(
          `${prefix}${parsed.pathname}${parsed.search}${parsed.hash}`,
          previewToken,
        );
      }
    } catch {
      return value;
    }

    return value;
  };

  const stripPreviewCspMeta = (text: string): string =>
    text
      .replace(
        /<meta\b(?=[^>]*\bhttp-equiv\s*=\s*(['"])content-security-policy\1)[^>]*>/gi,
        '',
      )
      .replace(
        /<meta\b(?=[^>]*\bhttp-equiv\s*=\s*content-security-policy\b)[^>]*>/gi,
        '',
      );

  const rewriteCss = (text: string): string =>
    text
      .replace(/url\((['"]?)([^)'"]*)\1\)/gi, (_match, quote, value) => {
        const q = quote || '';
        return `url(${q}${rewriteResourceUrl(value)}${q})`;
      })
      .replace(
        /@import\s+(['"])\/(?!\/)([^'"]*)\1/gi,
        (_match, quote, path) => {
          return `@import ${quote}${rewriteResourceUrl(`/${path}`)}${quote}`;
        },
      );

  const rewriteJavaScript = (text: string): string =>
    text
      .replace(/\bfrom\s+(['"])\/(?!\/)([^'"]*)\1/gi, (_match, quote, path) => {
        return `from ${quote}${rewriteResourceUrl(`/${path}`)}${quote}`;
      })
      .replace(
        /\bimport\s+(['"])\/(?!\/)([^'"]*)\1/gi,
        (_match, quote, path) => {
          return `import ${quote}${rewriteResourceUrl(`/${path}`)}${quote}`;
        },
      )
      .replace(
        /\bimport\(\s*(['"])\/(?!\/)([^'"]*)\1\s*\)/gi,
        (_match, quote, path) => {
          return `import(${quote}${rewriteResourceUrl(`/${path}`)}${quote})`;
        },
      );

  const rewriteInlineModuleScripts = (text: string): string =>
    text.replace(
      /<script\b([^>]*)>([\s\S]*?)<\/script>/gi,
      (match, attrs, scriptBody) => {
        if (/\bsrc\s*=/i.test(attrs)) return match;

        const typeMatch = String(attrs || '').match(
          /\btype\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i,
        );
        const type = String(
          typeMatch?.[1] ?? typeMatch?.[2] ?? typeMatch?.[3] ?? '',
        )
          .trim()
          .toLowerCase();
        if (type !== 'module') return match;

        const rewrittenScriptBody = rewriteJavaScript(scriptBody);
        if (rewrittenScriptBody === scriptBody) return match;
        return `<script${attrs}>${rewrittenScriptBody}</script>`;
      },
    );

  const rewriteHtml = (text: string): string =>
    rewriteInlineModuleScripts(
      text
        .replace(
          /\b(src|href|action)=(['"])([^'"]*)\2/gi,
          (_match, attr, quote, value) => {
            return `${attr}=${quote}${rewriteResourceUrl(value)}${quote}`;
          },
        )
        .replace(/\bsrcset=(['"])([^'"]*)\1/gi, (_match, quote, value) => {
          const rewritten = String(value)
            .split(',')
            .map((part) => {
              const trimmed = part.trim();
              if (!trimmed) return trimmed;
              const segments = trimmed.split(/\s+/);
              segments[0] = rewriteResourceUrl(segments[0] || '');
              return segments.join(' ');
            })
            .join(', ');
          return `srcset=${quote}${rewritten}${quote}`;
        }),
    );

  if (kind === 'html') return stripPreviewCspMeta(rewriteHtml(bodyText));
  if (kind === 'css') return rewriteCss(bodyText);
  if (kind === 'javascript') return rewriteJavaScript(bodyText);
  return bodyText;
}

export function detectRewriteKind(contentType: string): RewriteKind | null {
  if (contentType.includes('text/html')) return 'html';
  if (contentType.includes('text/css')) return 'css';
  if (contentType.includes('javascript') || contentType.includes('ecmascript'))
    return 'javascript';
  return null;
}

// --- SSRF guard: BLOCKED hosts for EXTERNAL (non-localhost) targets only ---
// localhost is allowed because this is a dev preview tool.
export function isBlockedExternalHost(hostname: string): boolean {
  if (!hostname) return true;
  let host = hostname.toLowerCase();
  if (host.startsWith('[') && host.endsWith(']')) host = host.slice(1, -1);

  // Allow localhost for dev previews
  if (
    host === 'localhost' ||
    host.endsWith('.localhost') ||
    host.endsWith('.local')
  )
    return false;

  if (
    host === '127.0.0.1' ||
    host === '0.0.0.0' ||
    host === '::1' ||
    host === '[::1]'
  )
    return false;

  const v4 = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (v4) {
    const a = Number(v4[1]);
    const b = Number(v4[2]);
    if (a === 0 || a === 127 || a === 10) return true;
    if (a === 169 && b === 254) return true; // link-local incl. cloud metadata
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 100 && b >= 64 && b <= 127) return true;
    return false;
  }

  if (host.includes(':')) {
    if (host === '::1' || host === '::') return true;
    if (host.startsWith('fe80')) return true;
    if (host.startsWith('fc') || host.startsWith('fd')) return true;
    if (host.includes('::ffff:')) return true;
  }
  return false;
}

export interface CSPDirective {
  name?: string;
  tokens: string[];
}

// Typing for the map holding the directives
export type DirectivesMap = Map<string, CSPDirective>;

// Function parameter & global state types
export type AllowInlineStyleFn = (directive: CSPDirective) => void;

// Implementation with full explicit typing
const allowInlineStyle: AllowInlineStyleFn = (d: CSPDirective): void => {
  d.tokens = d.tokens.filter((t: string) => t.toLowerCase() !== "'none'");
  if (!d.tokens.some((t: string) => t.toLowerCase() === "'unsafe-inline'")) {
    d.tokens.push("'unsafe-inline'");
  }
};

// --- CSP rewrite: carve out room for the bridge via a nonce instead of ---
// --- deleting the target site's script restrictions wholesale ------------
export function rewritePreviewCspHeader(
  cspValue: string,
  nonce?: string,
): string | null {
  if (typeof cspValue !== 'string' || cspValue.length === 0) return cspValue;
  const nonceSource = nonce ? `'nonce-${nonce}'` : '';

  const directives = cspValue
    .split(';')
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => {
      const tokens = p.split(/\s+/);
      return { name: (tokens[0] || '').toLowerCase(), tokens };
    })
    .filter(
      (d) =>
        d.name !== 'frame-ancestors' && d.name !== 'require-trusted-types-for',
    );

  if (nonceSource) {
    const byName = new Map(directives.map((d) => [d.name, d]));
    const allow = (d: { tokens: string[] }) => {
      d.tokens = d.tokens.filter((t) => t.toLowerCase() !== "'none'");
      if (!d.tokens.includes(nonceSource)) d.tokens.push(nonceSource);
    };
    const scriptElem = byName.get('script-src-elem');
    const scriptSrc = byName.get('script-src');
    if (scriptElem) allow(scriptElem);
    if (scriptSrc) allow(scriptSrc);
    if (!scriptElem && !scriptSrc && byName.has('default-src')) {
      const base = byName
        .get('default-src')!
        .tokens.slice(1)
        .filter((t) => t.toLowerCase() !== "'none'");
      directives.push({
        name: 'script-src',
        tokens: ['script-src', ...base, nonceSource],
      });
    }

    // Map lookup types
    const styleElem: CSPDirective | undefined = byName.get('style-src-elem');
    const styleAttr: CSPDirective | undefined = byName.get('style-src-attr');
    const styleSrc: CSPDirective | undefined = byName.get('style-src');

    if (styleElem) allowInlineStyle(styleElem);
    if (styleAttr) allowInlineStyle(styleAttr);
    if (styleSrc) allowInlineStyle(styleSrc);

    if (!styleElem && !styleAttr && !styleSrc && byName.has('default-src')) {
      const defaultSrc = byName.get('default-src');

      if (defaultSrc) {
        const base: string[] = defaultSrc.tokens
          .slice(1)
          .filter((t: string) => t.toLowerCase() !== "'none'");

        directives.push({
          name: 'style-src',
          tokens: ['style-src', ...base, "'unsafe-inline'"],
        });
      }
    }
  }

  const rebuilt = directives.map((d) => d.tokens.join(' '));
  return rebuilt.length > 0 ? rebuilt.join('; ') : null;
}
