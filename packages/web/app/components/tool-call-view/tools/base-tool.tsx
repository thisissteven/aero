import { Icon } from '@gravity-ui/uikit';
import { ReactNode, SVGProps } from 'react';

import {
  AdaptiveCodeBlockCode,
  AdaptiveCodeBlockCodeProps,
  Alert,
  cn,
  CodeBlock,
  Disclosure,
} from '@aero/ui';

import { FileTypeIcon } from '@/app/components/file-type-icon';
import { MiddleTruncatePath } from '@/app/components/tool-call-view/middle-truncate-path';
import { useTheme } from '@/app/providers';
import { useAppearanceStore } from '@/app/providers/settings/appearance/appearance-store';
import { useKeepMountedStoreFeed } from '@/app/stores/keep-mounted';

export function BaseTool({
  blockId,
  status,
  error,
  icon,
  title,
  preview,
  previewType = 'text',
  codeTitle,
  code,
  language,
  copyText,
  duration,
  showLineNumbers = true,
  isItalicHeader = false,
  diff,
  children,
}: {
  blockId: string;
  status: string;
  error?: string;
  icon: (props: SVGProps<SVGSVGElement>) => React.JSX.Element;
  title: string;
  preview?: ReactNode;
  previewType?: 'text' | 'path' | 'read-path';
  codeTitle?: string;
  code?: string;
  language?: string;
  copyText?: string;
  duration?: number;
  showLineNumbers?: boolean;
  isItalicHeader?: boolean;
  diff?: {
    additions: number;
    deletions: number;
  };
  children?: ReactNode;
}) {
  const hasCodeContent = Boolean(copyText && code);
  const hasContent = hasCodeContent || Boolean(children);

  const isExpanded = useKeepMountedStoreFeed((s) => Boolean(s.ids[blockId]));
  const setKeep = useKeepMountedStoreFeed((s) => s.setKeep);

  return (
    <Disclosure
      isExpanded={isExpanded}
      onExpandedChange={(nextExpanded) => setKeep(blockId, nextExpanded)}
    >
      <Disclosure.Heading>
        <Disclosure.Trigger
          className={cn(
            'group/tool -mb-2 flex h-10 w-full! min-w-0 disabled:opacity-100',
            status === 'error' && 'text-danger',
            status === 'completed' && 'text-muted/70',
          )}
          isDisabled={!hasContent && !error}
        >
          <div className='flex min-w-0 flex-1 items-center gap-2'>
            <div className='relative shrink-0'>
              <Disclosure.Indicator className='size-3 -rotate-90 opacity-0 transition group-hover/tool:opacity-100 data-[expanded=true]:rotate-0 data-[expanded=true]:opacity-100' />
              <Icon
                data={icon}
                className='text-muted absolute inset-0 transition group-hover/tool:opacity-0 group-has-[svg[data-expanded=true]]/tool:opacity-0'
                style={{ width: 12, height: 12 }}
              />
            </div>
            <span className='flex items-center justify-start gap-2 truncate'>
              <span
                className={cn(
                  status === 'error' && 'text-danger',
                  status === 'completed' && 'text-foreground',
                )}
              >
                {title}
              </span>

              {previewType === 'read-path' && typeof preview === 'string' && (
                <FileTypeIcon filePath={preview} />
              )}

              {duration ? (
                <span className='text-muted/70'>{duration}s</span>
              ) : null}

              <div className='text-muted/70 flex min-w-0 flex-1 items-center text-left transition-opacity group-has-[svg[data-expanded=true]]/tool:opacity-0'>
                {preview ? (
                  (previewType === 'path' || previewType === 'read-path') &&
                  typeof preview === 'string' ? (
                    <MiddleTruncatePath path={preview} />
                  ) : typeof preview === 'string' ? (
                    <span className='inline-block w-full truncate align-middle'>
                      {preview}
                    </span>
                  ) : (
                    preview
                  )
                ) : null}
              </div>

              {diff && (
                <>
                  {diff.additions > 0 && (
                    <span className='text-success transition-opacity group-has-[svg[data-expanded=true]]/tool:opacity-0'>
                      +{diff.additions}
                    </span>
                  )}
                  {diff.deletions > 0 && (
                    <span className='text-danger transition-opacity group-has-[svg[data-expanded=true]]/tool:opacity-0'>
                      -{diff.deletions}
                    </span>
                  )}
                </>
              )}
            </span>
          </div>
        </Disclosure.Trigger>
      </Disclosure.Heading>

      <Disclosure.Content className='mt-2 pl-0'>
        <div className='border-default ml-2 border-l pl-5'>
          {error && (
            <div>
              {typeof preview === 'string' && (
                <div className='text-muted/70 pt-2 text-xs'>{preview}</div>
              )}
              <Alert
                status='danger'
                className='bg-transparent p-0 pt-4 shadow-none'
              >
                <Alert.Content>
                  <Alert.Description className='text-danger'>
                    {error}
                  </Alert.Description>
                </Alert.Content>
              </Alert>
            </div>
          )}

          {/* Renders custom ReactNode components directly */}
          {children}

          {/* Fallback to CodeBlock when code prop is passed */}
          {hasCodeContent && !children && (
            <CodeBlock className='bg-transparent'>
              <CodeBlock.Header>
                <div
                  className={cn(
                    'text-muted min-w-0 font-mono text-xs break-all',
                    isItalicHeader && 'italic',
                  )}
                >
                  {codeTitle}
                </div>
                {copyText && (
                  <CodeBlock.CopyButton code={copyText} className='shrink-0' />
                )}
              </CodeBlock.Header>
              <CodeBlockContent
                code={code!}
                language={language || 'text'}
                scrollOverflow={code!.includes('\n')}
                showLineNumbers={showLineNumbers}
              />
            </CodeBlock>
          )}
        </div>
      </Disclosure.Content>
    </Disclosure>
  );
}
// Code theme context helper used across all tools
export function CodeBlockContent(props: AdaptiveCodeBlockCodeProps) {
  const { resolvedTheme } = useTheme();

  const colorThemeLight = useAppearanceStore((state) => state.lightTheme);
  const colorThemeDark = useAppearanceStore((state) => state.darkTheme);

  const isDark = resolvedTheme === 'dark';
  const themeName = isDark ? colorThemeDark : colorThemeLight;
  const mode = isDark ? 'dark' : 'light';

  const activeTheme = getShikiTheme(themeName, mode);

  return (
    <AdaptiveCodeBlockCode
      {...props}
      theme={activeTheme}
      darkTheme={activeTheme}
    />
  );
}

const SHIKI_THEME_MAP: Record<string, { light: string; dark: string }> = {
  github: { light: 'github-light', dark: 'github-dark' },
  catppuccin: { light: 'catppuccin-latte', dark: 'catppuccin-mocha' },
  gruvbox: { light: 'gruvbox-light-medium', dark: 'gruvbox-dark-medium' },
  kanagawa: { light: 'kanagawa-lotus', dark: 'kanagawa-wave' },
  rosepine: { light: 'rose-pine-dawn', dark: 'rose-pine' },
  solarized: { light: 'solarized-light', dark: 'solarized-dark' },
  vitesse: { light: 'vitesse-light', dark: 'vitesse-dark' },
  ayu: { light: 'ayu-dark', dark: 'ayu-dark' },
  dracula: { light: 'dracula', dark: 'dracula' },
  monokai: { light: 'monokai', dark: 'monokai' },
  nord: { light: 'nord', dark: 'nord' },
  vesper: { light: 'github-light', dark: 'vesper' },
  zenburn: { light: 'zenburn', dark: 'zenburn' },
  nightowl: { light: 'github-light', dark: 'night-owl' },
  onedarkpro: { light: 'github-light', dark: 'one-dark-pro' },
  tokyonight: { light: 'github-light', dark: 'tokyo-night' },
};

function getShikiTheme(
  themeName: string | undefined,
  mode: 'light' | 'dark',
): string | undefined {
  if (!themeName) return undefined;
  const entry = SHIKI_THEME_MAP[themeName.toLowerCase()];
  return entry ? entry[mode] : undefined;
}
