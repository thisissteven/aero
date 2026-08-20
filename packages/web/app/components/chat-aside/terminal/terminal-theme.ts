// app/features/terminal/terminal-theme.ts

export interface GhosttyThemeColors {
  background: string;
  foreground: string;
  cursor: string;
  cursorAccent: string;

  selectionBackground: string;
  selectionForeground?: string;
  selectionInactiveBackground?: string;

  black: string;
  red: string;
  green: string;
  yellow: string;
  blue: string;
  magenta: string;
  cyan: string;
  white: string;

  brightBlack: string;
  brightRed: string;
  brightGreen: string;
  brightYellow: string;
  brightBlue: string;
  brightMagenta: string;
  brightCyan: string;
  brightWhite: string;
}

const FALLBACK_THEME: GhosttyThemeColors = {
  background: '#1e1e1e',
  foreground: '#d4d4d4',
  cursor: '#569cd6',
  cursorAccent: '#1e1e1e',

  selectionBackground: 'rgba(86, 156, 214, 0.3)',
  selectionForeground: '#ffffff',
  selectionInactiveBackground: 'rgba(86, 156, 214, 0.15)',

  black: '#000000',
  red: '#cd3131',
  green: '#0dbc79',
  yellow: '#e5e510',
  blue: '#2472c8',
  magenta: '#bc3fbc',
  cyan: '#11a8cd',
  white: '#e5e5e5',

  brightBlack: '#666666',
  brightRed: '#cd3131',
  brightGreen: '#14ce14',
  brightYellow: '#e5e510',
  brightBlue: '#2472c8',
  brightMagenta: '#bc3fbc',
  brightCyan: '#11a8cd',
  brightWhite: '#e5e5e5',
};

let colorHelperEl: HTMLDivElement | null = null;

/**
 * Converts computed rgb/rgba strings into standard hex format (#RRGGBB / #RRGGBBAA)
 */
function rgbaToHex(colorStr: string): string {
  const match = colorStr.match(
    /^rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)$/,
  );
  if (!match) return colorStr;

  const r = parseInt(match[1], 10).toString(16).padStart(2, '0');
  const g = parseInt(match[2], 10).toString(16).padStart(2, '0');
  const b = parseInt(match[3], 10).toString(16).padStart(2, '0');

  if (match[4] !== undefined) {
    const a = Math.round(parseFloat(match[4]) * 255)
      .toString(16)
      .padStart(2, '0');
    return `#${r}${g}${b}${a}`;
  }

  return `#${r}${g}${b}`;
}

/**
 * Normalizes any modern CSS color format (oklch, oklab, hsl, color(), var(), etc.)
 * into a standard Hex color via the browser's native style resolver.
 */
function normalizeCssColor(
  rawColor: string,
  fallback: string,
  target?: Element | null,
): string {
  if (typeof window === 'undefined' || !rawColor) {
    return fallback;
  }

  const trimmed = rawColor.trim();
  if (!trimmed) return fallback;

  try {
    if (!colorHelperEl) {
      colorHelperEl = document.createElement('div');
      colorHelperEl.style.display = 'none';
      document.body.appendChild(colorHelperEl);
    }

    const parent = target || document.body;
    if (colorHelperEl.parentElement !== parent) {
      parent.appendChild(colorHelperEl);
    }

    colorHelperEl.style.color = '';
    colorHelperEl.style.color = trimmed;

    // If setting style.color fails (invalid syntax), fall back to safety
    if (!colorHelperEl.style.color) {
      colorHelperEl.style.color = fallback;
    }

    const computed = getComputedStyle(colorHelperEl).color;
    return rgbaToHex(computed) || fallback;
  } catch {
    return fallback;
  }
}

function getVar(
  styles: CSSStyleDeclaration,
  name: string,
  fallback: string,
  target?: Element | null,
): string {
  const rawValue = styles.getPropertyValue(name).trim();
  return normalizeCssColor(rawValue || fallback, fallback, target);
}

export function resolveGhosttyTheme(
  target?: Element | null,
): GhosttyThemeColors {
  if (typeof window === 'undefined' || !target) {
    return FALLBACK_THEME;
  }

  const styles = getComputedStyle(target);

  const background = getVar(
    styles,
    '--background',
    FALLBACK_THEME.background,
    target,
  );

  const foreground = getVar(
    styles,
    '--foreground',
    FALLBACK_THEME.foreground,
    target,
  );

  const accent = getVar(styles, '--accent', FALLBACK_THEME.cursor, target);

  const accentForeground = getVar(
    styles,
    '--accent-foreground',
    foreground,
    target,
  );

  const selection = getVar(
    styles,
    '--accent',
    FALLBACK_THEME.selectionBackground,
    target,
  );

  const surface = getVar(styles, '--surface', background, target);

  const surfaceForeground = getVar(
    styles,
    '--surface-foreground',
    foreground,
    target,
  );

  const muted = getVar(styles, '--muted', FALLBACK_THEME.brightBlack, target);

  const success = getVar(styles, '--success', FALLBACK_THEME.green, target);

  const warning = getVar(styles, '--warning', FALLBACK_THEME.yellow, target);

  const danger = getVar(styles, '--danger', FALLBACK_THEME.red, target);

  return {
    background,
    foreground,

    cursor: accent,
    cursorAccent: background,

    selectionBackground: selection,
    selectionForeground: accentForeground,
    selectionInactiveBackground: selection,

    /*
     * Normal ANSI
     */
    black: surface,
    red: danger,
    green: success,
    yellow: warning,
    blue: accent,
    magenta: accent,
    cyan: accent,
    white: surfaceForeground,

    /*
     * Bright ANSI
     */
    brightBlack: muted,
    brightRed: danger,
    brightGreen: success,
    brightYellow: warning,
    brightBlue: accent,
    brightMagenta: accent,
    brightCyan: accent,
    brightWhite: foreground,
  };
}
