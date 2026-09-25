import { Alert, cn, Disclosure, TextEffect } from '@aero/ui';
import { Icon } from '@gravity-ui/uikit';

import React, { ReactNode, SVGProps, useEffect, useRef, useState } from 'react';
import { openUrl } from '@/app/components/chat-aside/browser/browser-helpers';
import { openFileWhenReady } from '@/app/components/chat-aside/files/open-file-when-ready';
import { CodeBlock } from '@/app/components/code-block/code-block';
import { CodeBlockContent } from '@/app/components/code-block/code-block-content';
import { FileTypeIcon } from '@/app/components/file-type-icon';
import { MiddleTruncatePath } from '@/app/components/tool-call-view/middle-truncate-path';
import { Timer } from '@/app/components/tool-call-view/timer';
import { useSessionDirectory } from '@/app/hooks/api/sessions';
import { useI18n } from '@/app/hooks/i18n';
import { toWorkspaceRelative } from '@/app/lib/file';
import { useKeepMountedStoreFeed } from '@/app/stores/keep-mounted';
import { useSidePanelStore } from '@/app/stores/side-panel-store';

/**
 * Blocks whose stream-in fade has already played in this session.
 *
 * virtua (esp. on Firefox) unmounts and remounts rows aggressively during
 * scroll. Component state and refs are destroyed on unmount, so a per-instance
 * `useState`/`useRef` gate re-arms on every remount, leaving the row stuck at
 * `opacity: 0` for its whole lifetime. Tracking "already revealed" at module
 * scope survives remounts, so the fade plays exactly once per block.
 */
const revealedBlocks = new Set<string>();

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
  patch,
  duration,
  showLineNumbers = true,
  isItalicHeader = false,
  diff,
  children,
  dir,
  isStreaming = false,
  useDuration = false,
  forceEnabled = false,
  isUrl = false,
  isFile = false,
}: {
  blockId: string;
  status: string;
  error?: string;
  icon: (props: SVGProps<SVGSVGElement>) => React.JSX.Element;
  title: string;
  preview?: ReactNode;
  previewType?: 'text' | 'path';
  codeTitle?: string;
  code?: string;
  language?: string;
  copyText?: string;
  /** Unified-diff patch string. When present, renders via Pierre's PatchDiff. */
  patch?: string;
  duration?: number;
  showLineNumbers?: boolean;
  isItalicHeader?: boolean;
  /** Change stats for the header (e.g. `{ additions: 3, deletions: 1 }`). */
  diff?: {
    additions: number;
    deletions: number;
  };
  dir?: string;
  children?: ReactNode;
  isStreaming?: boolean;
  useDuration?: boolean;
  forceEnabled?: boolean;
  isUrl?: boolean;
  isFile?: boolean;
}) {
  // Either a code string or a patch counts as code content.
  const hasCodeContent = Boolean((copyText && code) || patch);
  const hasContent = hasCodeContent || Boolean(children);

  const { t } = useI18n();

  const isExpanded = useKeepMountedStoreFeed((s) => Boolean(s.ids[blockId]));
  const setKeep = useKeepMountedStoreFeed((s) => s.setKeep);

  const wasStreamingOnMount = useRef(isStreaming).current;

  // If this block was streamed in and has already had its reveal, a remount
  // (virtua scroll churn) should come back visible — not re-run the fade.
  const [isVisible, setIsVisible] = useState(
    () => !wasStreamingOnMount || revealedBlocks.has(blockId),
  );

  useEffect(() => {
    if (!wasStreamingOnMount) return;
    if (revealedBlocks.has(blockId)) return;

    const timer = setTimeout(() => {
      revealedBlocks.add(blockId);
      setIsVisible(true);
    }, 300);

    return () => clearTimeout(timer);
  }, [wasStreamingOnMount, blockId]);

  const shouldAnimate = wasStreamingOnMount && isVisible;
  const isDisabled = ((!hasContent && !error) || isStreaming) && !forceEnabled;

  return (
    <div
      className={cn(
        'transition-opacity duration-200 ease-out',
        isVisible ? 'opacity-100' : 'opacity-0',
      )}
    >
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
            isDisabled={isDisabled}
          >
            <div className='flex min-w-0 flex-1 items-center gap-2'>
              <div className='relative shrink-0'>
                <Disclosure.Indicator className='size-3 -rotate-90 opacity-0 transition group-hover/tool:opacity-100 data-[expanded=true]:rotate-0 data-[expanded=true]:opacity-100' />

                <Icon
                  data={icon}
                  className={cn(
                    'absolute inset-0 transition group-hover/tool:opacity-0 group-has-[svg[data-expanded=true]]/tool:opacity-0',
                    'text-foreground/60',
                    status === 'error' && 'text-danger',
                  )}
                  style={{ width: 12, height: 12 }}
                />
              </div>

              <span className='flex items-center justify-start gap-2 truncate'>
                <span
                  className={cn(
                    'text-foreground',
                    status === 'error' && 'text-danger',
                  )}
                >
                  {title}
                </span>

                {previewType === 'path' && typeof preview === 'string' && (
                  <span>
                    <FileTypeIcon filePath={preview} />
                  </span>
                )}

                {useDuration && (
                  <Timer
                    id={blockId}
                    duration={duration}
                    isStreaming={isStreaming}
                    className='text-muted/70'
                  />
                )}

                <div className='text-muted flex min-w-0 flex-1 items-center text-left transition-opacity group-has-[svg[data-expanded=true]]/tool:opacity-0'>
                  {preview ? (
                    previewType === 'path' && typeof preview === 'string' ? (
                      <MiddleTruncatePath path={preview} />
                    ) : typeof preview === 'string' ? (
                      shouldAnimate ? (
                        <TextEffect
                          duration={100}
                          stagger={5}
                          className='inline-block w-full truncate align-middle'
                        >
                          {preview}
                        </TextEffect>
                      ) : (
                        <span className='inline-block w-full truncate align-middle'>
                          {preview}
                        </span>
                      )
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
          {!isDisabled && (
            <div
              className={cn(
                'border-default ml-2 space-y-2 border-l pl-3',
                // hasCodeContent && 'pl-3',
              )}
            >
              {error && (
                <div>
                  {typeof preview === 'string' && (
                    <div className='text-muted/70 pt-2 text-xs'>{preview}</div>
                  )}

                  <Alert
                    status='danger'
                    className={cn(
                      'bg-transparent p-0 pt-4 shadow-none',
                      !hasCodeContent && 'pb-2',
                    )}
                  >
                    <Alert.Content>
                      <Alert.Description className='text-danger'>
                        {error}
                      </Alert.Description>
                    </Alert.Content>
                  </Alert>
                </div>
              )}

              {children}

              {hasCodeContent && !children && !isStreaming && (
                <CodeBlock className='bg-transparent'>
                  <CodeBlock.Header className='bg-surface'>
                    <div
                      className={cn(
                        'text-muted min-w-0 font-mono text-xs break-all',
                        isItalicHeader && 'italic',
                      )}
                    >
                      {previewType === 'path' && codeTitle ? (
                        <MiddleTruncatePath path={codeTitle} />
                      ) : (
                        <div className='truncate'>{codeTitle}</div>
                      )}
                    </div>

                    <div className='flex items-center'>
                      {!!patch && <CodeBlock.ViewModeButton />}

                      <CodeBlock.WrapButton />

                      {isUrl ? (
                        <CodeBlock.OpenButton
                          aria-label={t.toolCall.openInNewTab}
                          onClick={() =>
                            window.open(
                              codeTitle,
                              '_blank',
                              'noopener,noreferrer',
                            )
                          }
                        />
                      ) : isFile ? (
                        dir?.endsWith('.html') ? (
                          <>
                            <CodeBlock.OpenInBrowserButton
                              aria-label={t.toolCall.openInBrowser}
                              onClick={() => {
                                useSidePanelStore
                                  .getState()
                                  .setActiveNavItem('browser');
                                openUrl(dir);
                              }}
                            />
                            <OpenFileInEditor path={dir} />
                          </>
                        ) : (
                          <OpenFileInEditor path={dir} />
                        )
                      ) : null}

                      {copyText && (
                        <CodeBlock.CopyButton
                          code={copyText}
                          className='shrink-0'
                        />
                      )}
                    </div>
                  </CodeBlock.Header>

                  {isExpanded && (
                    <CodeBlockContent
                      className={cn(
                        patch ? '' : showLineNumbers ? 'py-1.5' : 'p-1.5 pr-0',
                      )}
                      code={code ?? ''}
                      language={language || 'text'}
                      scrollOverflow={code?.includes('\n') ?? false}
                      showLineNumbers={showLineNumbers}
                      // A patch routes through PatchDiff; otherwise the
                      // plain File renderer takes over.
                      variant={patch ? 'diff' : 'file'}
                      patch={patch}
                    />
                  )}

                  {patch && diff && (
                    <CodeBlock.Footer>
                      <span>{t.nav.changes}</span>
                      <CodeBlock.ChangeSummary
                        additions={diff.additions}
                        deletions={diff.deletions}
                      />
                    </CodeBlock.Footer>
                  )}
                </CodeBlock>
              )}
            </div>
          )}
        </Disclosure.Content>
      </Disclosure>
    </div>
  );
}

function OpenFileInEditor({ path }: { path?: string }) {
  const directory = useSessionDirectory();
  const { t } = useI18n();

  if (!directory || !path) return null;

  const relativePath = toWorkspaceRelative(path, directory);

  return (
    <CodeBlock.OpenButton
      aria-label={t.toolCall.openInEditor}
      onClick={() => {
        useSidePanelStore.getState().setActiveNavItem('files');
        openFileWhenReady(relativePath);
      }}
    />
  );
}
