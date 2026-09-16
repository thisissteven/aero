'use client';

import { Button, cn } from '@aero/ui';
import {
  ArrowUpRightFromSquare,
  Globe,
  LayoutSplitColumns,
  SquareChartBar,
} from '@gravity-ui/icons';
import { File, PatchDiff } from '@pierre/diffs/react';
import type {
  ComponentPropsWithRef,
  ReactElement,
  ReactNode,
  SVGProps,
} from 'react';
import {
  createContext,
  memo,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

// ── Shadow-root CSS ─────────────────────────────────────────────────────────
//
// Page CSS can't cross into Pierre's shadow root, so this is the only place
// we can style the internals. It's deliberately small: kill Pierre's own
// padding + backgrounds, match our typography, and dim the gutter.

const PIERRE_SHADOW_CSS = `
:host {
  --diffs-dark-bg: transparent !important;
  --diffs-light-bg: transparent !important;
  --diffs-font-family: var(--font-mono, ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace);
  --diffs-font-size: 12.5px;
  --diffs-line-height: 1.65;
}

:host,
:host * {
  scrollbar-gutter: auto !important;
}

:host [data-code],
:host [data-diff] {
  overflow-x: auto !important;
  overflow-y: auto !important;
}

pre {
  padding-top: 0 !important;
  padding-bottom: 0 !important;
}

[data-code] {
  padding-top: 0 !important;
  padding-bottom: 0 !important;
}

[data-gutter-buffer] {
  opacity: 0.4 !important;
}

* {
  scrollbar-width: thin;
  scrollbar-color: color-mix(in oklab, currentColor 15%, transparent) transparent;
}

*::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}

*::-webkit-scrollbar-track {
  background: transparent;
}

*::-webkit-scrollbar-thumb {
  background-color: color-mix(in oklab, currentColor 15%, transparent);
  border-radius: 9999px;
}

*::-webkit-scrollbar-thumb:hover {
  background-color: color-mix(in oklab, currentColor 30%, transparent);
}
`;

// ── Context ─────────────────────────────────────────────────────────────────

type ViewMode = 'split' | 'unified';
type ThemeType = 'light' | 'dark';

interface CodeBlockContextValue {
  wrap: boolean;
  setWrap: (wrap: boolean) => void;
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  themeType: ThemeType;
  setThemeType: (mode: ThemeType) => void;
}

const CodeBlockContext = createContext<CodeBlockContextValue>({
  wrap: true,
  setWrap: () => {
    //
  },
  viewMode: 'unified',
  setViewMode: () => {
    //
  },
  themeType: 'light',
  setThemeType: () => {
    //
  },
});

const useCodeBlock = (): CodeBlockContextValue => useContext(CodeBlockContext);

// ── Root / Header / Footer ──────────────────────────────────────────────────

export interface CodeBlockRootProps extends ComponentPropsWithRef<'div'> {
  children: ReactNode;
  defaultWrap?: boolean;
  defaultViewMode?: ViewMode;
  defaultThemeType?: ThemeType;
}

export function CodeBlockRoot({
  children,
  className,
  defaultWrap = true,
  defaultViewMode = 'unified',
  defaultThemeType = 'light',
  ...props
}: CodeBlockRootProps): ReactElement {
  const [wrap, setWrap] = useState(defaultWrap);
  const [viewMode, setViewMode] = useState<ViewMode>(defaultViewMode);
  const [themeType, setThemeType] = useState<ThemeType>(defaultThemeType);

  const value = useMemo<CodeBlockContextValue>(
    () => ({ wrap, setWrap, viewMode, setViewMode, themeType, setThemeType }),
    [wrap, viewMode, themeType],
  );

  return (
    <CodeBlockContext.Provider value={value}>
      <div
        className={cn(
          // Framing: subtle surface, hairline border, generous radius.
          'group/code-block w-full min-w-0 overflow-hidden rounded-lg',
          'border border-separator',
          'text-[13px] text-foreground',
          className,
        )}
        data-slot='code-block'
        data-wrap={wrap || undefined}
        data-view-mode={viewMode}
        data-theme-type={themeType}
        {...props}
      >
        {children}
      </div>
    </CodeBlockContext.Provider>
  );
}

export interface CodeBlockHeaderProps extends ComponentPropsWithRef<'div'> {
  children: ReactNode;
}

export const CodeBlockHeader = memo(function CodeBlockHeader({
  children,
  className,
  ...props
}: CodeBlockHeaderProps): ReactElement {
  return (
    <div
      className={cn(
        // Compact single-line header. No background of its own — the
        // hairline at the bottom is what separates it from the code.
        'flex h-8 items-center justify-between gap-2 border-b border-separator pl-3 pr-1',
        'text-muted',
        className,
      )}
      data-slot='code-block-header'
      {...props}
    >
      {children}
    </div>
  );
});

export interface CodeBlockFooterProps extends ComponentPropsWithRef<'div'> {
  children: ReactNode;
}

export const CodeBlockFooter = memo(function CodeBlockFooter({
  children,
  className,
  ...props
}: CodeBlockFooterProps): ReactElement {
  return (
    <div
      className={cn(
        // Mirrors the header: same height + padding, hairline on top so the
        // block reads as a symmetric frame around the code. Muted by default.
        'flex h-8 items-center justify-end gap-2 border-t border-separator px-3',
        'text-muted text-xs bg-surface',
        className,
      )}
      data-slot='code-block-footer'
      {...props}
    >
      {children}
    </div>
  );
});

// ── Code block ──────────────────────────────────────────────────────────────

export interface CodeBlockCodeProps extends ComponentPropsWithRef<'div'> {
  code: string;
  language?: string;
  theme?: string;
  darkTheme?: string;
  showLineNumbers?: boolean;
  scrollOverflow?: boolean;
  highlightedHtml?: string;
  variant?: 'file' | 'diff';
  patch?: string;
  viewMode?: ViewMode;
  themeType?: ThemeType;
  unsafeCSS?: string;
}

export const CodeBlockCode = memo(function CodeBlockCode({
  className,
  code,
  darkTheme = 'github-dark',
  highlightedHtml: _highlightedHtml,
  language = 'plaintext',
  patch,
  scrollOverflow: _scrollOverflow = false,
  showLineNumbers = false,
  theme = 'github-light',
  unsafeCSS,
  variant = 'file',
  viewMode: viewModeProp,
  themeType: themeTypeProp,
  style,
  ...props
}: CodeBlockCodeProps): ReactElement {
  const {
    wrap,
    viewMode: contextViewMode,
    themeType: contextThemeType,
  } = useCodeBlock();

  const viewMode = viewModeProp ?? contextViewMode;
  const themeType = themeTypeProp ?? contextThemeType;

  const mergedCSS = unsafeCSS
    ? `${PIERRE_SHADOW_CSS}\n${unsafeCSS}`
    : PIERRE_SHADOW_CSS;

  const content = (() => {
    if (variant === 'diff') {
      if (!patch) {
        return (
          <pre className='m-0 px-3 py-2 font-mono text-xs leading-relaxed whitespace-pre'>
            <code>{code}</code>
          </pre>
        );
      }
      return (
        <PatchDiff
          patch={patch}
          options={{
            theme: { dark: darkTheme, light: theme },
            themeType,
            diffStyle: viewMode,
            disableFileHeader: true,
            overflow: wrap ? 'wrap' : 'scroll',
            unsafeCSS: mergedCSS,
          }}
        />
      );
    }

    return (
      <File
        file={{ name: `snippet.${language}`, contents: code }}
        options={{
          theme: { dark: darkTheme, light: theme },
          themeType,
          disableLineNumbers: !showLineNumbers,
          disableFileHeader: true,
          overflow: wrap ? 'wrap' : 'scroll',
          unsafeCSS: mergedCSS,
        }}
      />
    );
  })();

  return (
    <div
      className={cn(
        'min-w-0 scrollbar-thin',
        'overflow-y-auto',
        wrap ? 'overflow-x-hidden' : 'overflow-x-auto',
        '[&_pre]:!bg-transparent',
        className,
      )}
      data-line-numbers={showLineNumbers || undefined}
      data-slot='code-block-code'
      data-variant={variant}
      style={{ maxHeight: '40vh', ...style }}
      {...props}
    >
      {content}
    </div>
  );
});

// ── Dedicated diff ──────────────────────────────────────────────────────────

export interface CodeBlockDiffProps extends ComponentPropsWithRef<'div'> {
  patch: string;
  theme?: string;
  darkTheme?: string;
  viewMode?: ViewMode;
  themeType?: ThemeType;
  scrollOverflow?: boolean;
  unsafeCSS?: string;
}

export const CodeBlockDiff = memo(function CodeBlockDiff({
  className,
  darkTheme = 'github-dark',
  patch,
  scrollOverflow: _scrollOverflow = false,
  theme = 'github-light',
  unsafeCSS,
  viewMode: viewModeProp,
  themeType: themeTypeProp,
  style,
  ...props
}: CodeBlockDiffProps): ReactElement {
  const {
    wrap,
    viewMode: contextViewMode,
    themeType: contextThemeType,
  } = useCodeBlock();

  const viewMode = viewModeProp ?? contextViewMode;
  const themeType = themeTypeProp ?? contextThemeType;

  const mergedCSS = unsafeCSS
    ? `${PIERRE_SHADOW_CSS}\n${unsafeCSS}`
    : PIERRE_SHADOW_CSS;

  return (
    <div
      className={cn('min-w-0 [&_pre]:!bg-transparent', className)}
      data-slot='code-block-code'
      data-variant='diff'
      style={{ maxHeight: '40vh', ...style }}
      {...props}
    >
      <PatchDiff
        patch={patch}
        options={{
          theme: { dark: darkTheme, light: theme },
          themeType,
          diffStyle: viewMode,
          disableFileHeader: true,
          overflow: wrap ? 'wrap' : 'scroll',
          unsafeCSS: mergedCSS,
        }}
      />
    </div>
  );
});

// ── Change summary ──────────────────────────────────────────────────────────

export interface CodeBlockChangeSummaryProps {
  additions: number;
  deletions: number;
  className?: string;
}

export const CodeBlockChangeSummary = memo(function CodeBlockChangeSummary({
  additions,
  deletions,
  className,
}: CodeBlockChangeSummaryProps): ReactElement {
  return (
    <span className={cn('flex items-center gap-2 tabular-nums', className)}>
      {additions > 0 && <span className='text-success'>+{additions}</span>}
      {deletions > 0 && <span className='text-danger'>-{deletions}</span>}
    </span>
  );
});

// ── Icons ───────────────────────────────────────────────────────────────────

const CopyIcon = memo(function CopyIcon(
  props: SVGProps<SVGSVGElement>,
): ReactElement {
  return (
    <svg
      fill='none'
      height='16'
      viewBox='0 0 16 16'
      width='16'
      xmlns='http://www.w3.org/2000/svg'
      {...props}
    >
      <path
        clipRule='evenodd'
        d='M12 2.5H8A1.5 1.5 0 0 0 6.5 4v1H8a3 3 0 0 1 3 3v1.5h1A1.5 1.5 0 0 0 13.5 8V4A1.5 1.5 0 0 0 12 2.5M11 11h1a3 3 0 0 0 3-3V4a3 3 0 0 0-3-3H8a3 3 0 0 0-3 3v1H4a3 3 0 0 0-3 3v4a3 3 0 0 0 3 3h4a3 3 0 0 0 3-3zM4 6.5h4A1.5 1.5 0 0 1 9.5 8v4A1.5 1.5 0 0 1 8 13.5H4A1.5 1.5 0 0 1 2.5 12V8A1.5 1.5 0 0 1 4 6.5'
        fill='currentColor'
        fillRule='evenodd'
      />
    </svg>
  );
});

const CheckIcon = memo(function CheckIcon(
  props: SVGProps<SVGSVGElement>,
): ReactElement {
  return (
    <svg
      fill='none'
      height='16'
      viewBox='0 0 16 16'
      width='16'
      xmlns='http://www.w3.org/2000/svg'
      {...props}
    >
      <path
        clipRule='evenodd'
        d='M13.488 3.43a.75.75 0 0 1 .081 1.058l-6 7a.75.75 0 0 1-1.1.042l-3.5-3.5A.75.75 0 0 1 4.03 6.97l2.928 2.927 5.473-6.385a.75.75 0 0 1 1.057-.081'
        fill='currentColor'
        fillRule='evenodd'
      />
    </svg>
  );
});

const CopyMotionIcon = memo(function CopyMotionIcon({
  copied,
}: {
  copied: boolean;
}): ReactElement {
  return (
    <span className='relative flex size-3.5 items-center justify-center'>
      <span
        className={cn(
          'absolute inset-0 flex items-center justify-center transition-all duration-200',
          copied ? 'blur-0 opacity-100' : 'opacity-0 blur-sm',
        )}
      >
        <CheckIcon className='size-3.5' />
      </span>
      <span
        className={cn(
          'absolute inset-0 flex items-center justify-center transition-all duration-200',
          !copied ? 'blur-0 opacity-100' : 'opacity-0 blur-sm',
        )}
      >
        <CopyIcon className='size-3.5' />
      </span>
    </span>
  );
});

// ── Buttons ─────────────────────────────────────────────────────────────────
//
// All header actions share the same treatment: ghost, small, muted by
// default, full opacity when the block is hovered.

const actionButtonClass = cn(
  'size-6 min-w-6 shrink-0 rounded-md text-muted',
  'data-[pressed]:text-foreground',
);

export interface CodeBlockWrapButtonProps {
  'aria-label'?: string;
  className?: string;
}

export const CodeBlockWrapButton = memo(function CodeBlockWrapButton({
  'aria-label': ariaLabel = 'Toggle line wrap',
  className,
  ...props
}: CodeBlockWrapButtonProps): ReactElement {
  const { wrap, setWrap } = useCodeBlock();

  const toggle = useCallback(() => setWrap(!wrap), [wrap, setWrap]);

  return (
    <Button
      isIconOnly
      aria-label={ariaLabel}
      aria-pressed={wrap}
      className={cn(actionButtonClass, className)}
      data-pressed={wrap || undefined}
      data-slot='code-block-wrap-button'
      size='sm'
      variant='ghost'
      onPress={toggle}
      {...props}
    >
      <SquareChartBar className='size-3.5' />
    </Button>
  );
});

export interface CodeBlockViewModeButtonProps {
  'aria-label'?: string;
  className?: string;
}

export const CodeBlockViewModeButton = memo(function CodeBlockViewModeButton({
  'aria-label': ariaLabel = 'Toggle split view',
  className,
  ...props
}: CodeBlockViewModeButtonProps): ReactElement {
  const { viewMode, setViewMode } = useCodeBlock();

  const toggle = useCallback(
    () => setViewMode(viewMode === 'split' ? 'unified' : 'split'),
    [viewMode, setViewMode],
  );

  return (
    <Button
      isIconOnly
      aria-label={ariaLabel}
      aria-pressed={viewMode === 'split'}
      className={cn(actionButtonClass, className)}
      data-pressed={viewMode === 'split' || undefined}
      data-slot='code-block-view-mode-button'
      size='sm'
      variant='ghost'
      onPress={toggle}
      {...props}
    >
      <LayoutSplitColumns className='size-3.5' />
    </Button>
  );
});

export interface CodeBlockOpenInBrowserButtonProps {
  'aria-label'?: string;
  className?: string;
  /** Called when the button is pressed. */
  onClick: () => void;
}

export const CodeBlockOpenInBrowserButton = memo(
  function CodeBlockOpenInBrowserButton({
    'aria-label': ariaLabel = 'Open',
    className,
    onClick,
    ...props
  }: CodeBlockOpenInBrowserButtonProps): ReactElement {
    return (
      <Button
        isIconOnly
        aria-label={ariaLabel}
        className={cn(actionButtonClass, className)}
        data-slot='code-block-open-button'
        size='sm'
        variant='ghost'
        onPress={onClick}
        {...props}
      >
        <Globe className='size-3.5' />
      </Button>
    );
  },
);

export interface CodeBlockOpenButtonProps {
  'aria-label'?: string;
  className?: string;
  /** Called when the button is pressed. */
  onClick: () => void;
}

export const CodeBlockOpenButton = memo(function CodeBlockOpenButton({
  'aria-label': ariaLabel = 'Open',
  className,
  onClick,
  ...props
}: CodeBlockOpenButtonProps): ReactElement {
  return (
    <Button
      isIconOnly
      aria-label={ariaLabel}
      className={cn(actionButtonClass, className)}
      data-slot='code-block-open-button'
      size='sm'
      variant='ghost'
      onPress={onClick}
      {...props}
    >
      <ArrowUpRightFromSquare className='size-3.5' />
    </Button>
  );
});

export interface CodeBlockCopyButtonProps {
  'aria-label'?: string;
  className?: string;
  code: string;
}

export const CodeBlockCopyButton = memo(function CodeBlockCopyButton({
  'aria-label': ariaLabel = 'Copy code',
  className,
  code,
}: CodeBlockCopyButtonProps): ReactElement {
  const [copied, setCopied] = useState(false);
  const timeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timeout.current) clearTimeout(timeout.current);
    },
    [],
  );

  const copy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      if (timeout.current) clearTimeout(timeout.current);
      timeout.current = setTimeout(() => {
        setCopied(false);
        timeout.current = null;
      }, 2000);
    } catch {
      /* Clipboard permission guard */
    }
  }, [code]);

  return (
    <Button
      isIconOnly
      aria-label={ariaLabel}
      className={cn(actionButtonClass, className)}
      data-slot='code-block-copy-button'
      size='sm'
      variant='ghost'
      onPress={copy}
    >
      <CopyMotionIcon copied={copied} />
    </Button>
  );
});

// ── Compound ────────────────────────────────────────────────────────────────

type CodeBlockComponent = typeof CodeBlockRoot & {
  ChangeSummary: typeof CodeBlockChangeSummary;
  Code: typeof CodeBlockCode;
  CopyButton: typeof CodeBlockCopyButton;
  OpenButton: typeof CodeBlockOpenButton;
  OpenInBrowserButton: typeof CodeBlockOpenInBrowserButton;
  Diff: typeof CodeBlockDiff;
  Footer: typeof CodeBlockFooter;
  Header: typeof CodeBlockHeader;
  Root: typeof CodeBlockRoot;
  ViewModeButton: typeof CodeBlockViewModeButton;
  WrapButton: typeof CodeBlockWrapButton;
};

export const CodeBlock: CodeBlockComponent = Object.assign(CodeBlockRoot, {
  ChangeSummary: CodeBlockChangeSummary,
  Code: CodeBlockCode,
  CopyButton: CodeBlockCopyButton,
  OpenInBrowserButton: CodeBlockOpenInBrowserButton,
  Diff: CodeBlockDiff,
  Footer: CodeBlockFooter,
  Header: CodeBlockHeader,
  Root: CodeBlockRoot,
  ViewModeButton: CodeBlockViewModeButton,
  WrapButton: CodeBlockWrapButton,
  OpenButton: CodeBlockOpenButton,
});
