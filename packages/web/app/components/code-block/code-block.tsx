'use client';

import { Button, cn } from '@aero/ui';
import {
  ArrowUpRightFromSquare,
  Globe,
  LayoutSplitColumns,
} from '@gravity-ui/icons';
import { File, PatchDiff } from '@pierre/diffs/react';
import { IconWordWrap } from '@pierre/icons';
import type { ComponentPropsWithRef, ReactElement, ReactNode } from 'react';
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
import { CopyMotionIcon } from './code-block-icons';

// ── Shadow-root CSS ─────────────────────────────────────────────────────────
//
// Do NOT set `color-scheme` here. Pierre's theme CSS uses `light-dark()`
// extensively, and forcing the scheme overrides whatever `themeType` was
// passed — the diff/file render in the wrong mode.

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

interface CodeBlockRootProps extends ComponentPropsWithRef<'div'> {
  children: ReactNode;
  defaultWrap?: boolean;
  defaultViewMode?: ViewMode;
  defaultThemeType?: ThemeType;
}

function CodeBlockRoot({
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

interface CodeBlockHeaderProps extends ComponentPropsWithRef<'div'> {
  children: ReactNode;
}

const CodeBlockHeader = memo(function CodeBlockHeader({
  children,
  className,
  ...props
}: CodeBlockHeaderProps): ReactElement {
  return (
    <div
      className={cn(
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

interface CodeBlockFooterProps extends ComponentPropsWithRef<'div'> {
  children: ReactNode;
}

const CodeBlockFooter = memo(function CodeBlockFooter({
  children,
  className,
  ...props
}: CodeBlockFooterProps): ReactElement {
  return (
    <div
      className={cn(
        'flex h-8 items-center justify-start gap-2 border-t border-separator px-3',
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

interface CodeBlockCodeProps extends ComponentPropsWithRef<'div'> {
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

const CodeBlockCode = memo(function CodeBlockCode({
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
          className={className}
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
        className={className}
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

interface CodeBlockDiffProps extends ComponentPropsWithRef<'div'> {
  patch: string;
  theme?: string;
  darkTheme?: string;
  viewMode?: ViewMode;
  themeType?: ThemeType;
  scrollOverflow?: boolean;
  unsafeCSS?: string;
}

const CodeBlockDiff = memo(function CodeBlockDiff({
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
      className={cn('min-w-0 [&_pre]:!bg-transparent')}
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
        className={className}
      />
    </div>
  );
});

// ── Change summary ──────────────────────────────────────────────────────────

interface CodeBlockChangeSummaryProps {
  additions: number;
  deletions: number;
  className?: string;
}

const CodeBlockChangeSummary = memo(function CodeBlockChangeSummary({
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

// ── Buttons ─────────────────────────────────────────────────────────────────

const actionButtonClass = cn(
  'size-6 min-w-6 shrink-0 rounded-md text-muted',
  'data-[pressed]:text-foreground',
);

interface CodeBlockWrapButtonProps {
  'aria-label'?: string;
  className?: string;
}

const CodeBlockWrapButton = memo(function CodeBlockWrapButton({
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
      <IconWordWrap className='size-3.25 mb-1.25' />
    </Button>
  );
});

interface CodeBlockViewModeButtonProps {
  'aria-label'?: string;
  className?: string;
}

const CodeBlockViewModeButton = memo(function CodeBlockViewModeButton({
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

interface CodeBlockOpenInBrowserButtonProps {
  'aria-label'?: string;
  className?: string;
  onClick: () => void;
}

const CodeBlockOpenInBrowserButton = memo(
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
  onClick: () => void;
}

const CodeBlockOpenButton = memo(function CodeBlockOpenButton({
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

interface CodeBlockCopyButtonProps {
  'aria-label'?: string;
  className?: string;
  code: string;
}

const CodeBlockCopyButton = memo(function CodeBlockCopyButton({
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
