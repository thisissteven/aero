import { Icon } from '@gravity-ui/uikit';
import { SVGProps, useState } from 'react';

import {
  AdaptiveCodeBlockCode,
  AdaptiveCodeBlockCodeProps,
  Alert,
  cn,
  CodeBlock,
  Disclosure,
} from '@aero/ui';

import { DeferredView } from '@/app/components/deferred-view';
import { FileTypeIcon } from '@/app/components/file-type-icon';
import { MiddleTruncatePath } from '@/app/components/tool-call-view/middle-truncate-path';
import { useKeepMountedFeed } from '@/app/hooks/useKeepMounted';
import { useAppearanceStore } from '@/app/providers/settings/appearance/appearance-store';

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
}: {
  blockId: string;
  status: string;
  error?: string;
  icon: (props: SVGProps<SVGSVGElement>) => React.JSX.Element;
  title: string;
  preview?: string;
  previewType?: 'text' | 'path' | 'read-path';
  codeTitle: string;
  code: string;
  language: string;
  copyText: string;
  duration?: number;
  showLineNumbers?: boolean;
  isItalicHeader?: boolean;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const hasContent = Boolean(copyText && code);
  useKeepMountedFeed(blockId, isExpanded);

  return (
    <Disclosure isExpanded={isExpanded} onExpandedChange={setIsExpanded}>
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

              {previewType === 'read-path' && preview && (
                <FileTypeIcon filePath={preview} />
              )}

              {duration ? (
                <span className='text-muted/70'>{duration}s</span>
              ) : null}

              <p className='text-muted/70 min-w-0 flex-1 transition-opacity group-has-[svg[data-expanded=true]]/tool:opacity-0'>
                {preview ? (
                  previewType === 'path' || previewType === 'read-path' ? (
                    <MiddleTruncatePath path={preview} />
                  ) : (
                    preview
                  )
                ) : null}
              </p>
            </span>
          </div>
        </Disclosure.Trigger>
      </Disclosure.Heading>

      <Disclosure.Content className='mt-2 pl-0'>
        <Disclosure.Body>
          <DeferredView>
            <div className='border-default ml-2 border-l pl-5'>
              {error && (
                <div>
                  <div className='text-muted/70 pt-2 text-xs'>{preview}</div>
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
              {hasContent && (
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
                    <CodeBlock.CopyButton
                      code={copyText}
                      className='shrink-0'
                    />
                  </CodeBlock.Header>
                  <CodeBlockContent
                    code={code}
                    language={language}
                    scrollOverflow={code.includes('\n')}
                    showLineNumbers={showLineNumbers}
                  />
                </CodeBlock>
              )}
            </div>
          </DeferredView>
        </Disclosure.Body>
      </Disclosure.Content>
    </Disclosure>
  );
}

// Code theme context helper used across all tools
export function CodeBlockContent(props: AdaptiveCodeBlockCodeProps) {
  const colorThemeLight = useAppearanceStore((state) => state.lightTheme);
  const colorThemeDark = useAppearanceStore((state) => state.darkTheme);

  const lightTheme = getShikiTheme(colorThemeLight, 'light');
  const darkTheme = getShikiTheme(colorThemeDark, 'dark');

  return (
    <AdaptiveCodeBlockCode
      {...props}
      theme={lightTheme}
      darkTheme={darkTheme}
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
  vesper: { light: 'vesper', dark: 'vesper' },
  zenburn: { light: 'zenburn', dark: 'zenburn' },
  nightowl: { light: 'night-owl', dark: 'night-owl' },
  onedarkpro: { light: 'one-dark-pro', dark: 'one-dark-pro' },
  tokyonight: { light: 'tokyo-night', dark: 'tokyo-night' },
};

function getShikiTheme(
  themeName: string | undefined,
  mode: 'light' | 'dark',
): string | undefined {
  if (!themeName) return undefined;
  const entry = SHIKI_THEME_MAP[themeName.toLowerCase()];
  return entry ? entry[mode] : undefined;
}
